'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Paperclip,
    Send,
    Reply,
    X,
    CirclePlus,
    Save,
    UserRound,
    UserRoundPlus,
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogOverlay,
    DialogTitle,
} from '@/components/ui/dialog';
import { getAuthUser } from '@/lib/auth';
import { splitThink } from '@/lib/chat-think';
import { MarkdownContent } from '@/components/web/markdown-content';
import { Attachment, uploadFile } from '@/lib/uploads';
import { AttachmentPreview } from '@/components/web/attachment-preview';

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
    const connectionRef = useRef<signalR.HubConnection | null>(null);

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
                if (!isExpectedRace) {
                    console.debug('Chat hub start interrupted:', err);
                }
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

    return (
        <main className="mx-auto max-w-7xl min-h-screen overflow-y-auto p-6 py-30 space-y-6">
            <section className="rounded-lg border p-4 flex items-center justify-between">
                <h1 className="text-3xl font-semibold">Chats</h1>
                <Button onClick={() => setDialogOpen(true)} disabled={!userId}>
                    <CirclePlus className="h-4 w-4" />
                </Button>
            </section>

            <section className="grid gap-4 md:grid-cols-[20rem_1fr]">
                <div className="rounded-lg border p-2 space-y-2 max-h-[42rem] overflow-y-auto">
                    {chats.map((chat) => {
                        const isDirect =
                            (chat.isDirect ?? false) ||
                            (chat.userIds?.length ?? 0) <= 2;
                        return (
                            <button
                                key={chat.id}
                                onClick={() => setSelectedChatId(chat.id ?? '')}
                                className={`w-full rounded-md border p-3 text-left ${selectedChatId === chat.id ? 'bg-muted' : ''
                                    }`}
                                style={{
                                    borderLeft: `6px solid ${chat.accentColor ?? '#3b82f6'}`,
                                }}
                            >
                                <div className="font-medium">
                                    {chat.name ?? 'Direct chat'}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {isDirect ? 'Direct' : 'Group'} •{' '}
                                    {(chat.userIds ?? []).length} people
                                </div>
                            </button>
                        );
                    })}
                </div>

                <div className="rounded-lg border p-4 space-y-3">
                    {!selectedChat ? (
                        <p className="text-sm text-muted-foreground">
                            Select a chat...
                        </p>
                    ) : (
                        <>
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-medium">
                                    {selectedChat.name}
                                </h2>
                                <div className="flex gap-2">
                                    <Button
                                        variant={
                                            tab === 'chat'
                                                ? 'default'
                                                : 'outline'
                                        }
                                        onClick={() => setTab('chat')}
                                    >
                                        Chat
                                    </Button>
                                    <Button
                                        variant={
                                            tab === 'people'
                                                ? 'default'
                                                : 'outline'
                                        }
                                        onClick={() => setTab('people')}
                                    >
                                        People
                                    </Button>
                                    <Button
                                        variant={
                                            tab === 'settings'
                                                ? 'default'
                                                : 'outline'
                                        }
                                        onClick={() => setTab('settings')}
                                    >
                                        Settings
                                    </Button>
                                </div>
                            </div>

                            {tab === 'chat' && (
                                <>
                                    <div className="h-[30rem] overflow-y-auto rounded-md border p-3 space-y-2">
                                        {orderedMessages.map((m, idx) => {
                                            const parsed = splitThink(m.text);
                                            const replyTarget =
                                                resolveReplyTarget(
                                                    m.parentMessageId
                                                );
                                            return (
                                                <div
                                                    key={
                                                        m.id ??
                                                        `${idx}-${m.userId}-${m.date}`
                                                    }
                                                    className="rounded-md border p-2"
                                                >
                                                    <div className="text-xs text-muted-foreground">
                                                        {displayName(m.userId)}
                                                    </div>
                                                    {m.parentMessageId &&
                                                        replyTarget && (
                                                            <div className="mb-2 rounded border-l-4 border-muted-foreground/40 bg-muted/40 p-2 text-xs text-muted-foreground">
                                                                Replying to{' '}
                                                                {displayName(
                                                                    replyTarget.userId
                                                                )}
                                                                :{' '}
                                                                {(
                                                                    splitThink(
                                                                        replyTarget.text
                                                                    ).content ||
                                                                    replyTarget.text ||
                                                                    ''
                                                                ).slice(0, 120)}
                                                            </div>
                                                        )}
                                                    <MarkdownContent
                                                        className="prose prose-sm max-w-none dark:prose-invert"
                                                        content={
                                                            parsed.content ||
                                                            m.text
                                                        }
                                                    />
                                                    <AttachmentPreview
                                                        attachments={
                                                            m.attachments
                                                        }
                                                    />
                                                    <div className="mt-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() =>
                                                                setReplyToMessageId(
                                                                    m.id ?? ''
                                                                )
                                                            }
                                                        >
                                                            <Reply className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                    {m.userId === 'AI' &&
                                                        parsed.thinking && (
                                                            <details className="mt-2 rounded-md border bg-black/30 p-2">
                                                                <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                                                                    Show
                                                                    thinking
                                                                </summary>
                                                                <div className="mt-2 text-xs whitespace-pre-wrap text-muted-foreground">
                                                                    {
                                                                        parsed.thinking
                                                                    }
                                                                </div>
                                                            </details>
                                                        )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {(input.includes('@AI') || isAiChat) && (
                                        <div className="rounded-md border p-2">
                                            <label className="text-xs text-muted-foreground">
                                                AI model
                                            </label>
                                            <select
                                                value={selectedAiModel}
                                                onChange={(e) =>
                                                    setSelectedAiModel(
                                                        e.target.value
                                                    )
                                                }
                                                className="mt-1 w-full rounded-md border bg-background p-2 text-sm"
                                            >
                                                {aiModels.length === 0 && (
                                                    <option value="ministral">
                                                        ministral
                                                    </option>
                                                )}
                                                {aiModels.map((m) => (
                                                    <option key={m} value={m}>
                                                        {m}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    {replyToMessageId &&
                                        messageById[replyToMessageId] && (
                                            <div className="rounded-md border bg-muted/40 p-2 text-xs text-muted-foreground">
                                                Replying to{' '}
                                                {displayName(
                                                    messageById[
                                                        replyToMessageId
                                                    ].userId
                                                )}
                                                :{' '}
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
                                                ).slice(0, 120)}
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="ml-2 h-auto px-2 py-0 text-xs"
                                                    onClick={() =>
                                                        setReplyToMessageId('')
                                                    }
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                    <input
                                        ref={chatFileInputRef}
                                        type="file"
                                        multiple
                                        className="hidden"
                                        onChange={(e) =>
                                            void onPickFiles(e.target.files)
                                        }
                                    />
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
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder={
                                                selectedChat.adminOnly &&
                                                    !isAdmin
                                                    ? 'Only admins can send in this chat'
                                                    : 'Enter your message'
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
                                        />
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="outline"
                                            onClick={() =>
                                                chatFileInputRef.current?.click()
                                            }
                                            title="Attach files"
                                        >
                                            <Paperclip className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            onClick={() => void sendMessage()}
                                            disabled={
                                                !userId ||
                                                uploading ||
                                                (selectedChat.adminOnly ===
                                                    true &&
                                                    !isAdmin)
                                            }
                                        >
                                            <Send className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </>
                            )}

                            {tab === 'people' && (
                                <div className="space-y-3">
                                    <div className="rounded-md border divide-y">
                                        {people.map((p) => (
                                            <div
                                                key={p.id}
                                                className="flex items-center justify-between p-3 text-sm"
                                            >
                                                <span>{p.username}</span>
                                                {p.isAdmin && (
                                                    <span className="text-xs text-muted-foreground">
                                                        Admin
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    {isAdmin && (
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="Username to add"
                                                value={addUsername}
                                                onChange={(e) =>
                                                    setAddUsername(
                                                        e.target.value
                                                    )
                                                }
                                            />
                                            <Button
                                                onClick={() =>
                                                    void addUserToChat()
                                                }
                                            >
                                                <UserRoundPlus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {tab === 'settings' && (
                                <div className="space-y-3 rounded-md border p-3">
                                    {isSelectedDirect ? (
                                        <p className="text-sm text-muted-foreground">
                                            Direct chats must not have a custom
                                            name.
                                        </p>
                                    ) : (
                                        <Input
                                            placeholder="Group chat name"
                                            value={settingsName}
                                            onChange={(e) =>
                                                setSettingsName(e.target.value)
                                            }
                                            disabled={!isAdmin}
                                        />
                                    )}
                                    <div className="flex items-center gap-2">
                                        <label className="text-sm">
                                            Accent
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
                                        />
                                        <label className="text-sm ml-4">
                                            Admin onl send
                                        </label>
                                        <input
                                            type="checkbox"
                                            checked={settingsAdminOnly}
                                            onChange={(e) =>
                                                setSettingsAdminOnly(
                                                    e.target.checked
                                                )
                                            }
                                            disabled={!isAdmin}
                                        />
                                    </div>
                                    {isAdmin && (
                                        <Button onClick={saveSettings}>
                                            <Save className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </section>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogOverlay className="fixed inset-0 bg-black/30 backdrop-blur-md" />
                <DialogContent className="sm:max-w-md p-6 space-y-4">
                    <DialogHeader>
                        <DialogTitle>Create chat</DialogTitle>
                    </DialogHeader>
                    <div className="flex gap-2">
                        <Button
                            variant={
                                createMode === 'direct' ? 'default' : 'outline'
                            }
                            onClick={() => setCreateMode('direct')}
                        >
                            Direct
                        </Button>
                        <Button
                            variant={
                                createMode === 'group' ? 'default' : 'outline'
                            }
                            onClick={() => setCreateMode('group')}
                        >
                            Group
                        </Button>
                    </div>
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
                    <div className="flex items-center gap-2">
                        <label className="text-sm">Accent</label>
                        <input
                            type="color"
                            value={createAccent}
                            onChange={(e) => setCreateAccent(e.target.value)}
                        />
                        <label className="text-sm ml-4">Admin only send</label>
                        <input
                            type="checkbox"
                            checked={createAdminOnly}
                            onChange={(e) =>
                                setCreateAdminOnly(e.target.checked)
                            }
                        />
                    </div>
                    <Button onClick={() => createChat()}>Create</Button>
                </DialogContent>
            </Dialog>
        </main>
    );
}
