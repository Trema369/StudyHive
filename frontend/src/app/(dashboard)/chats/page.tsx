'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogOverlay,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    Paperclip,
    Send,
    Reply,
    X,
    Plus,
    Save,
    UserRoundPlus,
    MessageSquare,
    Users,
    Settings,
    Bot,
    ShieldCheck,
    MessagesSquare,
    ChevronRight,
    Loader2,
} from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { splitThink } from '@/lib/chat-think';
import { MarkdownContent } from '@/components/web/markdown-content';
import { Attachment, uploadFile } from '@/lib/uploads';
import { AttachmentPreview } from '@/components/web/attachment-preview';
import { cn } from '@/lib/utils';

const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5082';

type ChatItem = {
    id?: string;
    name?: string;
    userIds?: string[];
    adminIds?: string[];
    accentColor?: string;
    adminOnly?: boolean;
    isDirect?: boolean;
};

type ChatMessage = {
    parentId?: string;
    parentMessageId?: string;
    date?: string;
    userId?: string;
    text?: string;
    attachments?: Attachment[];
    id?: string;
};

type ChatPerson = {
    id?: string;
    username?: string;
    isAdmin: boolean;
};

type ResolvedUser = {
    id?: string;
    username?: string;
};

type ChatTab = 'chat' | 'people' | 'settings';

function MessageBubble({
    m,
    idx,
    isOwn,
    displayName,
    replyTarget,
    onReply,
}: {
    m: ChatMessage;
    idx: number;
    isOwn: boolean;
    displayName: (id?: string) => string;
    replyTarget: ChatMessage | null;
    onReply: () => void;
}) {
    const parsed = splitThink(m.text);
    const [thinkOpen, setThinkOpen] = useState(false);
    const isAI = m.userId === 'AI';

    const fmt = (d?: string) =>
        d
            ? new Date(d).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
            })
            : '';

    return (
        <div className={cn('flex gap-2 group', isOwn && 'flex-row-reverse')}>
            {/* Avatar */}
            <div
                className={cn(
                    'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold mt-1',
                    isAI
                        ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white'
                        : isOwn
                            ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white rounded-tr-sm'
                            : 'bg-muted border border-border text-muted-foreground'
                )}
            >
                {isAI ? (
                    <Bot className="h-3.5 w-3.5" />
                ) : (
                    displayName(m.userId).charAt(0).toUpperCase()
                )}
            </div>

            <div
                className={cn(
                    'flex flex-col gap-1 max-w-[75%]',
                    isOwn && 'items-end'
                )}
            >
                {/* Name + time */}
                <div
                    className={cn(
                        'flex items-center gap-1.5 text-[10px] text-muted-foreground',
                        isOwn && 'flex-row-reverse'
                    )}
                >
                    <span className="font-medium">{displayName(m.userId)}</span>
                    <span>{fmt(m.date)}</span>
                </div>

                {/* Reply preview */}
                {replyTarget && (
                    <div className="rounded-lg border-l-2 border-muted-foreground/30 bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground max-w-full">
                        <span className="font-medium">
                            {displayName(replyTarget.userId)}:{' '}
                        </span>
                        {(
                            splitThink(replyTarget.text).content ||
                            replyTarget.text ||
                            ''
                        ).slice(0, 100)}
                    </div>
                )}

                {/* Bubble */}
                <div
                    className={cn(
                        'rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                        isOwn
                            ? 'bg-muted text-foreground rounded-tr-sm '
                            : 'bg-muted text-foreground rounded-tl-sm'
                    )}
                >
                    <MarkdownContent
                        className="prose prose-sm max-w-none dark:prose-invert"
                        content={parsed.content || m.text}
                    />
                    <AttachmentPreview attachments={m.attachments} />
                </div>

                {isAI && parsed.thinking && (
                    <button
                        onClick={() => setThinkOpen(!thinkOpen)}
                        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1"
                    >
                        <Bot className="h-3 w-3" />
                        {thinkOpen ? 'Hide' : 'Show'} thinking
                    </button>
                )}
                {thinkOpen && parsed.thinking && (
                    <div className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground whitespace-pre-wrap max-w-full">
                        {parsed.thinking}
                    </div>
                )}

                {/* Reply button (on hover) */}
                <button
                    onClick={onReply}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity px-1"
                >
                    <Reply className="h-3 w-3" /> Reply
                </button>
            </div>
        </div>
    );
}

