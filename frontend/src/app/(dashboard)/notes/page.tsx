'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogOverlay,
    DialogTitle,
} from '@/components/ui/dialog'
import { getAuthUser } from '@/lib/auth'
import { MarkdownContent } from '@/components/web/markdown-content'
import { MarkdownEditor } from '@/components/web/markdown-editor'
import { AIAppendControls } from '@/components/web/ai-append-controls'
import { AttachmentPreview } from '@/components/web/attachment-preview'
import { SummarizerCardPage } from '@/components/web/SummarizerCardPage'
import { Attachment, uploadFile } from '@/lib/uploads'
import { clearNoteDraft, readNoteDraft } from '@/lib/ai-handoff'
import {
    Plus,
    Search,
    FileText,
    Compass,
    Sparkles,
    ArrowLeft,
    Wand2,
    BookOpen,
    Download,
    Trash2,
    CheckSquare,
    Save,
    Eye,
    Pencil,
    Paperclip,
    Settings,
    FolderOpen,
    ChevronRight,
    X,
} from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5082'

// ── Types ─────────────────────────────────────────────────────────────────────

type NoteGroup = {
    id?: string
    userId?: string
    name?: string
    description?: string
    labels?: string[]
    accentColor?: string
    isPublic?: boolean
    code?: string
    sourceGroupId?: string
    fetchedAt?: string
}

type Note = {
    id?: string
    groupId?: string
    userId?: string
    title?: string
    content?: string
    attachments?: Attachment[]
    updatedAt?: string
}

type TodoChecklistItem = {
    id?: string
    text?: string
    done: boolean
}

type TodoItem = {
    id?: string
    userId?: string
    title?: string
    description?: string
    status?: string
    priority?: string
    dueAt?: string
    labels?: string[]
    checklist?: TodoChecklistItem[]
    linkedGroupId?: string
    linkedNoteId?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function downloadBlob(filename: string, blob: Blob) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
}

const sanitizeName = (v: string) => v.replace(/[^\w.\-]+/g, '_')

const priorityColor: Record<string, string> = {
    low: '#22c55e',
    medium: '#fbbf24',
    high: '#f97316',
    urgent: '#ef4444',
}

