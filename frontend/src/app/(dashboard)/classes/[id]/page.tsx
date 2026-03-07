/* eslint-disable react-hooks/exhaustive-deps */
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { useParams } from 'next/navigation'
import * as signalR from '@microsoft/signalr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogOverlay,
    DialogTitle,
} from '@/components/ui/dialog'
import { ClassItem, PinnedLink } from '@/app/(dashboard)/classes/page'
import { getAuthUser } from '@/lib/auth'
import { splitThink } from '@/lib/chat-think'
import { MarkdownContent } from '@/components/web/markdown-content'
import { MarkdownEditor } from '@/components/web/markdown-editor'
import { Attachment, uploadFile } from '@/lib/uploads'
import { AttachmentPreview } from '@/components/web/attachment-preview'
import {
    Paperclip,
    CirclePlus,
    MessageCircle,
    Reply,
    Save,
    Edit,
    Send,
    X,
    Users,
    MessageSquare,
    BookOpen,
    Settings,
    FileText,
    ChevronDown,
    ChevronUp,
} from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5082'

async function readJsonSafe<T>(res: Response, fallback: T): Promise<T> {
    const raw = await res.text()
    if (!raw) return fallback
    try {
        return JSON.parse(raw) as T
    } catch {
        return fallback
    }
}

type ClassTab = 'chat' | 'threads' | 'people' | 'work' | 'settings'
type ChatMessage = {
    parentId?: string
    parentMessageId?: string
    date?: string
    userId?: string
    text?: string
    attachments?: Attachment[]
    id?: string
}
type ClassPerson = { id?: string; username?: string; isTeacher: boolean }
type ResolvedUser = { id?: string; username?: string }
type ClassThread = {
    id?: string
    classId?: string
    userId?: string
    title?: string
    text?: string
    attachments?: Attachment[]
    date?: string
}
type ClassThreadComment = {
    id?: string
    threadId?: string
    userId?: string
    parentCommentId?: string
    text?: string
    attachments?: Attachment[]
    date?: string
}
type Assignment = {
    id?: string
    classId?: string
    name?: string
    text?: string
    due?: string
    maxMark?: number
    attachments?: Attachment[]
}
type Submission = {
    id?: string
    assignmentId?: string
    userId?: string
    text?: string
    date?: string
    attachments?: Attachment[]
    mark?: number
}