function ChatListItem({
    chat,
    isSelected,
    displayName,
    currentUserId,
    onClick,
}: {
    chat: ChatItem;
    isSelected: boolean;
    displayName: (id?: string) => string;
    currentUserId: string;
    onClick: () => void;
}) {
    const isDirect =
        (chat.isDirect ?? false) || (chat.userIds?.length ?? 0) <= 2;
    const accent = chat.accentColor ?? '#3b82f6';
    const otherUser = isDirect
        ? chat.userIds?.find((id) => id !== currentUserId)
        : undefined;
    const label = isDirect
        ? otherUser
            ? displayName(otherUser)
            : (chat.name ?? 'Direct')
        : (chat.name ?? 'Group chat');

    return (
        <button
            onClick={onClick}
            className={cn(
                'group relative w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all',
                isSelected ? 'bg-muted' : 'hover:bg-muted/50'
            )}
        >
            <span
                className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full transition-all"
                style={{ background: isSelected ? accent : 'transparent' }}
            />

            <div
                className={cn(
                    'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold'
                )}
                style={{ background: accent + '33', color: accent }}
            >
                {isDirect ? (
                    label.charAt(0).toUpperCase()
                ) : (
                    <Users className="h-4 w-4" />
                )}
            </div>

            <div className="flex-1 overflow-hidden">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate">
                        {label}
                    </span>
                    {chat.adminOnly && (
                        <ShieldCheck className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                    {isDirect ? 'Direct' : 'Group'} ·{' '}
                    {(chat.userIds ?? []).length} members
                </p>
            </div>

            <ChevronRight
                className={cn(
                    'h-4 w-4 text-muted-foreground/40 transition-opacity flex-shrink-0',
                    isSelected
                        ? 'opacity-100'
                        : 'opacity-0 group-hover:opacity-100'
                )}
            />
        </button>
    );
}

export default function ChatsPage() {
    const [userId, setUserId] = useState('');
    const [chats, setChats] = useState<ChatItem[]>([]);
    const [selectedChatId, setSelectedChatId] = useState('');
    const [tab, setTab] = useState<ChatTab>('chat');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [people, setPeople] = useState<ChatPerson[]>([]);
    const [userMap, setUserMap] = useState<Record<string, string>>({});
    const [input, setInput] = useState('');
    const [replyToMessageId, setReplyToMessageId] = useState('');
    const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>(
        []
    );
    const [uploading, setUploading] = useState(false);
    const [sending, setSending] = useState(false);
    const connectionRef = useRef<signalR.HubConnection | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    const [aiModels, setAiModels] = useState<string[]>([]);
    const [selectedAiModel, setSelectedAiModel] = useState('ministral');

    const [dialogOpen, setDialogOpen] = useState(false);
    const [createMode, setCreateMode] = useState<'direct' | 'group'>('direct');
    const [createName, setCreateName] = useState('');
    const [createUsers, setCreateUsers] = useState('');
    const [createAccent, setCreateAccent] = useState('#3b82f6');
    const [createAdminOnly, setCreateAdminOnly] = useState(false);

    const [settingsName, setSettingsName] = useState('');
    const [settingsAccent, setSettingsAccent] = useState('#3b82f6');
    const [settingsAdminOnly, setSettingsAdminOnly] = useState(false);
    const [addUsername, setAddUsername] = useState('');

    const selectedChat = chats.find((x) => x.id === selectedChatId) ?? null;
    const chatFileInputRef = useRef<HTMLInputElement | null>(null);
    const isSelectedDirect =
        (selectedChat?.isDirect ?? false) ||
        (selectedChat?.userIds?.length ?? 0) <= 2;
    const isAdmin = !!selectedChat?.adminIds?.includes(userId);
    const isAiChat = !!selectedChat?.userIds?.includes('AI');

    const displayName = (id?: string) => {
        if (!id) return 'Unknown';
        return userMap[id] ?? id;
    };

    const loadAiModels = async () => {
        const res = await fetch(`${API_BASE}/api/chat/ai/models`);
        const models = (await res.json()) as string[];
        if (models.length === 0) return;
        setAiModels(models);
        if (!models.includes(selectedAiModel)) setSelectedAiModel(models[0]);
    };

    const resolveUsers = async (ids: string[]) => {
        const clean = ids.filter(Boolean);
        if (clean.length === 0) return;
        const res = await fetch(`${API_BASE}/api/classes/users/resolve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: clean }),
        });
        if (!res.ok) return;
        const users = (await res.json()) as ResolvedUser[];
        setUserMap((prev) => {
            const next = { ...prev };
            for (const u of users) {
                if (u.id) next[u.id] = u.username ?? u.id;
            }
            return next;
        });
    };

    const loadChats = async () => {
        if (!userId) return;
        const res = await fetch(`${API_BASE}/api/chat/user/${userId}`);
        if (!res.ok) return;
        const list = (await res.json()) as ChatItem[];
        setChats(list);
        const ids = list.flatMap((x) => x.userIds ?? []);
        await resolveUsers(ids);
        if (!selectedChatId || !list.some((x) => x.id === selectedChatId)) {
            setSelectedChatId(list[0]?.id ?? '');
        }
    };

    const loadMessages = async (chatId: string) => {
        if (!chatId) return;
        const res = await fetch(`${API_BASE}/api/chat/${chatId}/messages`);
        if (!res.ok) return;
        const rows = (await res.json()) as ChatMessage[];
        setMessages(rows);
        await resolveUsers(rows.map((x) => x.userId ?? ''));
    };

    const loadPeople = async (chatId: string) => {
        if (!chatId) return;
        const res = await fetch(`${API_BASE}/api/chat/${chatId}/people`);
        if (!res.ok) return;
        const rows = (await res.json()) as ChatPerson[];
        setPeople(rows);
        setUserMap((prev) => {
            const next = { ...prev };
            for (const p of rows) {
                if (p.id) next[p.id] = p.username ?? p.id;
            }
            return next;
        });
    };

    useEffect(() => {
        const setUser = () => setUserId(getAuthUser()?.id ?? '');
        setUser();
        window.addEventListener('auth-changed', setUser);
        window.addEventListener('storage', setUser);
        return () => {
            window.removeEventListener('auth-changed', setUser);
            window.removeEventListener('storage', setUser);
        };
    }, []);

    useEffect(() => {
        if (!userId) return;
        void loadChats();
        void loadAiModels();
    }, [userId]);

    useEffect(() => {
        if (!selectedChatId) return;
        void loadMessages(selectedChatId);
        void loadPeople(selectedChatId);
    }, [selectedChatId]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (!selectedChatId) return;
        const connection = new signalR.HubConnectionBuilder()
            .withUrl(`${API_BASE}/apphub`, { withCredentials: false })
            .withAutomaticReconnect()
            .build();
        connectionRef.current = connection;
        let cancelled = false;

        connection.on('ReceiveMessage', (message: ChatMessage) => {
            if (message.parentId !== selectedChatId) return;
            setMessages((prev) => {
                if (message.id && prev.some((x) => x.id === message.id))
                    return prev;
                return [...prev, message];
            });
        });

        const start = async () => {
            try {
                await connection.start();
                if (cancelled) return;
                await connection.invoke('ConnectToChat', selectedChatId);
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : String(err ?? '');
                const isExpectedRace =
                    cancelled ||
                    message.includes('before stop() was called') ||
                    message.includes('before the hub handshake could complete');
                if (!isExpectedRace)
                    console.debug('Chat hub start interrupted:', err);
            }
        };
        void start();

        return () => {
            cancelled = true;
            connection.off('ReceiveMessage');
            void connection.stop().catch(() => { });
            connectionRef.current = null;
        };
    }, [selectedChatId]);

    useEffect(() => {
        if (!selectedChat) return;
        setSettingsName(selectedChat.name ?? '');
        setSettingsAccent(selectedChat.accentColor ?? '#3b82f6');
        setSettingsAdminOnly(selectedChat.adminOnly ?? false);
    }, [selectedChat?.id]);

    const sendMessage = async () => {
        if (
            !userId ||
            !selectedChatId ||
            (!input.trim() && pendingAttachments.length === 0)
        )
            return;
        const text = input.trim();
        setSending(true);
        await fetch(`${API_BASE}/api/chat/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                parentId: selectedChatId,
                parentMessageId: replyToMessageId || undefined,
                userId,
                text,
                attachments: pendingAttachments,
                date: new Date().toISOString(),
            }),
        });

        if (text.includes('@AI') || isAiChat) {
            await fetch(`${API_BASE}/api/chat/${selectedChatId}/ai`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: selectedAiModel }),
            });
        }

        setInput('');
        setReplyToMessageId('');
        setPendingAttachments([]);
        setSending(false);
        await loadMessages(selectedChatId);
    };

    const onPickFiles = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setUploading(true);
        try {
            const uploaded = await Promise.all(
                Array.from(files).map((f) => uploadFile(API_BASE, f))
            );
            setPendingAttachments((prev) => [...prev, ...uploaded]);
        } finally {
            setUploading(false);
        }
    };

    const createChat = async () => {
        if (!userId) return;
        const users = createUsers
            .split(',')
            .map((x) => x.trim())
            .filter(Boolean);
        await fetch(`${API_BASE}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                creatorUserId: userId,
                usernames: users,
                name: createMode === 'group' ? createName : undefined,
                accentColor: createAccent,
                adminOnly: createAdminOnly,
                isDirect: createMode === 'direct',
            }),
        });
        setDialogOpen(false);
        setCreateName('');
        setCreateUsers('');
        setCreateAccent('#3b82f6');
        setCreateAdminOnly(false);
        await loadChats();
    };

    const saveSettings = async () => {
        if (!selectedChatId || !userId) return;
        await fetch(`${API_BASE}/api/chat/${selectedChatId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                requestingUserId: userId,
                name: selectedChat?.isDirect ? undefined : settingsName,
                accentColor: settingsAccent,
                adminOnly: settingsAdminOnly,
            }),
        });
        await loadChats();
        await loadPeople(selectedChatId);
    };

    const addUserToChat = async () => {
        if (!selectedChatId || !userId || !addUsername.trim()) return;
        await fetch(`${API_BASE}/api/chat/${selectedChatId}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                requestingUserId: userId,
                username: addUsername.trim(),
            }),
        });
        setAddUsername('');
        await loadChats();
        await loadPeople(selectedChatId);
    };

    const orderedMessages = useMemo(
        () =>
            [...messages].sort(
                (a, b) =>
                    new Date(a.date ?? '').getTime() -
                    new Date(b.date ?? '').getTime()
            ),
        [messages]
    );

    const messageById = useMemo(() => {
        const map: Record<string, ChatMessage> = {};
        for (const m of messages) {
            if (m.id) map[m.id] = m;
        }
        return map;
    }, [messages]);

    const resolveReplyTarget = (parentMessageId?: string) => {
        if (!parentMessageId) return null;
        if (messageById[parentMessageId]) return messageById[parentMessageId];
        const shortId = parentMessageId.includes(':')
            ? (parentMessageId.split(':').pop() ?? parentMessageId)
            : parentMessageId;
        if (messageById[shortId]) return messageById[shortId];
        const prefixed = `message:${parentMessageId}`;
        if (messageById[prefixed]) return messageById[prefixed];
        return null;
    };

    const showAiModel = input.includes('@AI') || isAiChat;
    const canSend =
        !!userId &&
        !uploading &&
        !sending &&
        !(selectedChat?.adminOnly === true && !isAdmin);

    const tabs = [
        { key: 'chat' as ChatTab, label: 'Chat', icon: MessageSquare },
        { key: 'people' as ChatTab, label: 'People', icon: Users },
        { key: 'settings' as ChatTab, label: 'Settings', icon: Settings },
    ];

    return (
        <main className="mx-auto w-full max-w-screen-2xl h-[calc(100vh-80px)] px-6 py-3 flex flex-col gap-3">
            <div className="flex items-center justify-between flex-shrink-0 py-1">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Chats</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Your direct messages and group chats
                    </p>
                </div>
                <Button
                    onClick={() => setDialogOpen(true)}
                    disabled={!userId}
                    className="gap-2"
                >
                    <Plus className="h-4 w-4" /> New Chat
                </Button>
            </div>

            <div className="grid md:grid-cols-[260px_1fr] gap-3 flex-1 min-h-0">
                {/* Chat list */}
                <div className="flex flex-col rounded-xl border border-border bg-card overflow-hidden">
                    <div className="px-3 py-3 border-b border-border flex-shrink-0">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Conversations · {chats.length}
                        </p>
                    </div>
                    <ScrollArea className="flex-1">
                        <div className="p-2 space-y-0.5">
                            {chats.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
                                    <MessagesSquare className="h-8 w-8 text-muted-foreground" />
                                    <p className="text-sm font-medium">
                                        No chats yet
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Start a new conversation
                                    </p>
                                </div>
                            ) : (
                                chats.map((chat) => (
                                    <ChatListItem
                                        key={chat.id}
                                        chat={chat}
                                        isSelected={selectedChatId === chat.id}
                                        displayName={displayName}
                                        currentUserId={userId}
                                        onClick={() =>
                                            setSelectedChatId(chat.id ?? '')
                                        }
                                    />
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </div>

                {/* Chat panel */}
                <div className="flex flex-col rounded-xl border border-border bg-card overflow-hidden min-h-0">
                    {!selectedChat ? (
                        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center p-8">
                            <MessageSquare className="h-10 w-10 text-muted-foreground" />
                            <p className="text-sm font-medium">
                                Select a conversation
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Choose a chat from the left to get started
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between px-5 py-3 border-b border-border flex-shrink-0">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold"
                                        style={{
                                            background:
                                                (selectedChat.accentColor ??
                                                    '#3b82f6') + '33',
                                            color:
                                                selectedChat.accentColor ??
                                                '#3b82f6',
                                        }}
                                    >
                                        {isSelectedDirect ? (
                                            (selectedChat.name ?? '?')
                                                .charAt(0)
                                                .toUpperCase()
                                        ) : (
                                            <Users className="h-4 w-4" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold leading-tight">
                                            {selectedChat.name ?? 'Direct chat'}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground">
                                            {isSelectedDirect
                                                ? 'Direct'
                                                : 'Group'}{' '}
                                            ·{' '}
                                            {
                                                (selectedChat.userIds ?? [])
                                                    .length
                                            }{' '}
                                            members
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
                                    {tabs.map(({ key, label, icon: Icon }) => (
                                        <button
                                            key={key}
                                            onClick={() => setTab(key)}
                                            className={cn(
                                                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                                                tab === key
                                                    ? 'bg-background text-foreground shadow-sm'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            )}
                                        >
                                            <Icon className="h-3.5 w-3.5" />
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Chat tab */}
                            {tab === 'chat' && (
                                <>
                                    <div className="flex-1 min-h-0">
                                        <ScrollArea className="h-full px-4 py-4">
                                            {orderedMessages.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center h-full py-16 gap-2 text-center">
                                                    <MessageSquare className="h-8 w-8 text-muted-foreground" />
                                                    <p className="text-sm font-medium">
                                                        No messages yet
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Be the first to say
                                                        something!
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-4">
                                                    {orderedMessages.map(
                                                        (m, idx) => (
                                                            <MessageBubble
                                                                key={
                                                                    m.id ??
                                                                    `${idx}-${m.userId}-${m.date}`
                                                                }
                                                                m={m}
                                                                idx={idx}
                                                                isOwn={
                                                                    m.userId ===
                                                                    userId
                                                                }
                                                                displayName={
                                                                    displayName
                                                                }
                                                                replyTarget={resolveReplyTarget(
                                                                    m.parentMessageId
                                                                )}
                                                                onReply={() =>
                                                                    setReplyToMessageId(
                                                                        m.id ??
                                                                        ''
                                                                    )
                                                                }
                                                            />
                                                        )
                                                    )}
                                                    <div ref={bottomRef} />
                                                </div>
                                            )}
                                        </ScrollArea>
                                    </div>

                                    <div className="border-t border-border px-4 py-3 space-y-2 flex-shrink-0">
                                        {showAiModel && (
                                            <div className="flex items-center gap-2">
                                                <Bot className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                                <Select
                                                    value={selectedAiModel}
                                                    onValueChange={
                                                        setSelectedAiModel
                                                    }
                                                >
                                                    <SelectTrigger className="h-7 text-xs flex-1">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {aiModels.length ===
                                                            0 ? (
                                                            <SelectItem
                                                                value="ministral"
                                                                className="text-xs"
                                                            >
                                                                ministral
                                                            </SelectItem>
                                                        ) : (
                                                            aiModels.map(
                                                                (m) => (
                                                                    <SelectItem
                                                                        key={m}
                                                                        value={
                                                                            m
                                                                        }
                                                                        className="text-xs"
                                                                    >
                                                                        {m}
                                                                    </SelectItem>
                                                                )
                                                            )
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}

                                        {replyToMessageId &&
                                            messageById[replyToMessageId] && (
                                                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
                                                    <Reply className="h-3 w-3 flex-shrink-0" />
                                                    <span className="font-medium">
                                                        {displayName(
                                                            messageById[
                                                                replyToMessageId
                                                            ].userId
                                                        )}
                                                        :
                                                    </span>
                                                    <span className="truncate flex-1">
                                                        {(
                                                            splitThink(
                                                                messageById[
                                                                    replyToMessageId
                                                                ].text
                                                            ).content ||
                                                            messageById[
                                                                replyToMessageId
                                                            ].text ||
                                                            ''
                                                        ).slice(0, 80)}
                                                    </span>
                                                    <button
                                                        onClick={() =>
                                                            setReplyToMessageId(
                                                                ''
                                                            )
                                                        }
                                                    >
                                                        <X className="h-3.5 w-3.5 hover:text-foreground" />
                                                    </button>
                                                </div>
                                            )}

                                        <AttachmentPreview
                                            attachments={pendingAttachments}
                                            onRemove={(index) =>
                                                setPendingAttachments((prev) =>
                                                    prev.filter(
                                                        (_, i) => i !== index
                                                    )
                                                )
                                            }
                                        />

                                        {/* Input row */}
                                        <div className="flex items-center gap-2">
                                            <input
                                                ref={chatFileInputRef}
                                                type="file"
                                                multiple
                                                className="hidden"
                                                onChange={(e) =>
                                                    void onPickFiles(
                                                        e.target.files
                                                    )
                                                }
                                            />
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                className="h-9 w-9 flex-shrink-0 text-muted-foreground"
                                                onClick={() =>
                                                    chatFileInputRef.current?.click()
                                                }
                                            >
                                                <Paperclip className="h-4 w-4" />
                                            </Button>
                                            <Input
                                                placeholder={
                                                    selectedChat.adminOnly &&
                                                        !isAdmin
                                                        ? 'Only admins can send here'
                                                        : 'Message...'
                                                }
                                                value={input}
                                                onChange={(e) =>
                                                    setInput(e.target.value)
                                                }
                                                onKeyDown={(e) => {
                                                    if (
                                                        e.key === 'Enter' &&
                                                        !e.shiftKey
                                                    ) {
                                                        e.preventDefault();
                                                        void sendMessage();
                                                    }
                                                }}
                                                disabled={
                                                    selectedChat.adminOnly &&
                                                    !isAdmin
                                                }
                                                className="flex-1 h-9 rounded-xl bg-muted/40 text-sm"
                                            />
                                            <Button
                                                size="icon"
                                                onClick={() =>
                                                    void sendMessage()
                                                }
                                                disabled={!canSend}
                                                className="h-9 w-9 flex-shrink-0 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 hover:opacity-90 border-0"
                                            >
                                                {sending ? (
                                                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                                                ) : (
                                                    <Send className="h-4 w-4 text-white" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* People tab */}
                            {tab === 'people' && (
                                <div className="flex-1 p-5 space-y-4 overflow-y-auto">
                                    <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
                                        {people.map((p) => (
                                            <div
                                                key={p.id}
                                                className="flex items-center justify-between px-4 py-3"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                                                        {(p.username ?? '?')
                                                            .charAt(0)
                                                            .toUpperCase()}
                                                    </div>
                                                    <span className="text-sm font-medium">
                                                        {p.username}
                                                    </span>
                                                </div>
                                                {p.isAdmin && (
                                                    <Badge
                                                        variant="secondary"
                                                        className="text-[10px] gap-1"
                                                    >
                                                        <ShieldCheck className="h-3 w-3" />{' '}
                                                        Admin
                                                    </Badge>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {isAdmin && (
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="Add by username"
                                                value={addUsername}
                                                onChange={(e) =>
                                                    setAddUsername(
                                                        e.target.value
                                                    )
                                                }
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter')
                                                        void addUserToChat();
                                                }}
                                                className="flex-1 h-9 text-sm rounded-xl"
                                            />
                                            <Button
                                                onClick={() =>
                                                    void addUserToChat()
                                                }
                                                className="gap-2 h-9"
                                            >
                                                <UserRoundPlus className="h-4 w-4" />{' '}
                                                Add
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {tab === 'settings' && (
                                <div className="flex-1 p-5 space-y-4 overflow-y-auto">
                                    <div className="rounded-xl border border-border p-4 space-y-4">
                                        {isSelectedDirect ? (
                                            <p className="text-sm text-muted-foreground">
                                                Direct chats cannot have a
                                                custom name.
                                            </p>
                                        ) : (
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                    Chat name
                                                </label>
                                                <Input
                                                    placeholder="Group chat name"
                                                    value={settingsName}
                                                    onChange={(e) =>
                                                        setSettingsName(
                                                            e.target.value
                                                        )
                                                    }
                                                    disabled={!isAdmin}
                                                    className="h-9 text-sm"
                                                />
                                            </div>
                                        )}

                                        <div className="flex items-center gap-6 flex-wrap">
                                            <div className="flex items-center gap-2">
                                                <label className="text-sm font-medium">
                                                    Accent colour
                                                </label>
                                                <input
                                                    type="color"
                                                    value={settingsAccent}
                                                    onChange={(e) =>
                                                        setSettingsAccent(
                                                            e.target.value
                                                        )
                                                    }
                                                    disabled={!isAdmin}
                                                    className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent p-0.5"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    id="adminOnly"
                                                    checked={settingsAdminOnly}
                                                    onChange={(e) =>
                                                        setSettingsAdminOnly(
                                                            e.target.checked
                                                        )
                                                    }
                                                    disabled={!isAdmin}
                                                />
                                                <label
                                                    htmlFor="adminOnly"
                                                    className="text-sm font-medium cursor-pointer"
                                                >
                                                    Admin-only messaging
                                                </label>
                                            </div>
                                        </div>

                                        {isAdmin && (
                                            <Button
                                                onClick={saveSettings}
                                                className="gap-2"
                                            >
                                                <Save className="h-4 w-4" />{' '}
                                                Save changes
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogOverlay className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
                <DialogContent className="sm:max-w-md rounded-2xl p-6 space-y-5">
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                                <Plus className="h-4 w-4" />
                            </div>
                            <div>
                                <DialogTitle className="text-base font-bold leading-tight">
                                    New Conversation
                                </DialogTitle>
                                <DialogDescription className="text-xs">
                                    Start a direct or group chat
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <Separator />

                    {/* Mode toggle */}
                    <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
                        {(['direct', 'group'] as const).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setCreateMode(mode)}
                                className={cn(
                                    'flex-1 rounded-md py-1.5 text-xs font-medium capitalize transition-all',
                                    createMode === mode
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                )}
                            >
                                {mode === 'direct'
                                    ? 'Direct message'
                                    : 'Group chat'}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-3">
                        {createMode === 'group' && (
                            <Input
                                placeholder="Group name"
                                value={createName}
                                onChange={(e) => setCreateName(e.target.value)}
                            />
                        )}
                        <Input
                            placeholder="Usernames (comma separated)"
                            value={createUsers}
                            onChange={(e) => setCreateUsers(e.target.value)}
                        />
                        <div className="flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium">
                                    Accent
                                </label>
                                <input
                                    type="color"
                                    value={createAccent}
                                    onChange={(e) =>
                                        setCreateAccent(e.target.value)
                                    }
                                    className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent p-0.5"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="createAdminOnly"
                                    checked={createAdminOnly}
                                    onChange={(e) =>
                                        setCreateAdminOnly(e.target.checked)
                                    }
                                />
                                <label
                                    htmlFor="createAdminOnly"
                                    className="text-sm font-medium cursor-pointer"
                                >
                                    Admin-only messaging
                                </label>
                            </div>
                        </div>
                        <Button
                            onClick={() => void createChat()}
                            className="w-full gap-2"
                            disabled={!createUsers.trim()}
                        >
                            <Plus className="h-4 w-4" /> Create
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </main>
    );
}