const statusColor: Record<string, string> = {
    todo: 'rgba(255,255,255,0.35)',
    in_progress: '#60a5fa',
    blocked: '#ef4444',
    done: '#22c55e',
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function NotesPage() {
    const [userId, setUserId] = useState('')

    // Groups / Notes
    const [groups, setGroups] = useState<NoteGroup[]>([])
    const [selectedGroupId, setSelectedGroupId] = useState('')
    const [notes, setNotes] = useState<Note[]>([])
    const [selectedNoteId, setSelectedNoteId] = useState('')

    // Group form
    const [groupName, setGroupName] = useState('')
    const [groupDescription, setGroupDescription] = useState('')
    const [groupLabelsInput, setGroupLabelsInput] = useState('')
    const [groupAccent, setGroupAccent] = useState('#fbbf24')
    const [groupPublic, setGroupPublic] = useState(false)
    const [groupOptionsOpen, setGroupOptionsOpen] = useState(false)
    const [cloneCodeInput, setCloneCodeInput] = useState('')

    // Note editor
    const [noteTitle, setNoteTitle] = useState('')
    const [noteContent, setNoteContent] = useState('')
    const [noteAttachments, setNoteAttachments] = useState<Attachment[]>([])
    const [noteMode, setNoteMode] = useState<'view' | 'edit'>('view')
    const [uploadingNoteAttachments, setUploadingNoteAttachments] =
        useState(false)

    // Todos
    const [todoOpen, setTodoOpen] = useState(false)
    const [todos, setTodos] = useState<TodoItem[]>([])
    const [todoFilterStatus, setTodoFilterStatus] = useState('all')
    const [todoFilterPriority, setTodoFilterPriority] = useState('all')
    const [editingTodoId, setEditingTodoId] = useState('')
    const [todoTitle, setTodoTitle] = useState('')
    const [todoDescription, setTodoDescription] = useState('')
    const [todoStatus, setTodoStatus] = useState('todo')
    const [todoPriority, setTodoPriority] = useState('medium')
    const [todoDueAt, setTodoDueAt] = useState('')
    const [todoLabels, setTodoLabels] = useState('')
    const [todoChecklist, setTodoChecklist] = useState<TodoChecklistItem[]>([])

    // AI Summarizer
    const [showAiSummarizer, setShowAiSummarizer] = useState(false)
    const [importingDraft, setImportingDraft] = useState(false)
    const [hasDraft, setHasDraft] = useState(false)

    // Search / discover
    const [search, setSearch] = useState('')
    const [discoverGroups, setDiscoverGroups] = useState<NoteGroup[]>([])

    // ── Derived ───────────────────────────────────────────────────────────────

    const selectedGroup = groups.find((x) => x.id === selectedGroupId) ?? null
    const selectedNote = notes.find((x) => x.id === selectedNoteId) ?? null

    const groupContextContent = useMemo(() => {
        if (!selectedGroupId) return noteContent
        const siblings = notes.filter((n) => n.id !== selectedNoteId)
        const siblingText = siblings
            .map((n) =>
                `# ${n.title ?? 'Untitled note'}\n${(n.content ?? '').trim()}`.trim(),
            )
            .filter((x) => x.length > 0)
            .join('\n\n---\n\n')
        return siblingText
            ? `Current note:\n${noteContent}\n\nOther notes in group:\n${siblingText}`
            : noteContent
    }, [selectedGroupId, selectedNoteId, notes, noteContent])

    const filteredTodos = useMemo(
        () =>
            todos.filter(
                (x) =>
                    (todoFilterStatus === 'all' || x.status === todoFilterStatus) &&
                    (todoFilterPriority === 'all' || x.priority === todoFilterPriority),
            ),
        [todos, todoFilterStatus, todoFilterPriority],
    )

    const filteredGroups = useMemo(
        () =>
            search.trim()
                ? groups.filter(
                    (g) =>
                        g.name?.toLowerCase().includes(search.toLowerCase()) ||
                        g.description?.toLowerCase().includes(search.toLowerCase()),
                )
                : groups,
        [groups, search],
    )

    // ── Auth ──────────────────────────────────────────────────────────────────

    const syncAuth = () => setUserId(getAuthUser()?.id ?? '')

    useEffect(() => {
        syncAuth()
        window.addEventListener('auth-changed', syncAuth)
        window.addEventListener('storage', syncAuth)
        return () => {
            window.removeEventListener('auth-changed', syncAuth)
            window.removeEventListener('storage', syncAuth)
        }
    }, [])

    // ── Data loading ──────────────────────────────────────────────────────────

    const loadGroups = async () => {
        if (!userId) return
        const res = await fetch(`${API_BASE}/api/notes/groups/${userId}`)
        if (!res.ok) return
        const rows = (await res.json()) as NoteGroup[]
        setGroups(rows)
        if (!selectedGroupId || !rows.some((x) => x.id === selectedGroupId)) {
            setSelectedGroupId(rows[0]?.id ?? '')
        }
    }

    const loadDiscover = async () => {
        const res = await fetch(`${API_BASE}/api/notes/groups/public`)
        if (!res.ok) return
        setDiscoverGroups((await res.json()) as NoteGroup[])
    }

    const loadNotes = async (groupId: string) => {
        if (!groupId) {
            setNotes([])
            setSelectedNoteId('')
            return
        }
        const res = await fetch(`${API_BASE}/api/notes/group/${groupId}/notes`)
        if (!res.ok) return
        const rows = (await res.json()) as Note[]
        setNotes(rows)
        if (!selectedNoteId || !rows.some((x) => x.id === selectedNoteId)) {
            setSelectedNoteId(rows[0]?.id ?? '')
        }
    }

    const loadTodos = async () => {
        if (!userId) return
        const res = await fetch(`${API_BASE}/api/notes/todos/${userId}`)
        if (!res.ok) return
        setTodos((await res.json()) as TodoItem[])
    }

    useEffect(() => {
        void loadGroups()
        void loadTodos()
        void loadDiscover()
    }, [userId])

    useEffect(() => {
        void loadNotes(selectedGroupId)
    }, [selectedGroupId])

    // ── AI draft import ───────────────────────────────────────────────────────

    useEffect(() => {
        if (readNoteDraft()) setHasDraft(true)
    }, [])

    useEffect(() => {
        const importDraft = async () => {
            if (!userId || importingDraft) return
            const draft = readNoteDraft()
            if (!draft) return
            setImportingDraft(true)
            try {
                const groupRes = await fetch(`${API_BASE}/api/notes/groups`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId,
                        name: draft.groupName || 'AI Summaries',
                        description: draft.groupDescription || '',
                        labels: ['ai', 'summary'],
                        accentColor: '#fbbf24',
                        isPublic: false,
                    }),
                })
                if (!groupRes.ok) return
                const createdGroup = (await groupRes.json()) as NoteGroup
                if (!createdGroup.id) return
                await fetch(`${API_BASE}/api/notes/notes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        groupId: createdGroup.id,
                        userId,
                        title: draft.noteTitle || 'AI Summary',
                        content: draft.noteContent || '',
                        attachments: [],
                    }),
                })
                clearNoteDraft()
                setHasDraft(false)
                await loadGroups()
                setSelectedGroupId(createdGroup.id)
            } finally {
                setImportingDraft(false)
            }
        }
        void importDraft()
    }, [userId])

    // Sync group / note forms when selection changes
    useEffect(() => {
        if (!selectedGroup) {
            setGroupName('')
            setGroupDescription('')
            setGroupLabelsInput('')
            setGroupAccent('#fbbf24')
            return
        }
        setGroupName(selectedGroup.name ?? '')
        setGroupDescription(selectedGroup.description ?? '')
        setGroupLabelsInput((selectedGroup.labels ?? []).join(', '))
        setGroupAccent(selectedGroup.accentColor ?? '#fbbf24')
        setGroupPublic(selectedGroup.isPublic ?? false)
    }, [selectedGroup?.id])

    useEffect(() => {
        if (!selectedNote) {
            setNoteTitle('')
            setNoteContent('')
            setNoteAttachments([])
            setNoteMode('view')
            return
        }
        setNoteTitle(selectedNote.title ?? '')
        setNoteContent(selectedNote.content ?? '')
        setNoteAttachments(selectedNote.attachments ?? [])
        setNoteMode('view')
    }, [selectedNote?.id])

    // ── Group actions ─────────────────────────────────────────────────────────

    const createGroup = async () => {
        if (!userId) return
        await fetch(`${API_BASE}/api/notes/groups`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId,
                name: 'New group',
                description: '',
                labels: [],
                accentColor: '#fbbf24',
                isPublic: false,
            }),
        })
        await loadGroups()
    }

    const saveGroup = async () => {
        if (!selectedGroupId) return
        const labels = groupLabelsInput
            .split(',')
            .map((x) => x.trim())
            .filter(Boolean)
        await fetch(`${API_BASE}/api/notes/groups/${selectedGroupId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: groupName.trim() || 'Untitled group',
                description: groupDescription,
                labels,
                accentColor: groupAccent,
                isPublic: groupPublic,
            }),
        })
        await loadGroups()
    }

    const deleteGroup = async () => {
        if (!selectedGroupId) return
        await fetch(`${API_BASE}/api/notes/groups/${selectedGroupId}`, {
            method: 'DELETE',
        })
        await loadGroups()
    }

    const cloneGroupByCode = async () => {
        if (!userId || !cloneCodeInput.trim()) return
        await fetch(`${API_BASE}/api/notes/groups/clone`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, code: cloneCodeInput.trim() }),
        })
        setCloneCodeInput('')
        await loadGroups()
    }

    const fetchClonedGroup = async () => {
        if (!selectedGroupId || !userId) return
        await fetch(`${API_BASE}/api/notes/groups/${selectedGroupId}/fetch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
        })
        await loadGroups()
        await loadNotes(selectedGroupId)
    }

    // ── Note actions ──────────────────────────────────────────────────────────

    const createNote = async () => {
        if (!selectedGroupId || !userId) return
        await fetch(`${API_BASE}/api/notes/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                groupId: selectedGroupId,
                userId,
                title: 'Untitled note',
                content: '',
                attachments: [],
            }),
        })
        await loadNotes(selectedGroupId)
    }

    const saveNote = async () => {
        if (!selectedNoteId) return
        await fetch(`${API_BASE}/api/notes/notes/${selectedNoteId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: noteTitle,
                content: noteContent,
                attachments: noteAttachments,
            }),
        })
        await loadNotes(selectedGroupId)
        setNoteMode('view')
    }

    const deleteNote = async () => {
        if (!selectedNoteId) return
        await fetch(`${API_BASE}/api/notes/notes/${selectedNoteId}`, {
            method: 'DELETE',
        })
        await loadNotes(selectedGroupId)
    }

    const addNoteAttachments = async (files: FileList | null) => {
        if (!files || files.length === 0) return
        setUploadingNoteAttachments(true)
        try {
            const uploaded = await Promise.all(
                Array.from(files).map((f) => uploadFile(API_BASE, f)),
            )
            setNoteAttachments((prev) => [...prev, ...uploaded])
        } finally {
            setUploadingNoteAttachments(false)
        }
    }

    const absoluteUrl = (url?: string) => {
        if (!url) return ''
        return url.startsWith('http://') || url.startsWith('https://')
            ? url
            : `${API_BASE}${url}`
    }

    const exportSelectedNote = async () => {
        if (!selectedNote) return
        const JSZip = (await import('jszip')).default
        const zip = new JSZip()
        const safeTitle = sanitizeName(selectedNote.title ?? 'note')
        zip.file(`${safeTitle}.md`, selectedNote.content ?? '')
        for (const att of selectedNote.attachments ?? []) {
            const href = absoluteUrl(att.url)
            if (!href) continue
            try {
                const res = await fetch(href)
                if (!res.ok) continue
                zip.file(
                    `attachments/${sanitizeName(att.name ?? 'attachment')}`,
                    await res.blob(),
                )
            } catch { }
        }
        downloadBlob(`${safeTitle}.zip`, await zip.generateAsync({ type: 'blob' }))
    }

    const exportSelectedGroup = async () => {
        if (!selectedGroup) return
        const JSZip = (await import('jszip')).default
        const zip = new JSZip()
        const folder = zip.folder(
            (selectedGroup.name ?? 'group').replace(/[^\w\-]+/g, '_'),
        )
        folder?.file(
            'group.json',
            JSON.stringify(
                {
                    group: selectedGroup,
                    count: notes.length,
                    exportedAt: new Date().toISOString(),
                },
                null,
                2,
            ),
        )
        for (const note of notes) {
            const title = sanitizeName(note.title ?? 'note')
            folder?.file(`${title}.md`, note.content ?? '')
            for (const att of note.attachments ?? []) {
                const href = absoluteUrl(att.url)
                if (!href) continue
                try {
                    const res = await fetch(href)
                    if (!res.ok) continue
                    folder?.file(
                        `${title}/attachments/${sanitizeName(att.name ?? 'attachment')}`,
                        await res.blob(),
                    )
                } catch { }
            }
        }
        downloadBlob(
            `${sanitizeName(selectedGroup.name ?? 'group')}.zip`,
            await zip.generateAsync({ type: 'blob' }),
        )
    }

    // ── Todo actions ──────────────────────────────────────────────────────────

    const resetTodoForm = () => {
        setEditingTodoId('')
        setTodoTitle('')
        setTodoDescription('')
        setTodoStatus('todo')
        setTodoPriority('medium')
        setTodoDueAt('')
        setTodoLabels('')
        setTodoChecklist([])
    }

    const startEditTodo = (todo: TodoItem) => {
        setEditingTodoId(todo.id ?? '')
        setTodoTitle(todo.title ?? '')
        setTodoDescription(todo.description ?? '')
        setTodoStatus(todo.status ?? 'todo')
        setTodoPriority(todo.priority ?? 'medium')
        setTodoDueAt(
            todo.dueAt ? new Date(todo.dueAt).toISOString().slice(0, 16) : '',
        )
        setTodoLabels((todo.labels ?? []).join(', '))
        setTodoChecklist(todo.checklist ?? [])
    }

    const saveTodo = async () => {
        if (!userId || !todoTitle.trim()) return
        const body = {
            userId,
            title: todoTitle.trim(),
            description: todoDescription,
            status: todoStatus,
            priority: todoPriority,
            dueAt: todoDueAt ? new Date(todoDueAt).toISOString() : null,
            labels: todoLabels
                .split(',')
                .map((x) => x.trim())
                .filter(Boolean),
            checklist: todoChecklist,
            linkedGroupId: selectedGroupId || null,
            linkedNoteId: selectedNoteId || null,
        }
        const url = editingTodoId
            ? `${API_BASE}/api/notes/todos/${editingTodoId}`
            : `${API_BASE}/api/notes/todos`
        await fetch(url, {
            method: editingTodoId ? 'PATCH' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })
        await loadTodos()
        resetTodoForm()
    }

    const deleteTodo = async (todoId?: string) => {
        if (!todoId) return
        await fetch(`${API_BASE}/api/notes/todos/${todoId}`, { method: 'DELETE' })
        await loadTodos()
    }

    const toggleChecklistItem = async (
        todo: TodoItem,
        checklistIndex: number,
        done: boolean,
    ) => {
        const checklist = (todo.checklist ?? []).map((item, idx) =>
            idx === checklistIndex ? { ...item, done } : item,
        )
        setTodos((prev) =>
            prev.map((row) => (row.id === todo.id ? { ...row, checklist } : row)),
        )
        await fetch(`${API_BASE}/api/notes/todos/${todo.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: todo.title ?? '',
                description: todo.description ?? '',
                status: todo.status ?? 'todo',
                priority: todo.priority ?? 'medium',
                dueAt: todo.dueAt ?? null,
                labels: todo.labels ?? [],
                checklist,
                linkedGroupId: todo.linkedGroupId ?? null,
                linkedNoteId: todo.linkedNoteId ?? null,
            }),
        })
        await loadTodos()
    }

    // ── AI Summarizer ─────────────────────────────────────────────────────────

    const handleAiSaved = () => {
        setShowAiSummarizer(false)
        setHasDraft(true)
        setImportingDraft(false) // re-triggers the draft import effect
    }

    if (showAiSummarizer) {
        return (
            <div
                style={{
                    background: '#0c0a08',
                    minHeight: '100vh',
                    fontFamily: "'DM Sans', sans-serif",
                }}
            >
                <div
                    style={{
                        padding: '14px 24px',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                    }}
                >
                    <button
                        onClick={() => setShowAiSummarizer(false)}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 14px',
                            borderRadius: 999,
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'rgba(255,255,255,0.6)',
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontFamily: "'DM Sans', sans-serif",
                        }}
                        onMouseEnter={(e) => {
                            ; (e.currentTarget as HTMLButtonElement).style.color = '#fafaf9'
                                ; (e.currentTarget as HTMLButtonElement).style.borderColor =
                                    'rgba(255,255,255,0.2)'
                        }}
                        onMouseLeave={(e) => {
                            ; (e.currentTarget as HTMLButtonElement).style.color =
                                'rgba(255,255,255,0.6)'
                                ; (e.currentTarget as HTMLButtonElement).style.borderColor =
                                    'rgba(255,255,255,0.1)'
                        }}
                    >
                        <ArrowLeft size={13} /> Back to Notes
                    </button>
                    <span
                        style={{
                            fontSize: '0.72rem',
                            color: 'rgba(255,255,255,0.2)',
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase' as const,
                            fontWeight: 600,
                        }}
                    >
                        AI Summarizer
                    </span>
                </div>
                <SummarizerCardPage onSaved={handleAiSaved} />
            </div>
        )
    }

    // ── Main layout ───────────────────────────────────────────────────────────

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
                .fc-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; position: relative; overflow: hidden; }
                .fc-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(251,191,36,0.3), transparent); opacity: 0; transition: opacity 0.25s; }
                .fc-input { background: rgba(255,255,255,0.05) !important; border: 1px solid rgba(255,255,255,0.1) !important; color: #fafaf9 !important; border-radius: 10px !important; transition: border-color 0.2s !important; }
                .fc-input:focus { border-color: rgba(251,191,36,0.4) !important; outline: none !important; box-shadow: 0 0 0 3px rgba(251,191,36,0.08) !important; }
                .fc-input::placeholder { color: rgba(255,255,255,0.25) !important; }
                .fc-btn-primary { background: #fbbf24 !important; color: #0c0a08 !important; font-weight: 600 !important; border: none !important; border-radius: 10px !important; transition: all 0.2s !important; }
                .fc-btn-primary:hover { background: #f59e0b !important; transform: translateY(-1px); box-shadow: 0 4px 20px rgba(251,191,36,0.3) !important; }
                .fc-btn-primary:disabled { background: rgba(251,191,36,0.3) !important; color: rgba(0,0,0,0.4) !important; transform: none !important; }
                .fc-btn-outline { background: transparent !important; color: rgba(255,255,255,0.6) !important; border: 1px solid rgba(255,255,255,0.12) !important; border-radius: 10px !important; transition: all 0.2s !important; }
                .fc-btn-outline:hover { border-color: rgba(255,255,255,0.25) !important; color: #fafaf9 !important; background: rgba(255,255,255,0.05) !important; }
                .fc-btn-ghost { background: transparent !important; color: rgba(255,255,255,0.45) !important; border: none !important; border-radius: 8px !important; transition: all 0.15s !important; }
                .fc-btn-ghost:hover { background: rgba(255,255,255,0.07) !important; color: #fafaf9 !important; }
                .fc-btn-danger { background: rgba(239,68,68,0.1) !important; color: #f87171 !important; border: 1px solid rgba(239,68,68,0.2) !important; border-radius: 8px !important; transition: all 0.2s !important; }
                .fc-btn-danger:hover { background: rgba(239,68,68,0.18) !important; }
                .fc-btn-ai { background: linear-gradient(135deg, rgba(251,191,36,0.15), rgba(245,158,11,0.08)) !important; color: #fbbf24 !important; border: 1px solid rgba(251,191,36,0.3) !important; border-radius: 10px !important; font-weight: 600 !important; transition: all 0.2s !important; }
                .fc-btn-ai:hover { background: linear-gradient(135deg, rgba(251,191,36,0.25), rgba(245,158,11,0.15)) !important; border-color: rgba(251,191,36,0.5) !important; transform: translateY(-1px); box-shadow: 0 4px 20px rgba(251,191,36,0.15) !important; }
                .group-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02); transition: all 0.2s; cursor: pointer; width: 100%; text-align: left; }
                .group-row:hover { border-color: rgba(251,191,36,0.2); background: rgba(251,191,36,0.04); }
                .group-row.active { border-color: rgba(251,191,36,0.3); background: rgba(251,191,36,0.06); }
                .note-row { display: flex; align-items: flex-start; gap: 8px; padding: 9px 10px; border-radius: 9px; border: 1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.015); transition: all 0.2s; cursor: pointer; width: 100%; text-align: left; }
                .note-row:hover { border-color: rgba(251,191,36,0.18); background: rgba(251,191,36,0.03); }
                .note-row.active { border-color: rgba(251,191,36,0.28); background: rgba(251,191,36,0.055); }
                .draft-banner { background: linear-gradient(135deg, rgba(251,191,36,0.08), rgba(245,158,11,0.04)); border: 1px solid rgba(251,191,36,0.2); border-radius: 12px; padding: 12px 16px; }
                .dialog-dark { background: #141210 !important; border: 1px solid rgba(255,255,255,0.1) !important; border-radius: 20px !important; color: #fafaf9 !important; }
                .fc-checkbox { accent-color: #fbbf24; width: 15px; height: 15px; }
                .section-label { font-size: 0.63rem; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 600; color: rgba(255,255,255,0.22); display: flex; align-items: center; gap: 6px; }
                .viewer-area { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 1.25rem; overflow-y: auto; flex: 1; }
                .editor-wrap { background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; overflow: hidden; flex: 1; }
                .todo-pill { display: inline-flex; align-items: center; gap: 4px; font-size: 0.68rem; padding: 2px 8px; border-radius: 999px; border: 1px solid; font-weight: 500; }
                .fc-select { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fafaf9; border-radius: 10px; padding: 8px 12px; font-size: 0.875rem; width: 100%; }
                .fc-select option { background: #141210; color: #fafaf9; }
                .attach-chip { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 7px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); font-size: 0.73rem; color: rgba(255,255,255,0.5); text-decoration: none; transition: all 0.15s; }
                .attach-chip:hover { border-color: rgba(251,191,36,0.3); color: #fbbf24; }
            `}</style>

            <div className="mx-auto max-w-7xl px-6 pb-16">
                {/* ── Hero ──────────────────────────────────────────────── */}
                <div className="hero-glow pt-14 pb-8">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                            <div
                                className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full text-xs font-medium"
                                style={{
                                    background: 'rgba(251,191,36,0.1)',
                                    border: '1px solid rgba(251,191,36,0.2)',
                                    color: '#fbbf24',
                                }}
                            >
                                <BookOpen size={12} /> Smart Notes
                            </div>
                            <h1
                                style={{
                                    fontFamily: "'Fraunces', serif",
                                    fontSize: 'clamp(2rem, 5vw, 3rem)',
                                    fontWeight: 900,
                                    color: '#fafaf9',
                                    lineHeight: 1.1,
                                    letterSpacing: '-0.02em',
                                }}
                            >
                                Notes
                            </h1>
                            <p
                                style={{
                                    color: 'rgba(255,255,255,0.38)',
                                    marginTop: '0.5rem',
                                    fontSize: '0.95rem',
                                }}
                            >
                                Write, organise, and summarise with AI.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap pt-2">
                            <Button
                                className="fc-btn-ai gap-2"
                                onClick={() => setShowAiSummarizer(true)}
                            >
                                <Wand2 size={14} /> Generate Summary
                            </Button>
                            <Button
                                className="fc-btn-primary gap-2"
                                disabled={!userId}
                                onClick={() => void createGroup()}
                            >
                                <Plus size={15} /> New group
                            </Button>
                            <Button
                                className="fc-btn-outline gap-2"
                                onClick={() => setTodoOpen(true)}
                            >
                                <CheckSquare size={15} /> Todos
                            </Button>
                        </div>
                    </div>

                    <div className="relative mt-6 max-w-sm">
                        <Search
                            size={14}
                            className="absolute left-3 top-1/2 -translate-y-1/2"
                            style={{ color: 'rgba(255,255,255,0.3)' }}
                        />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search groups…"
                            className="fc-input pl-9"
                        />
                    </div>

                    {hasDraft && (
                        <div className="draft-banner mt-4 flex items-center gap-3">
                            <Sparkles size={15} style={{ color: '#fbbf24', flexShrink: 0 }} />
                            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                                <span style={{ color: '#fbbf24', fontWeight: 600 }}>
                                    AI summary imported
                                </span>{' '}
                                — saved to a new group.
                            </p>
                        </div>
                    )}
                </div>

                {/* ── Three-pane workspace ───────────────────────────── */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '13rem 13rem 1fr',
                        gap: '1rem',
                        marginTop: '0.5rem',
                    }}
                >
                    {/* Pane 1 — Groups */}
                    <div
                        className="fc-card p-4 flex flex-col gap-3"
                        style={{ height: 'calc(100vh - 270px)', minHeight: 520 }}
                    >
                        <div className="section-label">
                            <FolderOpen size={10} /> Your groups
                        </div>
                        <div
                            style={{
                                flex: 1,
                                overflowY: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 6,
                            }}
                        >
                            {filteredGroups.map((g) => (
                                <button
                                    key={g.id}
                                    onClick={() => setSelectedGroupId(g.id ?? '')}
                                    className={`group-row ${selectedGroupId === g.id ? 'active' : ''}`}
                                >
                                    <span
                                        style={{
                                            width: 8,
                                            height: 8,
                                            borderRadius: '50%',
                                            background: g.accentColor ?? '#fbbf24',
                                            flexShrink: 0,
                                        }}
                                    />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div
                                            style={{
                                                fontSize: '0.83rem',
                                                fontWeight: 600,
                                                color: '#fafaf9',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                            }}
                                        >
                                            {g.name}
                                        </div>
                                        <div
                                            style={{
                                                fontSize: '0.67rem',
                                                color: 'rgba(255,255,255,0.25)',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                            }}
                                        >
                                            {(g.labels ?? []).join(', ') || 'No labels'}
                                        </div>
                                    </div>
                                    {selectedGroupId === g.id && (
                                        <ChevronRight
                                            size={11}
                                            style={{ color: '#fbbf24', flexShrink: 0 }}
                                        />
                                    )}
                                </button>
                            ))}
                            {filteredGroups.length === 0 && (
                                <div
                                    style={{
                                        textAlign: 'center',
                                        paddingTop: '2rem',
                                        color: 'rgba(255,255,255,0.18)',
                                        fontSize: '0.8rem',
                                    }}
                                >
                                    <FolderOpen
                                        size={22}
                                        style={{ margin: '0 auto 8px', opacity: 0.25 }}
                                    />
                                    No groups yet.
                                </div>
                            )}
                        </div>

                        {/* Discover */}
                        <div
                            style={{
                                borderTop: '1px solid rgba(255,255,255,0.06)',
                                paddingTop: 10,
                            }}
                        >
                            <div className="section-label mb-2">
                                <Compass size={9} /> Public
                            </div>
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 5,
                                    maxHeight: 130,
                                    overflowY: 'auto',
                                }}
                            >
                                {discoverGroups
                                    .filter((g) => g.userId !== userId)
                                    .map((g) => (
                                        <button
                                            key={g.id}
                                            onClick={() => {
                                                setSelectedGroupId(g.id ?? '')
                                                setGroupOptionsOpen(true)
                                            }}
                                            className="group-row"
                                            style={{ padding: '7px 10px' }}
                                        >
                                            <span
                                                style={{
                                                    width: 7,
                                                    height: 7,
                                                    borderRadius: '50%',
                                                    background: g.accentColor ?? '#fbbf24',
                                                    flexShrink: 0,
                                                }}
                                            />
                                            <span
                                                style={{
                                                    fontSize: '0.78rem',
                                                    color: 'rgba(255,255,255,0.55)',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    flex: 1,
                                                }}
                                            >
                                                {g.name}
                                            </span>
                                        </button>
                                    ))}
                                {discoverGroups.filter((g) => g.userId !== userId).length ===
                                    0 && (
                                        <p
                                            style={{
                                                fontSize: '0.72rem',
                                                color: 'rgba(255,255,255,0.18)',
                                                textAlign: 'center',
                                                padding: '6px 0',
                                            }}
                                        >
                                            None found
                                        </p>
                                    )}
                            </div>
                        </div>
                    </div>

                    {/* Pane 2 — Notes list */}
                    <div
                        className="fc-card p-4 flex flex-col gap-3"
                        style={{ height: 'calc(100vh - 270px)', minHeight: 520 }}
                    >
                        <div className="flex items-center justify-between">
                            <div className="section-label mb-0">
                                <FileText size={10} /> Notes
                            </div>
                            <div className="flex gap-1">
                                {selectedGroup && (
                                    <>
                                        <Button
                                            size="sm"
                                            className="fc-btn-ghost"
                                            onClick={() => setGroupOptionsOpen(true)}
                                            title="Group settings"
                                            style={{ padding: '4px 6px' }}
                                        >
                                            <Settings size={12} />
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="fc-btn-ghost"
                                            onClick={() => void exportSelectedGroup()}
                                            title="Export group"
                                            style={{ padding: '4px 6px' }}
                                        >
                                            <Download size={12} />
                                        </Button>
                                    </>
                                )}
                                <Button
                                    size="sm"
                                    className="fc-btn-ghost"
                                    disabled={!selectedGroupId}
                                    onClick={() => void createNote()}
                                    title="New note"
                                    style={{ padding: '4px 6px' }}
                                >
                                    <Plus size={13} />
                                </Button>
                            </div>
                        </div>

                        {selectedGroup ? (
                            <div
                                style={{
                                    flex: 1,
                                    overflowY: 'auto',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 5,
                                }}
                            >
                                {notes.map((n) => (
                                    <button
                                        key={n.id}
                                        onClick={() => setSelectedNoteId(n.id ?? '')}
                                        className={`note-row ${selectedNoteId === n.id ? 'active' : ''}`}
                                    >
                                        <FileText
                                            size={11}
                                            style={{
                                                color: 'rgba(255,255,255,0.28)',
                                                flexShrink: 0,
                                                marginTop: 2,
                                            }}
                                        />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div
                                                style={{
                                                    fontSize: '0.82rem',
                                                    fontWeight: 600,
                                                    color: '#fafaf9',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                }}
                                            >
                                                {n.title}
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: '0.67rem',
                                                    color: 'rgba(255,255,255,0.22)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                    marginTop: 2,
                                                }}
                                            >
                                                {n.updatedAt
                                                    ? new Date(n.updatedAt).toLocaleDateString()
                                                    : ''}
                                                {(n.attachments?.length ?? 0) > 0 && (
                                                    <span
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 3,
                                                        }}
                                                    >
                                                        <Paperclip size={9} />
                                                        {n.attachments!.length}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                                {notes.length === 0 && (
                                    <div
                                        style={{
                                            textAlign: 'center',
                                            paddingTop: '2rem',
                                            color: 'rgba(255,255,255,0.18)',
                                            fontSize: '0.8rem',
                                        }}
                                    >
                                        <FileText
                                            size={22}
                                            style={{ margin: '0 auto 8px', opacity: 0.25 }}
                                        />
                                        No notes yet.
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div
                                style={{
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <p
                                    style={{
                                        fontSize: '0.8rem',
                                        color: 'rgba(255,255,255,0.2)',
                                        textAlign: 'center',
                                    }}
                                >
                                    Select a group
                                    <br />
                                    to see notes
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Pane 3 — Note editor */}
                    <div
                        className="fc-card p-5 flex flex-col gap-3"
                        style={{ height: 'calc(100vh - 270px)', minHeight: 520 }}
                    >
                        {selectedNote ? (
                            <>
                                {/* Toolbar */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Input
                                        value={noteTitle}
                                        onChange={(e) => setNoteTitle(e.target.value)}
                                        placeholder="Note title"
                                        className="fc-input flex-1 min-w-0"
                                        style={{ fontWeight: 600, fontSize: '0.95rem' }}
                                    />
                                    <Button
                                        size="sm"
                                        className="fc-btn-ghost"
                                        style={{ padding: '6px 8px' }}
                                        onClick={() =>
                                            setNoteMode((m) => (m === 'edit' ? 'view' : 'edit'))
                                        }
                                        title={noteMode === 'edit' ? 'Preview' : 'Edit'}
                                    >
                                        {noteMode === 'edit' ? (
                                            <Eye size={14} />
                                        ) : (
                                            <Pencil size={14} />
                                        )}
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="fc-btn-primary"
                                        style={{ padding: '6px 10px' }}
                                        onClick={() => void saveNote()}
                                    >
                                        <Save size={13} />
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="fc-btn-ghost"
                                        style={{ padding: '6px 8px' }}
                                        onClick={() => void exportSelectedNote()}
                                        title="Export as .zip"
                                    >
                                        <Download size={13} />
                                    </Button>
                                    <label className="inline-flex" style={{ cursor: 'pointer' }}>
                                        <input
                                            type="file"
                                            className="hidden"
                                            multiple
                                            onChange={(e) => void addNoteAttachments(e.target.files)}
                                        />
                                        <span
                                            className="fc-btn-ghost"
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                padding: '6px 8px',
                                                borderRadius: 8,
                                                transition: 'all 0.15s',
                                                opacity: uploadingNoteAttachments ? 0.5 : 1,
                                            }}
                                            title="Attach files"
                                        >
                                            <Paperclip size={13} />
                                        </span>
                                    </label>
                                    <Button
                                        size="sm"
                                        className="fc-btn-danger"
                                        style={{ padding: '6px 8px' }}
                                        onClick={() => void deleteNote()}
                                    >
                                        <Trash2 size={13} />
                                    </Button>
                                </div>

                                {/* Attachment chips */}
                                {noteAttachments.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                        {noteAttachments.map((att, idx) => (
                                            <a
                                                key={idx}
                                                href={absoluteUrl(att.url)}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="attach-chip"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <Paperclip size={9} />
                                                <span
                                                    style={{
                                                        maxWidth: 120,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    {att.name}
                                                </span>
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault()
                                                        setNoteAttachments((prev) =>
                                                            prev.filter((_, i) => i !== idx),
                                                        )
                                                    }}
                                                    style={{
                                                        marginLeft: 2,
                                                        color: 'rgba(255,255,255,0.3)',
                                                        lineHeight: 1,
                                                        background: 'none',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        padding: 0,
                                                    }}
                                                >
                                                    <X size={9} />
                                                </button>
                                            </a>
                                        ))}
                                    </div>
                                )}

                                {/* Content area */}
                                <div
                                    style={{
                                        flex: 1,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        minHeight: 0,
                                        gap: 8,
                                    }}
                                >
                                    {noteMode === 'edit' ? (
                                        <>
                                            <AIAppendControls
                                                domain="notes"
                                                content={groupContextContent}
                                                onAppend={(text) =>
                                                    setNoteContent((prev) =>
                                                        prev ? `${prev}\n\n${text}` : text,
                                                    )
                                                }
                                            />
                                            <div className="editor-wrap">
                                                <MarkdownEditor
                                                    value={noteContent}
                                                    onChange={setNoteContent}
                                                    placeholder="Write your note in markdown…"
                                                    minRows={22}
                                                    className="h-full"
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        <div className="viewer-area">
                                            <MarkdownContent
                                                className="prose prose-sm max-w-none dark:prose-invert"
                                                content={noteContent || '_No content yet._'}
                                            />
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div
                                style={{
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 12,
                                }}
                            >
                                <FileText size={36} style={{ color: 'rgba(255,255,255,0.09)' }} />
                                <p
                                    style={{
                                        color: 'rgba(255,255,255,0.22)',
                                        fontSize: '0.85rem',
                                        textAlign: 'center',
                                    }}
                                >
                                    {selectedGroup
                                        ? 'Select or create a note'
                                        : 'Select a group first'}
                                </p>
                                {selectedGroup && (
                                    <Button
                                        className="fc-btn-outline gap-2"
                                        onClick={() => void createNote()}
                                    >
                                        <Plus size={13} /> New note
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Group Options Dialog ────────────────────────────────── */}
            <Dialog open={groupOptionsOpen} onOpenChange={setGroupOptionsOpen}>
                <DialogOverlay className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
                <DialogContent className="dialog-dark sm:max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle
                            style={{
                                fontFamily: "'Fraunces', serif",
                                fontSize: '1.2rem',
                                fontWeight: 700,
                                color: '#fafaf9',
                            }}
                        >
                            Group settings
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 mt-3">
                        <Input
                            placeholder="Group name"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            className="fc-input"
                        />
                        <Input
                            placeholder="Description"
                            value={groupDescription}
                            onChange={(e) => setGroupDescription(e.target.value)}
                            className="fc-input"
                        />
                        <Input
                            placeholder="Labels (comma separated)"
                            value={groupLabelsInput}
                            onChange={(e) => setGroupLabelsInput(e.target.value)}
                            className="fc-input"
                        />
                        <div className="flex items-center gap-4">
                            <label
                                style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.45)' }}
                            >
                                Accent colour
                            </label>
                            <input
                                type="color"
                                value={groupAccent}
                                onChange={(e) => setGroupAccent(e.target.value)}
                                style={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: 8,
                                    border: 'none',
                                    background: 'none',
                                    cursor: 'pointer',
                                }}
                            />
                            <label
                                className="flex items-center gap-2 ml-auto cursor-pointer"
                                style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.45)' }}
                            >
                                <input
                                    type="checkbox"
                                    className="fc-checkbox"
                                    checked={groupPublic}
                                    onChange={(e) => setGroupPublic(e.target.checked)}
                                />
                                Public
                            </label>
                        </div>
                        {selectedGroup?.code && (
                            <div
                                style={{
                                    padding: '10px 14px',
                                    borderRadius: 10,
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.07)',
                                    fontSize: '0.82rem',
                                    color: 'rgba(255,255,255,0.45)',
                                }}
                            >
                                Share code:{' '}
                                <span className="font-mono" style={{ color: '#fbbf24' }}>
                                    {selectedGroup.code}
                                </span>
                            </div>
                        )}
                        <div className="flex gap-2">
                            <Input
                                placeholder="Clone a group by code"
                                value={cloneCodeInput}
                                onChange={(e) => setCloneCodeInput(e.target.value)}
                                className="fc-input flex-1"
                            />
                            <Button
                                className="fc-btn-outline"
                                onClick={() => void cloneGroupByCode()}
                            >
                                Clone
                            </Button>
                        </div>
                        {selectedGroup?.sourceGroupId && (
                            <Button
                                className="fc-btn-outline w-full"
                                onClick={() => void fetchClonedGroup()}
                            >
                                Fetch latest source version
                            </Button>
                        )}
                        <div className="flex gap-2 justify-end pt-1">
                            <Button
                                className="fc-btn-primary"
                                onClick={() => void saveGroup()}
                            >
                                Save
                            </Button>
                            <Button
                                className="fc-btn-danger"
                                onClick={() => void deleteGroup()}
                            >
                                Delete group
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── Todos Dialog ─────────────────────────────────────────── */}
            <Dialog open={todoOpen} onOpenChange={setTodoOpen}>
                <DialogOverlay className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
                <DialogContent className="dialog-dark sm:max-w-5xl w-[95vw] max-h-[92vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle
                            style={{
                                fontFamily: "'Fraunces', serif",
                                fontSize: '1.2rem',
                                fontWeight: 700,
                                color: '#fafaf9',
                            }}
                        >
                            Todos
                        </DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-2 md:grid-cols-2 mt-3">
                        <select
                            value={todoFilterStatus}
                            onChange={(e) => setTodoFilterStatus(e.target.value)}
                            className="fc-select"
                        >
                            <option value="all">All statuses</option>
                            <option value="todo">Todo</option>
                            <option value="in_progress">In progress</option>
                            <option value="blocked">Blocked</option>
                            <option value="done">Done</option>
                        </select>
                        <select
                            value={todoFilterPriority}
                            onChange={(e) => setTodoFilterPriority(e.target.value)}
                            className="fc-select"
                        >
                            <option value="all">All priorities</option>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                        </select>
                    </div>

                    <details
                        className="mt-3"
                        style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 12,
                            padding: '12px 16px',
                        }}
                    >
                        <summary
                            style={{
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: '0.88rem',
                                color: 'rgba(255,255,255,0.65)',
                            }}
                        >
                            {editingTodoId ? '✏️ Edit todo' : '+ Create todo'}
                        </summary>
                        <div className="mt-3 space-y-2">
                            <Input
                                placeholder="Todo title"
                                value={todoTitle}
                                onChange={(e) => setTodoTitle(e.target.value)}
                                className="fc-input"
                            />
                            <Input
                                placeholder="Description"
                                value={todoDescription}
                                onChange={(e) => setTodoDescription(e.target.value)}
                                className="fc-input"
                            />
                            <div className="grid gap-2 md:grid-cols-2">
                                <select
                                    value={todoStatus}
                                    onChange={(e) => setTodoStatus(e.target.value)}
                                    className="fc-select"
                                >
                                    <option value="todo">Todo</option>
                                    <option value="in_progress">In progress</option>
                                    <option value="blocked">Blocked</option>
                                    <option value="done">Done</option>
                                </select>
                                <select
                                    value={todoPriority}
                                    onChange={(e) => setTodoPriority(e.target.value)}
                                    className="fc-select"
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                    <option value="urgent">Urgent</option>
                                </select>
                            </div>
                            <Input
                                type="datetime-local"
                                value={todoDueAt}
                                onChange={(e) => setTodoDueAt(e.target.value)}
                                className="fc-input"
                            />
                            <Input
                                placeholder="Labels (comma separated)"
                                value={todoLabels}
                                onChange={(e) => setTodoLabels(e.target.value)}
                                className="fc-input"
                            />

                            <div>
                                <div
                                    style={{
                                        fontSize: '0.78rem',
                                        fontWeight: 600,
                                        color: 'rgba(255,255,255,0.35)',
                                        marginBottom: 8,
                                    }}
                                >
                                    Checklist
                                </div>
                                <div className="space-y-2">
                                    {todoChecklist.map((item, idx) => (
                                        <div
                                            key={item.id ?? idx}
                                            className="flex gap-2 items-center"
                                        >
                                            <input
                                                type="checkbox"
                                                className="fc-checkbox"
                                                checked={item.done}
                                                onChange={(e) =>
                                                    setTodoChecklist((prev) =>
                                                        prev.map((x, i) =>
                                                            i === idx ? { ...x, done: e.target.checked } : x,
                                                        ),
                                                    )
                                                }
                                            />
                                            <Input
                                                value={item.text ?? ''}
                                                className="fc-input flex-1"
                                                onChange={(e) =>
                                                    setTodoChecklist((prev) =>
                                                        prev.map((x, i) =>
                                                            i === idx ? { ...x, text: e.target.value } : x,
                                                        ),
                                                    )
                                                }
                                            />
                                            <Button
                                                size="sm"
                                                className="fc-btn-danger"
                                                onClick={() =>
                                                    setTodoChecklist((prev) =>
                                                        prev.filter((_, i) => i !== idx),
                                                    )
                                                }
                                            >
                                                <Trash2 size={12} />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button
                                        size="sm"
                                        className="fc-btn-outline gap-1"
                                        onClick={() =>
                                            setTodoChecklist((prev) => [
                                                ...prev,
                                                { id: crypto.randomUUID(), text: '', done: false },
                                            ])
                                        }
                                    >
                                        <Plus size={11} /> Add item
                                    </Button>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-1">
                                <Button
                                    className="fc-btn-primary"
                                    onClick={() => void saveTodo()}
                                >
                                    {editingTodoId ? 'Update' : 'Create'}
                                </Button>
                                <Button className="fc-btn-outline" onClick={resetTodoForm}>
                                    Reset
                                </Button>
                            </div>
                        </div>
                    </details>

                    <div
                        className="mt-3 space-y-2"
                        style={{ maxHeight: '50vh', overflowY: 'auto' }}
                    >
                        {filteredTodos.map((t) => (
                            <div
                                key={t.id}
                                style={{
                                    background: 'rgba(255,255,255,0.025)',
                                    border: '1px solid rgba(255,255,255,0.07)',
                                    borderRadius: 12,
                                    padding: '12px 14px',
                                }}
                            >
                                <div className="flex items-start justify-between gap-2 flex-wrap">
                                    <div>
                                        <div
                                            style={{
                                                fontWeight: 600,
                                                fontSize: '0.9rem',
                                                color: '#fafaf9',
                                            }}
                                        >
                                            {t.title}
                                        </div>
                                        {t.description && (
                                            <div
                                                style={{
                                                    fontSize: '0.77rem',
                                                    color: 'rgba(255,255,255,0.38)',
                                                    marginTop: 2,
                                                }}
                                            >
                                                {t.description}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-1.5 flex-shrink-0">
                                        <span
                                            className="todo-pill"
                                            style={{
                                                color: priorityColor[t.priority ?? 'medium'],
                                                borderColor: `${priorityColor[t.priority ?? 'medium']}40`,
                                                background: `${priorityColor[t.priority ?? 'medium']}14`,
                                            }}
                                        >
                                            {t.priority}
                                        </span>
                                        <span
                                            className="todo-pill"
                                            style={{
                                                color: statusColor[t.status ?? 'todo'],
                                                borderColor: `${statusColor[t.status ?? 'todo']}40`,
                                                background: `${statusColor[t.status ?? 'todo']}14`,
                                            }}
                                        >
                                            {t.status?.replace('_', ' ')}
                                        </span>
                                    </div>
                                </div>
                                {t.dueAt && (
                                    <div
                                        style={{
                                            fontSize: '0.72rem',
                                            color: 'rgba(255,255,255,0.28)',
                                            marginTop: 5,
                                        }}
                                    >
                                        Due: {new Date(t.dueAt).toLocaleString()}
                                    </div>
                                )}
                                {(t.checklist?.length ?? 0) > 0 && (
                                    <details style={{ marginTop: 8 }}>
                                        <summary
                                            style={{
                                                cursor: 'pointer',
                                                fontSize: '0.74rem',
                                                color: 'rgba(255,255,255,0.32)',
                                                fontWeight: 600,
                                            }}
                                        >
                                            Checklist (
                                            {t.checklist?.filter((x) => x.done).length ?? 0}/
                                            {t.checklist?.length ?? 0} done)
                                        </summary>
                                        <div className="mt-2 space-y-1.5">
                                            {(t.checklist ?? []).map((item, idx) => (
                                                <div
                                                    key={item.id ?? idx}
                                                    className="flex items-center gap-2"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="fc-checkbox"
                                                        checked={item.done}
                                                        onChange={(e) =>
                                                            void toggleChecklistItem(t, idx, e.target.checked)
                                                        }
                                                    />
                                                    <span
                                                        style={{
                                                            fontSize: '0.78rem',
                                                            color: item.done
                                                                ? 'rgba(255,255,255,0.22)'
                                                                : 'rgba(255,255,255,0.6)',
                                                            textDecoration: item.done
                                                                ? 'line-through'
                                                                : 'none',
                                                        }}
                                                    >
                                                        {item.text || 'Untitled item'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </details>
                                )}
                                <div className="flex gap-2 mt-3">
                                    <Button
                                        size="sm"
                                        className="fc-btn-outline"
                                        onClick={() => startEditTodo(t)}
                                    >
                                        Edit
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="fc-btn-danger"
                                        onClick={() => void deleteTodo(t.id)}
                                    >
                                        Delete
                                    </Button>
                                </div>
                            </div>
                        ))}
                        {filteredTodos.length === 0 && (
                            <p
                                style={{
                                    textAlign: 'center',
                                    color: 'rgba(255,255,255,0.2)',
                                    fontSize: '0.85rem',
                                    padding: '2rem 0',
                                }}
                            >
                                No todos found.
                            </p>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </main>
    )
}