export default function ClassDetailPage() {
    const params = useParams<{ id: string }>()
    const classId = Array.isArray(params.id)
        ? (params.id[0] ?? '')
        : (params.id ?? '')
    const chatParentId = `class-chat-${classId}`
    const streamFileInputRef = useRef<HTMLInputElement | null>(null)
    const classConnectionRef = useRef<signalR.HubConnection | null>(null)
    const selectedThreadIdRef = useRef('')

    const [tab, setTab] = useState<ClassTab>('threads')
    const [userId, setUserId] = useState('')
    const [clss, setClass] = useState<ClassItem | null>(null)
    const [people, setPeople] = useState<ClassPerson[]>([])
    const [userMap, setUserMap] = useState<Record<string, string>>({})
    const [threads, setThreads] = useState<ClassThread[]>([])
    const [selectedThreadId, setSelectedThreadId] = useState<string>('')
    const [threadComments, setThreadComments] = useState<ClassThreadComment[]>([])
    const [replyText, setReplyText] = useState<Record<string, string>>({})
    const [collapsedComments, setCollapsedComments] = useState<
        Record<string, boolean>
    >({})
    const [openReplyEditors, setOpenReplyEditors] = useState<
        Record<string, boolean>
    >({})
    const [threadDialogOpen, setThreadDialogOpen] = useState(false)
    const [threadTitle, setThreadTitle] = useState('')
    const [threadBody, setThreadBody] = useState('')
    const [threadAttachments, setThreadAttachments] = useState<Attachment[]>([])
    const [assignments, setAssignments] = useState<Assignment[]>([])
    const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false)
    const [newAssignmentName, setNewAssignmentName] = useState('')
    const [newAssignmentText, setNewAssignmentText] = useState('')
    const [newAssignmentDue, setNewAssignmentDue] = useState('')
    const [newAssignmentMaxMark, setNewAssignmentMaxMark] = useState('100')
    const [newAssignmentAttachments, setNewAssignmentAttachments] = useState<
        Attachment[]
    >([])
    const [editingAssignmentId, setEditingAssignmentId] = useState<string>('')
    const [editAssignmentName, setEditAssignmentName] = useState('')
    const [editAssignmentText, setEditAssignmentText] = useState('')
    const [editAssignmentDue, setEditAssignmentDue] = useState('')
    const [editAssignmentMaxMark, setEditAssignmentMaxMark] = useState('100')
    const [submissionsByAssignment, setSubmissionsByAssignment] = useState<
        Record<string, Submission[]>
    >({})
    const [markInput, setMarkInput] = useState<Record<string, string>>({})
    const [
        showSubmissionComposerByAssignment,
        setShowSubmissionComposerByAssignment,
    ] = useState<Record<string, boolean>>({})
    const [submissionText, setSubmissionText] = useState<Record<string, string>>(
        {},
    )
    const [submissionAttachments, setSubmissionAttachments] = useState<
        Record<string, Attachment[]>
    >({})
    const [editingSubmissionId, setEditingSubmissionId] = useState<
        Record<string, string>
    >({})
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
    const [chatInput, setChatInput] = useState('')
    const [replyToChatMessageId, setReplyToChatMessageId] = useState('')
    const [chatPendingAttachments, setChatPendingAttachments] = useState<
        Attachment[]
    >([])
    const [uploading, setUploading] = useState(false)
    const [aiModels, setAiModels] = useState<string[]>([])
    const [selectedAiModel, setSelectedAiModel] = useState('ministral')
    const [settingsName, setSettingsName] = useState('')
    const [settingsDescription, setSettingsDescription] = useState('')
    const [settingsAccent, setSettingsAccent] = useState('#3b82f6')
    const [settingsPublic, setSettingsPublic] = useState(false)
    const [settingsPinnedLinks, setSettingsPinnedLinks] = useState<PinnedLink[]>(
        [],
    )

    const isTeacher = useMemo(
        () => !!clss?.teacherIds?.includes(userId),
        [clss?.teacherIds, userId],
    )
    const displayName = (id?: string) => {
        if (!id) return 'Unknown'
        return userMap[id] ?? id
    }

    const resolveUsernames = async (ids: string[]) => {
        if (ids.length === 0) return
        const res = await fetch(`${API_BASE}/api/classes/users/resolve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids }),
        })
        if (!res.ok) return
        const users = await readJsonSafe<ResolvedUser[]>(res, [])
        setUserMap((prev) => {
            const next = { ...prev }
            for (const u of users) {
                if (u.id) next[u.id] = u.username ?? u.id
            }
            return next
        })
    }

    const loadPeople = async () => {
        const res = await fetch(`${API_BASE}/api/classes/${classId}/people`)
        if (!res.ok) return
        const ppl = await readJsonSafe<ClassPerson[]>(res, [])
        setPeople(ppl)
        setUserMap((prev) => {
            const next = { ...prev }
            for (const p of ppl) {
                if (p.id) next[p.id] = p.username ?? p.id
            }
            return next
        })
    }

    const loadClass = async () => {
        const res = await fetch(`${API_BASE}/api/classes/${classId}`)
        if (!res.ok) return
        const nextClass = await readJsonSafe<ClassItem | null>(res, null)
        if (!nextClass) return
        setClass(nextClass)
        setSettingsName(nextClass.name ?? '')
        setSettingsDescription(nextClass.description ?? '')
        setSettingsAccent(nextClass.accentColor ?? '#3b82f6')
        setSettingsPublic(nextClass.isPublic ?? false)
        setSettingsPinnedLinks(nextClass.pinnedLinks ?? [])
    }

    const loadThreads = async () => {
        if (!classId) return
        const res = await fetch(`${API_BASE}/api/classes/${classId}/threads`)
        if (!res.ok) return
        const rows = await readJsonSafe<ClassThread[]>(res, [])
        setThreads(rows)
        await resolveUsernames(rows.map((x) => x.userId ?? ''))
        if (rows.length === 0) {
            setSelectedThreadId('')
            return
        }
        if (!selectedThreadId || !rows.some((x) => x.id === selectedThreadId))
            setSelectedThreadId(rows[0].id ?? '')
    }

    const loadThreadComments = async (threadId: string) => {
        const res = await fetch(
            `${API_BASE}/api/classes/threads/${threadId}/comments`,
        )
        if (!res.ok) return
        const rows = await readJsonSafe<ClassThreadComment[]>(res, [])
        setThreadComments(rows)
        setCollapsedComments({})
        setOpenReplyEditors({})
        await resolveUsernames(rows.map((x) => x.userId ?? ''))
    }

    const loadAssignments = async () => {
        const assRes = await fetch(`${API_BASE}/api/classes/${classId}/assignments`)
        if (!assRes.ok) return
        const list = await readJsonSafe<Assignment[]>(assRes, [])
        setAssignments(list)
        const subPairs = await Promise.all(
            list
                .filter((x) => x.id)
                .map(async (x) => {
                    const res = await fetch(
                        `${API_BASE}/api/classes/assignments/${x.id}/submissions`,
                    )
                    const items = res.ok ? await readJsonSafe<Submission[]>(res, []) : []
                    return [x.id as string, items] as const
                }),
        )
        const map = Object.fromEntries(subPairs)
        setSubmissionsByAssignment(map)
        await resolveUsernames(
            Object.values(map)
                .flat()
                .map((x) => x.userId ?? ''),
        )
    }

    const loadChat = async () => {
        const res = await fetch(`${API_BASE}/api/chat/${chatParentId}/messages`)
        if (!res.ok) return
        const rows = await readJsonSafe<ChatMessage[]>(res, [])
        setChatMessages(rows)
        await resolveUsernames(rows.map((x) => x.userId ?? ''))
    }

    const loadAiModels = async () => {
        const res = await fetch(`${API_BASE}/api/chat/ai/models`)
        if (!res.ok) return
        const models = await readJsonSafe<string[]>(res, [])
        if (models.length === 0) return
        setAiModels(models)
        if (!models.includes(selectedAiModel)) setSelectedAiModel(models[0])
    }

    useEffect(() => {
        const setUser = () => setUserId(getAuthUser()?.id ?? '')
        setUser()
        window.addEventListener('auth-changed', setUser)
        window.addEventListener('storage', setUser)
        return () => {
            window.removeEventListener('auth-changed', setUser)
            window.removeEventListener('storage', setUser)
        }
    }, [])

    useEffect(() => {
        if (!classId) return
        void loadClass()
        void loadPeople()
        void loadThreads()
        void loadAssignments()
        void loadChat()
        void loadAiModels()
    }, [classId, userId])

    useEffect(() => {
        void loadThreadComments(selectedThreadId)
    }, [selectedThreadId])
    useEffect(() => {
        selectedThreadIdRef.current = selectedThreadId
    }, [selectedThreadId])

    useEffect(() => {
        if (!classId) return
        const connection = new signalR.HubConnectionBuilder()
            .withUrl(`${API_BASE}/apphub`, { withCredentials: false })
            .withAutomaticReconnect()
            .build()
        classConnectionRef.current = connection
        let cancelled = false
        connection.on('ReceiveMessage', (message: ChatMessage) => {
            if (message.parentId !== chatParentId) return
            setChatMessages((prev) => {
                if (message.id && prev.some((x) => x.id === message.id)) return prev
                return [...prev, message]
            })
        })
        connection.on('ReceiveClassThread', (thread: ClassThread) => {
            if (thread.classId !== classId) return
            setThreads((prev) => {
                if (thread.id && prev.some((x) => x.id === thread.id)) return prev
                return [thread, ...prev]
            })
        })
        connection.on(
            'ReceiveClassThreadComment',
            (comment: ClassThreadComment) => {
                if (comment.threadId !== selectedThreadIdRef.current) return
                setThreadComments((prev) => {
                    if (comment.id && prev.some((x) => x.id === comment.id)) return prev
                    return [...prev, comment]
                })
            },
        )
        const start = async () => {
            try {
                await connection.start()
                if (cancelled) return
                await connection.invoke('ConnectToChat', chatParentId)
                await connection.invoke('ConnectToChat', `class-threads-${classId}`)
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err ?? '')
                const isExpectedRace =
                    cancelled ||
                    message.includes('before stop() was called') ||
                    message.includes('before the hub handshake could complete') ||
                    message.includes('stopped during negotiation')
                if (!isExpectedRace) console.debug('Class hub start interrupted:', err)
            }
        }
        void start()
        return () => {
            cancelled = true
            connection.off('ReceiveMessage')
            connection.off('ReceiveClassThread')
            connection.off('ReceiveClassThreadComment')
            void connection.stop().catch(() => { })
            classConnectionRef.current = null
        }
    }, [classId, chatParentId])

    useEffect(() => {
        const connection = classConnectionRef.current
        if (!connection || !selectedThreadId) return
        if (connection.state !== signalR.HubConnectionState.Connected) return
        void connection
            .invoke('ConnectToChat', `thread-comments-${selectedThreadId}`)
            .catch(() => { })
    }, [selectedThreadId])

    useEffect(() => {
        if (threads.length === 0) {
            if (selectedThreadId) setSelectedThreadId('')
            return
        }
        if (!selectedThreadId || !threads.some((x) => x.id === selectedThreadId))
            setSelectedThreadId(threads[0]?.id ?? '')
    }, [threads, selectedThreadId])

    const createThread = async () => {
        if (!classId || !userId || !threadTitle.trim() || !threadBody.trim()) return
        const res = await fetch(`${API_BASE}/api/classes/${classId}/threads`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId,
                title: threadTitle.trim(),
                text: threadBody.trim(),
                attachments: threadAttachments,
            }),
        })
        if (!res.ok) return
        const created = await readJsonSafe<ClassThread | null>(res, null)
        if (!created) return
        setThreads((prev) => {
            if (created.id && prev.some((x) => x.id === created.id)) return prev
            return [created, ...prev]
        })
        if (created.id) setSelectedThreadId(created.id)
        setThreadDialogOpen(false)
        setThreadTitle('')
        setThreadBody('')
        setThreadAttachments([])
        await loadThreads()
    }

    const createComment = async (parentCommentId?: string) => {
        if (!selectedThreadId || !userId) return
        const text = replyText[parentCommentId ?? '__root__'] ?? ''
        await fetch(
            `${API_BASE}/api/classes/threads/${selectedThreadId}/comments`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    text: text.trim(),
                    parentCommentId: parentCommentId ?? null,
                }),
            },
        )
        const key = parentCommentId ?? '__root__'
        setReplyText((prev) => ({ ...prev, [key]: '' }))
        setOpenReplyEditors((prev) => ({ ...prev, [key]: false }))
        await loadThreadComments(selectedThreadId)
    }

    const sendClassMessage = async () => {
        if (!userId || (!chatInput.trim() && chatPendingAttachments.length === 0))
            return
        const text = chatInput.trim()
        await fetch(`${API_BASE}/api/chat/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                parentId: chatParentId,
                parentMessageId: replyToChatMessageId || undefined,
                userId,
                text,
                attachments: chatPendingAttachments,
                date: new Date().toISOString(),
            }),
        })
        if (text.includes('@AI'))
            await fetch(`${API_BASE}/api/chat/${chatParentId}/ai`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: selectedAiModel }),
            })
        setChatInput('')
        setReplyToChatMessageId('')
        setChatPendingAttachments([])
        await loadChat()
    }

    const createAssignment = async () => {
        if (!classId || !newAssignmentName.trim() || !newAssignmentText.trim())
            return
        await fetch(`${API_BASE}/api/classes/${classId}/assignments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: newAssignmentName.trim(),
                text: newAssignmentText.trim(),
                due: newAssignmentDue
                    ? new Date(newAssignmentDue).toISOString()
                    : undefined,
                maxMark: Number(newAssignmentMaxMark),
                attachments: newAssignmentAttachments,
            }),
        })
        setAssignmentDialogOpen(false)
        setNewAssignmentName('')
        setNewAssignmentText('')
        setNewAssignmentDue('')
        setNewAssignmentMaxMark('100')
        setNewAssignmentAttachments([])
        await loadAssignments()
    }

    const startEditAssignment = (a: Assignment) => {
        setEditingAssignmentId(a.id ?? '')
        setEditAssignmentName(a.name ?? '')
        setEditAssignmentText(a.text ?? '')
        setEditAssignmentDue(
            a.due ? new Date(a.due).toISOString().slice(0, 16) : '',
        )
        setEditAssignmentMaxMark(String(a.maxMark ?? 100))
    }

    const saveEditAssignment = async () => {
        if (!editingAssignmentId) return
        await fetch(
            `${API_BASE}/api/classes/${classId}/assignments/${editingAssignmentId}`,
            {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editAssignmentName,
                    text: editAssignmentText,
                    due: editAssignmentDue
                        ? new Date(editAssignmentDue).toISOString()
                        : undefined,
                    maxMark: Number(editAssignmentMaxMark),
                }),
            },
        )
        setEditingAssignmentId('')
        setEditAssignmentName('')
        setEditAssignmentText('')
        setEditAssignmentDue('')
        setEditAssignmentMaxMark('100')
        await loadAssignments()
    }

    const submitAssignment = async (assignmentId: string) => {
        if (!userId) return
        const text = submissionText[assignmentId]
        const files = submissionAttachments[assignmentId] ?? []
        if (!text?.trim() && files.length === 0) return
        const submissionId = editingSubmissionId[assignmentId]
        await fetch(
            `${API_BASE}/api/classes/assignments/${assignmentId}/submissions`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: submissionId || undefined,
                    userId,
                    text,
                    attachments: files,
                }),
            },
        )
        setSubmissionText((prev) => ({ ...prev, [assignmentId]: '' }))
        setSubmissionAttachments((prev) => ({ ...prev, [assignmentId]: [] }))
        setEditingSubmissionId((prev) => ({ ...prev, [assignmentId]: '' }))
        await loadAssignments()
    }

    const startEditSubmission = (assignmentId: string, sub: Submission) => {
        setEditingSubmissionId((prev) => ({ ...prev, [assignmentId]: sub.id ?? '' }))
        setSubmissionText((prev) => ({ ...prev, [assignmentId]: sub.text ?? '' }))
        setSubmissionAttachments((prev) => ({
            ...prev,
            [assignmentId]: sub.attachments ?? [],
        }))
    }
    const cancelEditSubmission = (assignmentId: string) => {
        setEditingSubmissionId((prev) => ({ ...prev, [assignmentId]: '' }))
        setSubmissionText((prev) => ({ ...prev, [assignmentId]: '' }))
        setSubmissionAttachments((prev) => ({ ...prev, [assignmentId]: [] }))
    }

    const uploadAttachments = async (
        files: FileList | null,
        onDone: (attachments: Attachment[]) => void,
    ) => {
        if (!files || files.length === 0) return
        setUploading(true)
        try {
            const uploaded = await Promise.all(
                Array.from(files).map((f) => uploadFile(API_BASE, f)),
            )
            onDone(uploaded)
        } catch (err) {
            console.error(err)
        } finally {
            setUploading(false)
        }
    }

    const setMark = async (submissionId: string, mark: number) => {
        await fetch(`${API_BASE}/api/classes/submissions/${submissionId}/mark`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mark }),
        })
        await loadAssignments()
    }
    const promoteTeacher = async (targetUserId: string) => {
        await fetch(`${API_BASE}/api/classes/${classId}/teachers/${targetUserId}`, {
            method: 'POST',
        })
        await loadPeople()
        await loadClass()
    }
    const removeUser = async (targetUserId: string) => {
        await fetch(`${API_BASE}/api/classes/${classId}/users/${targetUserId}`, {
            method: 'DELETE',
        })
        await loadPeople()
        await loadClass()
    }
    const saveSettings = async () => {
        await fetch(`${API_BASE}/api/classes/${classId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: settingsName,
                description: settingsDescription,
                accentColor: settingsAccent,
                isPublic: settingsPublic,
                pinnedLinks: settingsPinnedLinks,
            }),
        })
        await loadClass()
    }

    const orderedChat = [...chatMessages].sort(
        (a, b) =>
            new Date(a.date ?? '').getTime() - new Date(b.date ?? '').getTime(),
    )
    const chatMessageById = useMemo(() => {
        const map: Record<string, ChatMessage> = {}
        for (const m of chatMessages) {
            if (m.id) map[m.id] = m
        }
        return map
    }, [chatMessages])
    const resolveReplyTarget = (parentMessageId?: string) => {
        if (!parentMessageId) return null
        if (chatMessageById[parentMessageId])
            return chatMessageById[parentMessageId]
        const shortId = parentMessageId.includes(':')
            ? (parentMessageId.split(':').pop() ?? parentMessageId)
            : parentMessageId
        if (chatMessageById[shortId]) return chatMessageById[shortId]
        const prefixed = `message:${parentMessageId}`
        if (chatMessageById[prefixed]) return chatMessageById[prefixed]
        return null
    }
    const commentsByParent = useMemo(() => {
        const groups: Record<string, ClassThreadComment[]> = {}
        for (const c of threadComments) {
            const key = c.parentCommentId ?? '__root__'
            if (!groups[key]) groups[key] = []
            groups[key].push(c)
        }
        for (const k of Object.keys(groups)) {
            groups[k] = groups[k].sort(
                (a, b) =>
                    new Date(a.date ?? '').getTime() - new Date(b.date ?? '').getTime(),
            )
        }
        return groups
    }, [threadComments])

    const selectedThread = threads.find((x) => x.id === selectedThreadId)
    const pinnedLinks = (clss?.pinnedLinks ?? []).filter(
        (x) => (x.title ?? '').trim() && (x.url ?? '').trim(),
    )
    const accentColor = clss?.accentColor ?? '#3b82f6'

    const tabs: { key: ClassTab; label: string; icon: React.ReactNode }[] = [
        { key: 'threads', label: 'Threads', icon: <MessageSquare size={14} /> },
        { key: 'chat', label: 'Stream', icon: <MessageCircle size={14} /> },
        { key: 'people', label: 'People', icon: <Users size={14} /> },
        {
            key: 'work',
            label: isTeacher ? 'Assignments' : 'Work',
            icon: <BookOpen size={14} />,
        },
        ...(isTeacher
            ? [
                {
                    key: 'settings' as ClassTab,
                    label: 'Settings',
                    icon: <Settings size={14} />,
                },
            ]
            : []),
    ]

    return (
        <main
            style={{
                background: '#0c0a08',
                minHeight: '100vh',
                fontFamily: "'DM Sans', sans-serif",
            }}
        >
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Fraunces:wght@700;900&display=swap');

                .cd-panel {
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.07);
                    border-radius: 16px;
                }
                .cd-input {
                    background: rgba(255,255,255,0.05) !important;
                    border: 1px solid rgba(255,255,255,0.1) !important;
                    color: #fafaf9 !important;
                    border-radius: 10px !important;
                    transition: border-color 0.2s !important;
                }
                .cd-input:focus {
                    border-color: var(--accent, #fbbf24) !important;
                    outline: none !important;
                    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent, #fbbf24) 15%, transparent) !important;
                }
                .cd-input::placeholder { color: rgba(255,255,255,0.25) !important; }

                .cd-btn {
                    background: var(--accent, #fbbf24) !important;
                    color: #0c0a08 !important;
                    font-weight: 600 !important;
                    border: none !important;
                    border-radius: 10px !important;
                    transition: all 0.2s !important;
                }
                .cd-btn:hover { filter: brightness(1.1); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,0,0,0.3) !important; }
                .cd-btn:disabled { opacity: 0.4 !important; transform: none !important; }

                .cd-btn-ghost {
                    background: transparent !important;
                    color: rgba(255,255,255,0.55) !important;
                    border: 1px solid rgba(255,255,255,0.1) !important;
                    border-radius: 10px !important;
                    transition: all 0.2s !important;
                }
                .cd-btn-ghost:hover { border-color: rgba(255,255,255,0.2) !important; color: #fafaf9 !important; background: rgba(255,255,255,0.05) !important; }

                .tab-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 7px 14px;
                    border-radius: 10px;
                    font-size: 0.83rem;
                    font-weight: 500;
                    border: 1px solid transparent;
                    cursor: pointer;
                    transition: all 0.2s;
                    color: rgba(255,255,255,0.45);
                    background: transparent;
                }
                .tab-btn:hover { color: rgba(255,255,255,0.8); background: rgba(255,255,255,0.05); }
                .tab-btn.active { color: #0c0a08; font-weight: 600; }

                .thread-row {
                    width: 100%;
                    padding: 12px 14px;
                    border-radius: 12px;
                    border: 1px solid rgba(255,255,255,0.06);
                    background: rgba(255,255,255,0.02);
                    text-align: left;
                    transition: all 0.2s;
                    cursor: pointer;
                }
                .thread-row:hover { border-color: rgba(255,255,255,0.12); background: rgba(255,255,255,0.04); }
                .thread-row.active { background: rgba(255,255,255,0.06); }

                .chat-bubble {
                    border-radius: 12px;
                    border: 1px solid rgba(255,255,255,0.07);
                    background: rgba(255,255,255,0.03);
                    padding: 12px 14px;
                    transition: border-color 0.2s;
                }
                .chat-bubble:hover { border-color: rgba(255,255,255,0.12); }

                .person-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 10px 14px;
                    border-radius: 10px;
                    border: 1px solid rgba(255,255,255,0.06);
                    background: rgba(255,255,255,0.02);
                }

                .assignment-card {
                    border-radius: 14px;
                    border: 1px solid rgba(255,255,255,0.07);
                    background: rgba(255,255,255,0.025);
                    padding: 16px;
                    transition: border-color 0.2s;
                }
                .assignment-card:hover { border-color: rgba(255,255,255,0.12); }

                .submission-card {
                    border-radius: 10px;
                    border: 1px solid rgba(255,255,255,0.06);
                    background: rgba(255,255,255,0.02);
                    padding: 12px;
                }

                .dialog-dark {
                    background: #141210 !important;
                    border: 1px solid rgba(255,255,255,0.1) !important;
                    border-radius: 20px !important;
                    color: #fafaf9 !important;
                }

                .reply-preview {
                    border-left: 3px solid rgba(255,255,255,0.15);
                    padding: 8px 12px;
                    border-radius: 0 8px 8px 0;
                    background: rgba(255,255,255,0.03);
                    font-size: 0.78rem;
                    color: rgba(255,255,255,0.4);
                }

                .pinned-link { color: rgba(255,255,255,0.6); font-size: 0.85rem; transition: color 0.2s; text-decoration: none; }
                .pinned-link:hover { color: #fafaf9; }

                .section-label {
                    font-size: 0.65rem;
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                    font-weight: 600;
                    color: rgba(255,255,255,0.25);
                }

                .ai-select {
                    background: rgba(255,255,255,0.05) !important;
                    border: 1px solid rgba(255,255,255,0.1) !important;
                    color: #fafaf9 !important;
                    border-radius: 8px;
                    padding: 6px 10px;
                    font-size: 0.85rem;
                    width: 100%;
                }
            `}</style>

            <div className="mx-auto max-w-6xl px-6 pb-16">
                {/* Header */}
                <div
                    className="pt-10 pb-6"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                >
                    <div className="flex items-start gap-4">
                        <div
                            className="flex-shrink-0 w-1 self-stretch rounded-full"
                            style={{ background: accentColor, minHeight: '48px' }}
                        />
                        <div className="flex-1 min-w-0">
                            <h1
                                style={{
                                    fontFamily: "'Fraunces', serif",
                                    fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
                                    fontWeight: 900,
                                    color: '#fafaf9',
                                    lineHeight: 1.1,
                                    letterSpacing: '-0.02em',
                                }}
                            >
                                {clss?.name ?? 'Colony'}
                            </h1>
                            <MarkdownContent
                                className="prose prose-sm max-w-none mt-1"
                                style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}
                                content={clss?.description ?? ''}
                            />
                            {pinnedLinks.length > 0 && (
                                <div className="flex flex-wrap gap-3 mt-3">
                                    {pinnedLinks.map((link) => (
                                        <a
                                            key={link.code ?? `${link.title}-${link.url}`}
                                            href={link.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="pinned-link"
                                            style={{ color: accentColor }}
                                        >
                                            ↗ {link.title}
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex flex-wrap gap-1 mt-6">
                        {tabs.map((t) => (
                            <button
                                key={t.key}
                                className={`tab-btn ${tab === t.key ? 'active' : ''}`}
                                style={
                                    tab === t.key
                                        ? { background: accentColor, borderColor: accentColor }
                                        : {}
                                }
                                onClick={() => setTab(t.key)}
                            >
                                {t.icon}
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mt-6">
                    {/* THREADS */}
                    {tab === 'threads' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="section-label">Threads</p>
                                <button
                                    className="cd-btn inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg"
                                    style={{ background: accentColor }}
                                    onClick={() => setThreadDialogOpen(true)}
                                    disabled={!userId}
                                >
                                    <CirclePlus size={14} /> New thread
                                </button>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                {/* Thread list */}
                                <div className="space-y-2 max-h-[32rem] overflow-y-auto pr-1">
                                    {threads.length === 0 && (
                                        <p
                                            style={{
                                                color: 'rgba(255,255,255,0.25)',
                                                fontSize: '0.85rem',
                                                padding: '1rem 0',
                                            }}
                                        >
                                            No threads yet.
                                        </p>
                                    )}
                                    {threads.map((t) => (
                                        <button
                                            key={t.id}
                                            className={`thread-row ${selectedThreadId === t.id ? 'active' : ''}`}
                                            style={
                                                selectedThreadId === t.id
                                                    ? {
                                                        borderColor: accentColor + '60',
                                                        background: accentColor + '12',
                                                    }
                                                    : {}
                                            }
                                            onClick={() => setSelectedThreadId(t.id ?? '')}
                                        >
                                            <div
                                                style={{
                                                    fontWeight: 600,
                                                    color: '#fafaf9',
                                                    fontSize: '0.9rem',
                                                    marginBottom: '2px',
                                                }}
                                            >
                                                {t.title}
                                            </div>
                                            <div
                                                style={{
                                                    color: 'rgba(255,255,255,0.38)',
                                                    fontSize: '0.8rem',
                                                    overflow: 'hidden',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                }}
                                            >
                                                {t.text}
                                            </div>
                                            <div
                                                style={{
                                                    color: 'rgba(255,255,255,0.25)',
                                                    fontSize: '0.72rem',
                                                    marginTop: '6px',
                                                }}
                                            >
                                                {displayName(t.userId)} ·{' '}
                                                {t.date ? new Date(t.date).toLocaleString() : ''}
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                {/* Thread detail */}
                                <div className="cd-panel p-5 space-y-4 max-h-[32rem] overflow-y-auto">
                                    {selectedThread ? (
                                        <>
                                            <div>
                                                <h3
                                                    style={{
                                                        fontFamily: "'Fraunces', serif",
                                                        fontWeight: 700,
                                                        fontSize: '1.15rem',
                                                        color: '#fafaf9',
                                                    }}
                                                >
                                                    {selectedThread.title}
                                                </h3>
                                                <p
                                                    style={{
                                                        color: 'rgba(255,255,255,0.3)',
                                                        fontSize: '0.75rem',
                                                        marginTop: '2px',
                                                    }}
                                                >
                                                    {displayName(selectedThread.userId)} ·{' '}
                                                    {selectedThread.date
                                                        ? new Date(selectedThread.date).toLocaleString()
                                                        : ''}
                                                </p>
                                            </div>
                                            <MarkdownContent
                                                className="prose prose-sm max-w-none dark:prose-invert"
                                                content={selectedThread.text}
                                            />
                                            <AttachmentPreview
                                                attachments={selectedThread.attachments}
                                            />

                                            {!openReplyEditors.__root__ ? (
                                                <button
                                                    className="cd-btn-ghost inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg"
                                                    onClick={() =>
                                                        setOpenReplyEditors((prev) => ({
                                                            ...prev,
                                                            __root__: true,
                                                        }))
                                                    }
                                                    disabled={!userId}
                                                >
                                                    <MessageCircle size={13} /> Comment
                                                </button>
                                            ) : (
                                                <div className="space-y-2">
                                                    <MarkdownEditor
                                                        placeholder="Write a comment..."
                                                        value={replyText['__root__'] ?? ''}
                                                        onChange={(value) =>
                                                            setReplyText((prev) => ({
                                                                ...prev,
                                                                __root__: value,
                                                            }))
                                                        }
                                                        minRows={3}
                                                    />
                                                    <div className="flex gap-2">
                                                        <button
                                                            className="cd-btn inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg"
                                                            style={{ background: accentColor }}
                                                            onClick={() => void createComment()}
                                                            disabled={!userId}
                                                        >
                                                            <Send size={13} /> Post
                                                        </button>
                                                        <button
                                                            className="cd-btn-ghost inline-flex items-center px-3 py-1.5 text-sm rounded-lg"
                                                            onClick={() =>
                                                                setOpenReplyEditors((prev) => ({
                                                                    ...prev,
                                                                    __root__: false,
                                                                }))
                                                            }
                                                        >
                                                            <X size={13} />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                            <CommentTree
                                                parentId={undefined}
                                                commentsByParent={commentsByParent}
                                                displayName={displayName}
                                                collapsedComments={collapsedComments}
                                                setCollapsedComments={setCollapsedComments}
                                                openReplyEditors={openReplyEditors}
                                                setOpenReplyEditors={setOpenReplyEditors}
                                                replyText={replyText}
                                                setReplyText={setReplyText}
                                                onReply={(id) => void createComment(id)}
                                                canReply={!!userId}
                                                accentColor={accentColor}
                                            />
                                        </>
                                    ) : (
                                        <p
                                            style={{
                                                color: 'rgba(255,255,255,0.25)',
                                                fontSize: '0.85rem',
                                            }}
                                        >
                                            Select a thread to view.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CHAT */}
                    {tab === 'chat' && (
                        <div className="space-y-4">
                            <p className="section-label">Stream</p>
                            <div className="cd-panel p-4 space-y-3 h-96 overflow-y-auto">
                                {orderedChat.length === 0 && (
                                    <p
                                        style={{
                                            color: 'rgba(255,255,255,0.25)',
                                            fontSize: '0.85rem',
                                        }}
                                    >
                                        No messages yet.
                                    </p>
                                )}
                                {orderedChat.map((m, idx) => {
                                    const parsed = splitThink(m.text)
                                    const replyTarget = resolveReplyTarget(m.parentMessageId)
                                    return (
                                        <div
                                            key={m.id ?? `${idx}-${m.userId}-${m.date}`}
                                            className="chat-bubble"
                                        >
                                            <p
                                                style={{
                                                    fontSize: '0.72rem',
                                                    color: 'rgba(255,255,255,0.35)',
                                                    marginBottom: '4px',
                                                    fontWeight: 600,
                                                }}
                                            >
                                                {displayName(m.userId)}
                                            </p>
                                            {m.parentMessageId && replyTarget && (
                                                <div className="reply-preview mb-2">
                                                    Replying to {displayName(replyTarget.userId)}:{' '}
                                                    {(
                                                        splitThink(replyTarget.text).content ||
                                                        replyTarget.text ||
                                                        ''
                                                    ).slice(0, 100)}
                                                </div>
                                            )}
                                            <MarkdownContent
                                                className="prose prose-sm max-w-none dark:prose-invert"
                                                content={parsed.content || m.text}
                                            />
                                            <AttachmentPreview attachments={m.attachments} />
                                            <button
                                                className="cd-btn-ghost inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg mt-2"
                                                onClick={() => setReplyToChatMessageId(m.id ?? '')}
                                            >
                                                <Reply size={11} /> Reply
                                            </button>
                                            {m.userId === 'AI' && parsed.thinking && (
                                                <details
                                                    className="mt-2 rounded-lg p-2"
                                                    style={{
                                                        background: 'rgba(255,255,255,0.03)',
                                                        border: '1px solid rgba(255,255,255,0.07)',
                                                    }}
                                                >
                                                    <summary
                                                        style={{
                                                            cursor: 'pointer',
                                                            fontSize: '0.75rem',
                                                            color: 'rgba(255,255,255,0.3)',
                                                        }}
                                                    >
                                                        Show thinking
                                                    </summary>
                                                    <div
                                                        style={{
                                                            marginTop: '6px',
                                                            fontSize: '0.75rem',
                                                            whiteSpace: 'pre-wrap',
                                                            color: 'rgba(255,255,255,0.3)',
                                                        }}
                                                    >
                                                        {parsed.thinking}
                                                    </div>
                                                </details>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>

                            {chatInput.includes('@AI') && (
                                <select
                                    value={selectedAiModel}
                                    onChange={(e) => setSelectedAiModel(e.target.value)}
                                    className="ai-select"
                                >
                                    {aiModels.length === 0 && (
                                        <option value="ministral">ministral</option>
                                    )}
                                    {aiModels.map((m) => (
                                        <option key={m} value={m}>
                                            {m}
                                        </option>
                                    ))}
                                </select>
                            )}

                            {replyToChatMessageId &&
                                chatMessageById[replyToChatMessageId] && (
                                    <div className="reply-preview flex items-center justify-between">
                                        <span>
                                            Replying to{' '}
                                            {displayName(
                                                chatMessageById[replyToChatMessageId].userId,
                                            )}
                                            :{' '}
                                            {(
                                                splitThink(chatMessageById[replyToChatMessageId].text)
                                                    .content ||
                                                chatMessageById[replyToChatMessageId].text ||
                                                ''
                                            ).slice(0, 100)}
                                        </span>
                                        <button
                                            onClick={() => setReplyToChatMessageId('')}
                                            style={{
                                                color: 'rgba(255,255,255,0.4)',
                                                marginLeft: '8px',
                                            }}
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                )}

                            <AttachmentPreview
                                attachments={chatPendingAttachments}
                                onRemove={(index) =>
                                    setChatPendingAttachments((prev) =>
                                        prev.filter((_, i) => i !== index),
                                    )
                                }
                            />

                            <input
                                ref={streamFileInputRef}
                                type="file"
                                multiple
                                className="hidden"
                                onChange={(e) =>
                                    void uploadAttachments(e.target.files, (rows) =>
                                        setChatPendingAttachments((prev) => [...prev, ...rows]),
                                    )
                                }
                            />

                            <div className="flex gap-2">
                                <Input
                                    placeholder="Send a message… (use @AI to invoke AI)"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    className="cd-input flex-1"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault()
                                            void sendClassMessage()
                                        }
                                    }}
                                />
                                <button
                                    className="cd-btn-ghost inline-flex items-center px-3 rounded-lg"
                                    onClick={() => streamFileInputRef.current?.click()}
                                    title="Attach"
                                >
                                    <Paperclip size={15} />
                                </button>
                                <button
                                    className="cd-btn inline-flex items-center gap-2 px-4 rounded-lg"
                                    style={{ background: accentColor }}
                                    onClick={() => void sendClassMessage()}
                                    disabled={!userId || uploading}
                                >
                                    <Send size={14} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* PEOPLE */}
                    {tab === 'people' && (
                        <div className="space-y-3">
                            <p className="section-label">People ({people.length})</p>
                            <div className="space-y-2">
                                {people.map((p) => (
                                    <div key={p.id} className="person-row group">
                                        <div className="flex items-center gap-3">
                                            <div
                                                style={{
                                                    width: 32,
                                                    height: 32,
                                                    borderRadius: '50%',
                                                    background: accentColor + '30',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 700,
                                                    color: accentColor,
                                                }}
                                            >
                                                {(p.username ?? '?')[0]?.toUpperCase()}
                                            </div>
                                            <div>
                                                <p
                                                    style={{
                                                        fontWeight: 600,
                                                        color: '#fafaf9',
                                                        fontSize: '0.875rem',
                                                    }}
                                                >
                                                    {p.username}
                                                </p>
                                                {p.isTeacher && (
                                                    <p style={{ fontSize: '0.7rem', color: accentColor }}>
                                                        Teacher
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        {isTeacher && p.id && p.id !== userId && (
                                            <div className="hidden gap-2 group-hover:flex">
                                                <button
                                                    className="cd-btn-ghost text-xs px-3 py-1 rounded-lg"
                                                    onClick={() => void promoteTeacher(p.id!)}
                                                >
                                                    Promote
                                                </button>
                                                <button
                                                    className="text-xs px-3 py-1 rounded-lg"
                                                    style={{
                                                        background: 'rgba(239,68,68,0.15)',
                                                        color: '#f87171',
                                                        border: '1px solid rgba(239,68,68,0.2)',
                                                    }}
                                                    onClick={() => void removeUser(p.id!)}
                                                >
                                                    Kick
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* WORK */}
                    {tab === 'work' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="section-label">
                                    {isTeacher ? 'Assignments' : 'Work'}
                                </p>
                                {isTeacher && (
                                    <button
                                        className="cd-btn inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg"
                                        style={{ background: accentColor }}
                                        onClick={() => setAssignmentDialogOpen(true)}
                                        disabled={!userId}
                                    >
                                        <CirclePlus size={14} /> New assignment
                                    </button>
                                )}
                            </div>

                            {isTeacher && editingAssignmentId && (
                                <div className="cd-panel p-4 space-y-3">
                                    <p
                                        style={{
                                            fontWeight: 600,
                                            color: '#fafaf9',
                                            fontSize: '0.9rem',
                                        }}
                                    >
                                        Edit assignment
                                    </p>
                                    <Input
                                        placeholder="Title"
                                        value={editAssignmentName}
                                        onChange={(e) => setEditAssignmentName(e.target.value)}
                                        className="cd-input"
                                    />
                                    <MarkdownEditor
                                        placeholder="Details"
                                        value={editAssignmentText}
                                        onChange={setEditAssignmentText}
                                        minRows={4}
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                        <Input
                                            type="datetime-local"
                                            value={editAssignmentDue}
                                            onChange={(e) => setEditAssignmentDue(e.target.value)}
                                            className="cd-input"
                                        />
                                        <Input
                                            type="number"
                                            value={editAssignmentMaxMark}
                                            onChange={(e) => setEditAssignmentMaxMark(e.target.value)}
                                            className="cd-input"
                                            placeholder="Max mark"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            className="cd-btn inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg"
                                            style={{ background: accentColor }}
                                            onClick={saveEditAssignment}
                                        >
                                            <Save size={13} /> Save
                                        </button>
                                        <button
                                            className="cd-btn-ghost inline-flex items-center px-3 py-1.5 text-sm rounded-lg"
                                            onClick={() => {
                                                setEditingAssignmentId('')
                                                setEditAssignmentName('')
                                                setEditAssignmentText('')
                                                setEditAssignmentDue('')
                                                setEditAssignmentMaxMark('100')
                                            }}
                                        >
                                            <X size={13} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {assignments.length === 0 && (
                                <p
                                    style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.85rem' }}
                                >
                                    No assignments yet.
                                </p>
                            )}
                            <div className="space-y-4">
                                {assignments.map((assignment) => {
                                    const submissions =
                                        submissionsByAssignment[assignment.id ?? ''] ?? []
                                    const isSubmissionFromTeacher = (submissionUserId?: string) =>
                                        !!submissionUserId &&
                                        !!clss?.teacherIds?.includes(submissionUserId)
                                    const visibleSubs = isTeacher
                                        ? submissions
                                        : submissions.filter(
                                            (s) =>
                                                s.userId === userId ||
                                                (!!s.userId &&
                                                    !!clss?.teacherIds?.includes(s.userId)),
                                        )
                                    const canEditSubmission = (sub: Submission) => {
                                        if (!sub.id || !sub.userId || sub.userId !== userId)
                                            return false
                                        if (isSubmissionFromTeacher(sub.userId)) return true
                                        if (!assignment.due) return true
                                        return (
                                            new Date().getTime() <= new Date(assignment.due).getTime()
                                        )
                                    }
                                    return (
                                        <div
                                            key={assignment.id}
                                            className="assignment-card space-y-3"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <h3
                                                        style={{
                                                            fontFamily: "'Fraunces', serif",
                                                            fontWeight: 700,
                                                            fontSize: '1.05rem',
                                                            color: '#fafaf9',
                                                        }}
                                                    >
                                                        {assignment.name}
                                                    </h3>
                                                    <p
                                                        style={{
                                                            fontSize: '0.72rem',
                                                            color: 'rgba(255,255,255,0.3)',
                                                            marginTop: '2px',
                                                        }}
                                                    >
                                                        Due:{' '}
                                                        {assignment.due
                                                            ? new Date(assignment.due).toLocaleString()
                                                            : 'No due date'}{' '}
                                                        · Max: {assignment.maxMark ?? 0}
                                                    </p>
                                                </div>
                                                {isTeacher && (
                                                    <button
                                                        className="cd-btn-ghost inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg"
                                                        onClick={() => startEditAssignment(assignment)}
                                                    >
                                                        <Edit size={12} /> Edit
                                                    </button>
                                                )}
                                            </div>
                                            <MarkdownContent
                                                className="prose prose-sm max-w-none dark:prose-invert"
                                                content={assignment.text}
                                            />
                                            <AttachmentPreview attachments={assignment.attachments} />

                                            <details
                                                className="cd-panel p-3 space-y-2"
                                                open={
                                                    !!showSubmissionComposerByAssignment[
                                                    assignment.id ?? ''
                                                    ]
                                                }
                                                onToggle={(e) => {
                                                    const isOpen = (e.currentTarget as HTMLDetailsElement)
                                                        .open
                                                    setShowSubmissionComposerByAssignment((prev) => ({
                                                        ...prev,
                                                        [assignment.id ?? '']: isOpen,
                                                    }))
                                                }}
                                            >
                                                <summary
                                                    style={{
                                                        cursor: 'pointer',
                                                        fontSize: '0.82rem',
                                                        fontWeight: 600,
                                                        color: 'rgba(255,255,255,0.55)',
                                                    }}
                                                >
                                                    {isTeacher
                                                        ? 'New teacher submission'
                                                        : 'New submission'}
                                                </summary>
                                                <div className="mt-2 space-y-2">
                                                    <MarkdownEditor
                                                        placeholder={
                                                            isTeacher
                                                                ? 'Post a teacher submission...'
                                                                : 'Your submission...'
                                                        }
                                                        value={submissionText[assignment.id ?? ''] ?? ''}
                                                        onChange={(value) =>
                                                            setSubmissionText((prev) => ({
                                                                ...prev,
                                                                [assignment.id ?? '']: value,
                                                            }))
                                                        }
                                                        minRows={4}
                                                    />
                                                    <div className="flex flex-wrap gap-2">
                                                        <Input
                                                            type="file"
                                                            multiple
                                                            onChange={(e) =>
                                                                void uploadAttachments(e.target.files, (rows) =>
                                                                    setSubmissionAttachments((prev) => ({
                                                                        ...prev,
                                                                        [assignment.id ?? '']: [
                                                                            ...(prev[assignment.id ?? ''] ?? []),
                                                                            ...rows,
                                                                        ],
                                                                    })),
                                                                )
                                                            }
                                                            className="cd-input min-w-48 flex-1"
                                                        />
                                                        <button
                                                            className="cd-btn inline-flex items-center gap-2 px-4 py-2 rounded-lg"
                                                            style={{ background: accentColor }}
                                                            onClick={() =>
                                                                void submitAssignment(assignment.id ?? '')
                                                            }
                                                            disabled={!userId || uploading}
                                                        >
                                                            {editingSubmissionId[assignment.id ?? ''] ? (
                                                                <>
                                                                    <Save size={13} /> Update
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Send size={13} /> Submit
                                                                </>
                                                            )}
                                                        </button>
                                                        {!!editingSubmissionId[assignment.id ?? ''] && (
                                                            <button
                                                                className="cd-btn-ghost inline-flex items-center px-3 rounded-lg"
                                                                onClick={() =>
                                                                    cancelEditSubmission(assignment.id ?? '')
                                                                }
                                                            >
                                                                <X size={13} />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <AttachmentPreview
                                                        attachments={
                                                            submissionAttachments[assignment.id ?? '']
                                                        }
                                                        onRemove={(index) =>
                                                            setSubmissionAttachments((prev) => ({
                                                                ...prev,
                                                                [assignment.id ?? '']: (
                                                                    prev[assignment.id ?? ''] ?? []
                                                                ).filter((_, i) => i !== index),
                                                            }))
                                                        }
                                                    />
                                                </div>
                                            </details>

                                            {visibleSubs.length > 0 && (
                                                <div className="space-y-2">
                                                    <p className="section-label">
                                                        Submissions ({visibleSubs.length})
                                                    </p>
                                                    {visibleSubs.map((sub) => (
                                                        <div
                                                            key={sub.id}
                                                            className="submission-card space-y-2"
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <p
                                                                    style={{
                                                                        fontSize: '0.75rem',
                                                                        fontWeight: 600,
                                                                        color: 'rgba(255,255,255,0.45)',
                                                                    }}
                                                                >
                                                                    {displayName(sub.userId)}{' '}
                                                                    {isSubmissionFromTeacher(sub.userId) &&
                                                                        '· Teacher'}{' '}
                                                                    · Mark:{' '}
                                                                    <span
                                                                        style={{
                                                                            color:
                                                                                sub.mark !== undefined
                                                                                    ? accentColor
                                                                                    : 'rgba(255,255,255,0.3)',
                                                                        }}
                                                                    >
                                                                        {sub.mark ?? 'unmarked'}
                                                                    </span>
                                                                </p>
                                                                {canEditSubmission(sub) && (
                                                                    <button
                                                                        className="cd-btn-ghost inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg"
                                                                        onClick={() =>
                                                                            startEditSubmission(
                                                                                assignment.id ?? '',
                                                                                sub,
                                                                            )
                                                                        }
                                                                    >
                                                                        <Edit size={11} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <MarkdownContent
                                                                className="prose prose-sm max-w-none dark:prose-invert"
                                                                content={sub.text}
                                                            />
                                                            <AttachmentPreview
                                                                attachments={sub.attachments}
                                                            />
                                                            {isTeacher && (
                                                                <div className="flex gap-2">
                                                                    <Input
                                                                        type="number"
                                                                        min={0}
                                                                        placeholder="Mark"
                                                                        value={
                                                                            markInput[sub.id ?? ''] ??
                                                                            sub.mark?.toString() ??
                                                                            ''
                                                                        }
                                                                        onChange={(e) =>
                                                                            setMarkInput((prev) => ({
                                                                                ...prev,
                                                                                [sub.id ?? '']: e.target.value,
                                                                            }))
                                                                        }
                                                                        className="cd-input w-24"
                                                                    />
                                                                    <button
                                                                        className="cd-btn-ghost inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg"
                                                                        onClick={() => {
                                                                            const raw = markInput[sub.id ?? ''] ?? ''
                                                                            const parsed = Number(raw)
                                                                            if (!sub.id || Number.isNaN(parsed))
                                                                                return
                                                                            void setMark(sub.id, parsed)
                                                                        }}
                                                                    >
                                                                        <Save size={12} />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* SETTINGS */}
                    {tab === 'settings' && isTeacher && (
                        <div className="space-y-4 max-w-xl">
                            <p className="section-label">Colony settings</p>
                            <div className="space-y-3">
                                <Input
                                    placeholder="Colony name"
                                    value={settingsName}
                                    onChange={(e) => setSettingsName(e.target.value)}
                                    className="cd-input"
                                />
                                <MarkdownEditor
                                    placeholder="Colony description"
                                    value={settingsDescription}
                                    onChange={setSettingsDescription}
                                    minRows={5}
                                />
                                <div className="flex items-center gap-4 flex-wrap">
                                    <label
                                        style={{
                                            fontSize: '0.85rem',
                                            color: 'rgba(255,255,255,0.55)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                        }}
                                    >
                                        Accent color
                                        <input
                                            type="color"
                                            value={settingsAccent}
                                            onChange={(e) => setSettingsAccent(e.target.value)}
                                            style={{
                                                width: 32,
                                                height: 32,
                                                borderRadius: 8,
                                                border: 'none',
                                                cursor: 'pointer',
                                                background: 'none',
                                            }}
                                        />
                                    </label>
                                    <label
                                        style={{
                                            fontSize: '0.85rem',
                                            color: 'rgba(255,255,255,0.55)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={settingsPublic}
                                            onChange={(e) => setSettingsPublic(e.target.checked)}
                                            style={{ accentColor: accentColor }}
                                        />
                                        Public colony
                                    </label>
                                </div>
                            </div>

                            <div className="cd-panel p-4 space-y-3">
                                <p
                                    style={{
                                        fontWeight: 600,
                                        color: '#fafaf9',
                                        fontSize: '0.875rem',
                                    }}
                                >
                                    Pinned links
                                </p>
                                {settingsPinnedLinks.map((link, idx) => (
                                    <div key={link.code ?? `${idx}`} className="flex gap-2">
                                        <Input
                                            placeholder="Title"
                                            value={link.title ?? ''}
                                            onChange={(e) =>
                                                setSettingsPinnedLinks((prev) =>
                                                    prev.map((x, i) =>
                                                        i === idx ? { ...x, title: e.target.value } : x,
                                                    ),
                                                )
                                            }
                                            className="cd-input"
                                        />
                                        <Input
                                            placeholder="URL"
                                            value={link.url ?? ''}
                                            onChange={(e) =>
                                                setSettingsPinnedLinks((prev) =>
                                                    prev.map((x, i) =>
                                                        i === idx ? { ...x, url: e.target.value } : x,
                                                    ),
                                                )
                                            }
                                            className="cd-input"
                                        />
                                        <button
                                            className="inline-flex items-center px-3 rounded-lg text-sm"
                                            style={{
                                                background: 'rgba(239,68,68,0.15)',
                                                color: '#f87171',
                                                border: '1px solid rgba(239,68,68,0.2)',
                                            }}
                                            onClick={() =>
                                                setSettingsPinnedLinks((prev) =>
                                                    prev.filter((_, i) => i !== idx),
                                                )
                                            }
                                        >
                                            <X size={13} />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    className="cd-btn-ghost inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg"
                                    onClick={() =>
                                        setSettingsPinnedLinks((prev) => [
                                            ...prev,
                                            { title: '', url: '' },
                                        ])
                                    }
                                >
                                    <CirclePlus size={13} /> Add link
                                </button>
                            </div>

                            <button
                                className="cd-btn inline-flex items-center gap-2 px-4 py-2 rounded-lg"
                                style={{ background: accentColor }}
                                onClick={saveSettings}
                            >
                                <Save size={14} /> Save settings
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Thread Dialog */}
            <Dialog open={threadDialogOpen} onOpenChange={setThreadDialogOpen}>
                <DialogOverlay className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
                <DialogContent className="dialog-dark sm:max-w-lg w-[95vw]">
                    <DialogHeader>
                        <DialogTitle
                            style={{
                                fontFamily: "'Fraunces', serif",
                                fontSize: '1.3rem',
                                fontWeight: 700,
                                color: '#fafaf9',
                            }}
                        >
                            Create thread
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 mt-1">
                        <Input
                            placeholder="Thread title"
                            value={threadTitle}
                            onChange={(e) => setThreadTitle(e.target.value)}
                            className="cd-input"
                        />
                        <MarkdownEditor
                            placeholder="What's on your mind?"
                            value={threadBody}
                            onChange={setThreadBody}
                            minRows={7}
                        />
                        <Input
                            type="file"
                            multiple
                            onChange={(e) =>
                                void uploadAttachments(e.target.files, (rows) =>
                                    setThreadAttachments((prev) => [...prev, ...rows]),
                                )
                            }
                            className="cd-input"
                        />
                        <AttachmentPreview
                            attachments={threadAttachments}
                            onRemove={(index) =>
                                setThreadAttachments((prev) =>
                                    prev.filter((_, i) => i !== index),
                                )
                            }
                        />
                        <button
                            className="cd-btn inline-flex items-center gap-2 px-4 py-2 rounded-lg w-full justify-center"
                            style={{ background: accentColor }}
                            onClick={() => void createThread()}
                        >
                            <Send size={14} /> Post thread
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Assignment Dialog */}
            <Dialog
                open={assignmentDialogOpen}
                onOpenChange={setAssignmentDialogOpen}
            >
                <DialogOverlay className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
                <DialogContent className="dialog-dark sm:max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle
                            style={{
                                fontFamily: "'Fraunces', serif",
                                fontSize: '1.3rem',
                                fontWeight: 700,
                                color: '#fafaf9',
                            }}
                        >
                            Create assignment
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 mt-1">
                        <Input
                            placeholder="Assignment title"
                            value={newAssignmentName}
                            onChange={(e) => setNewAssignmentName(e.target.value)}
                            className="cd-input"
                        />
                        <MarkdownEditor
                            placeholder="Description and instructions"
                            value={newAssignmentText}
                            onChange={setNewAssignmentText}
                            minRows={6}
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <Input
                                type="datetime-local"
                                value={newAssignmentDue}
                                onChange={(e) => setNewAssignmentDue(e.target.value)}
                                className="cd-input"
                            />
                            <Input
                                type="number"
                                placeholder="Max mark"
                                value={newAssignmentMaxMark}
                                onChange={(e) => setNewAssignmentMaxMark(e.target.value)}
                                className="cd-input"
                            />
                        </div>
                        <Input
                            type="file"
                            multiple
                            onChange={(e) =>
                                void uploadAttachments(e.target.files, (rows) =>
                                    setNewAssignmentAttachments((prev) => [...prev, ...rows]),
                                )
                            }
                            className="cd-input"
                        />
                        <AttachmentPreview
                            attachments={newAssignmentAttachments}
                            onRemove={(index) =>
                                setNewAssignmentAttachments((prev) =>
                                    prev.filter((_, i) => i !== index),
                                )
                            }
                        />
                        <button
                            className="cd-btn inline-flex items-center gap-2 px-4 py-2 rounded-lg w-full justify-center"
                            style={{ background: accentColor }}
                            onClick={() => void createAssignment()}
                            disabled={uploading}
                        >
                            {uploading ? (
                                'Uploading...'
                            ) : (
                                <>
                                    <FileText size={14} /> Create assignment
                                </>
                            )}
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </main>
    )
}

function CommentTree(props: {
    parentId?: string
    commentsByParent: Record<string, ClassThreadComment[]>
    displayName: (id?: string) => string
    collapsedComments: Record<string, boolean>
    setCollapsedComments: Dispatch<SetStateAction<Record<string, boolean>>>
    openReplyEditors: Record<string, boolean>
    setOpenReplyEditors: Dispatch<SetStateAction<Record<string, boolean>>>
    replyText: Record<string, string>
    setReplyText: Dispatch<SetStateAction<Record<string, string>>>
    onReply: (id: string) => void
    canReply: boolean
    accentColor: string
}) {
    const {
        parentId,
        commentsByParent,
        displayName,
        collapsedComments,
        setCollapsedComments,
        openReplyEditors,
        setOpenReplyEditors,
        replyText,
        setReplyText,
        onReply,
        canReply,
        accentColor,
    } = props
    const key = parentId ?? '__root__'
    const rows = commentsByParent[key] ?? []
    if (rows.length === 0) return null

    return (
        <div
            className={parentId ? 'ml-4 mt-2 space-y-2' : 'space-y-2'}
            style={
                parentId
                    ? {
                        borderLeft: '1px solid rgba(255,255,255,0.07)',
                        paddingLeft: '12px',
                    }
                    : {}
            }
        >
            {rows.map((c) => (
                <div
                    key={c.id}
                    style={{
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.06)',
                        background: 'rgba(255,255,255,0.02)',
                        padding: '10px 12px',
                    }}
                >
                    <div className="flex items-center justify-between gap-2 mb-2">
                        <p
                            style={{
                                fontSize: '0.72rem',
                                color: 'rgba(255,255,255,0.35)',
                                fontWeight: 600,
                            }}
                        >
                            {displayName(c.userId)} ·{' '}
                            {c.date ? new Date(c.date).toLocaleString() : ''}
                        </p>
                        {c.id && (
                            <button
                                style={{
                                    fontSize: '0.7rem',
                                    color: 'rgba(255,255,255,0.3)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                }}
                                onClick={() =>
                                    setCollapsedComments((prev) => ({
                                        ...prev,
                                        [c.id ?? '']: !prev[c.id ?? ''],
                                    }))
                                }
                            >
                                {collapsedComments[c.id ?? ''] ? (
                                    <ChevronDown size={11} />
                                ) : (
                                    <ChevronUp size={11} />
                                )}
                                {collapsedComments[c.id ?? ''] ? 'Expand' : 'Collapse'}
                            </button>
                        )}
                    </div>
                    {!collapsedComments[c.id ?? ''] ? (
                        <>
                            <MarkdownContent
                                className="prose prose-sm max-w-none dark:prose-invert"
                                content={c.text}
                            />
                            <AttachmentPreview attachments={c.attachments} />
                            {!openReplyEditors[c.id ?? ''] ? (
                                <button
                                    style={{
                                        marginTop: '8px',
                                        fontSize: '0.75rem',
                                        color: 'rgba(255,255,255,0.4)',
                                        background: 'none',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '6px',
                                        padding: '3px 10px',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                    }}
                                    onClick={() =>
                                        setOpenReplyEditors((prev) => ({
                                            ...prev,
                                            [c.id ?? '']: true,
                                        }))
                                    }
                                    disabled={!canReply}
                                >
                                    <Reply size={11} /> Reply
                                </button>
                            ) : (
                                <div className="space-y-2 mt-2">
                                    <MarkdownEditor
                                        placeholder="Reply..."
                                        value={replyText[c.id ?? ''] ?? ''}
                                        onChange={(value) =>
                                            setReplyText((prev) => ({ ...prev, [c.id ?? '']: value }))
                                        }
                                        minRows={2}
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            style={{
                                                background: accentColor,
                                                color: '#0c0a08',
                                                fontWeight: 600,
                                                border: 'none',
                                                borderRadius: '8px',
                                                padding: '4px 12px',
                                                fontSize: '0.8rem',
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                            }}
                                            onClick={() => c.id && onReply(c.id)}
                                            disabled={!canReply}
                                        >
                                            <Send size={11} /> Send
                                        </button>
                                        <button
                                            style={{
                                                background: 'transparent',
                                                color: 'rgba(255,255,255,0.4)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '8px',
                                                padding: '4px 10px',
                                                cursor: 'pointer',
                                            }}
                                            onClick={() =>
                                                setOpenReplyEditors((prev) => ({
                                                    ...prev,
                                                    [c.id ?? '']: false,
                                                }))
                                            }
                                        >
                                            <X size={11} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <p
                            style={{
                                fontSize: '0.78rem',
                                color: 'rgba(255,255,255,0.25)',
                                fontStyle: 'italic',
                            }}
                        >
                            Comment collapsed
                        </p>
                    )}
                    {!collapsedComments[c.id ?? ''] && (
                        <CommentTree
                            parentId={c.id}
                            commentsByParent={commentsByParent}
                            displayName={displayName}
                            collapsedComments={collapsedComments}
                            setCollapsedComments={setCollapsedComments}
                            openReplyEditors={openReplyEditors}
                            setOpenReplyEditors={setOpenReplyEditors}
                            replyText={replyText}
                            setReplyText={setReplyText}
                            onReply={onReply}
                            canReply={canReply}
                            accentColor={accentColor}
                        />
                    )}
                </div>
            ))}
        </div>
    )
}
