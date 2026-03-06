'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogOverlay,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { splitThink } from '@/lib/chat-think';
import { MarkdownContent } from '@/components/web/markdown-content';
import { cn } from '@/lib/utils';
import {
    Send,
    Sparkles,
    User,
    Loader2,
    ChevronDown,
    Brain,
} from 'lucide-react';

type ChatMessage = {
    parentId?: string;
    date?: string;
    userId?: string;
    text?: string;
    id?: string;
};

interface AIChatPopupProps {
    open: boolean;
    setOpen: (open: boolean) => void;
}

const CHAT_ID = Math.random().toString();

function TypingDots() {
    return (
        <span className="inline-flex items-center gap-1 py-1">
            {[0, 1, 2].map((i) => (
                <span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce"
                    style={{
                        animationDelay: `${i * 0.15}s`,
                        animationDuration: '0.9s',
                    }}
                />
            ))}
        </span>
    );
}

function MessageBubble({ m }: { m: ChatMessage; idx: number }) {
    const isUser = m.userId === 'User';
    const parsed = splitThink(m.text);
    const [thinkOpen, setThinkOpen] = useState(false);

    const fmt = (d?: string) =>
        d
            ? new Date(d).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
            })
            : '';

    return (
        <div className={cn('flex gap-2.5', isUser && 'flex-row-reverse')}>
            {/* Avatar */}
            <div
                className={cn(
                    'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full',
                    isUser
                        ? 'bg-muted border border-border'
                        : 'bg-gradient-to-br from-yellow-400 to-orange-500'
                )}
            >
                {isUser ? (
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                    <Sparkles className="h-3.5 w-3.5 text-white" />
                )}
            </div>

            {/* Content */}
            <div
                className={cn(
                    'flex flex-col gap-1 max-w-[78%]',
                    isUser && 'items-end'
                )}
            >
                <div
                    className={cn(
                        'rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                        isUser
                            ? 'bg-primary text-primary-foreground rounded-tr-sm'
                            : 'bg-muted text-foreground rounded-tl-sm'
                    )}
                >
                    {isUser ? (
                        <span>{m.text}</span>
                    ) : (
                        <MarkdownContent
                            className="prose prose-sm max-w-none dark:prose-invert"
                            content={parsed.content || m.text || ''}
                        />
                    )}
                </div>

                {/* Thinking toggle */}
                {parsed.thinking && (
                    <button
                        onClick={() => setThinkOpen(!thinkOpen)}
                        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1"
                    >
                        <Brain className="h-3 w-3" />
                        {thinkOpen ? 'Hide' : 'Show'} thinking
                        <ChevronDown
                            className={cn(
                                'h-3 w-3 transition-transform duration-200',
                                thinkOpen && 'rotate-180'
                            )}
                        />
                    </button>
                )}

                {thinkOpen && parsed.thinking && (
                    <div className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground whitespace-pre-wrap max-w-full">
                        {parsed.thinking}
                    </div>
                )}

                <span className="text-[10px] text-muted-foreground px-1">
                    {fmt(m.date)}
                </span>
            </div>
        </div>
    );
}

export function AIChatPopup({ open, setOpen }: AIChatPopupProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [prompt, setPrompt] = useState('');
    const [models, setModels] = useState<string[]>([]);
    const [model, setModel] = useState('ministral');
    const [loading, setLoading] = useState(false);
    const connectionRef = useRef<signalR.HubConnection | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const backendUrl = 'http://localhost:5082';

    const orderedMessages = useMemo(
        () =>
            [...messages].sort(
                (a, b) =>
                    new Date(a.date ?? '').getTime() -
                    new Date(b.date ?? '').getTime()
            ),
        [messages]
    );

    const addMessage = (incoming: ChatMessage) => {
        setMessages((prev) => {
            const exists = prev.some((m) =>
                incoming.id
                    ? m.id === incoming.id
                    : m.parentId === incoming.parentId &&
                    m.userId === incoming.userId &&
                    m.date === incoming.date &&
                    m.text === incoming.text
            );
            return exists ? prev : [...prev, incoming];
        });
    };

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 100);
    }, [open]);

    useEffect(() => {
        if (!open) return;

        const connection = new signalR.HubConnectionBuilder()
            .withUrl(`${backendUrl}/apphub`, { withCredentials: false })
            .withAutomaticReconnect()
            .build();
        connectionRef.current = connection;

        connection.on('ReceiveMessage', (message: ChatMessage) => {
            if (message.parentId !== CHAT_ID) return;
            addMessage(message);
        });

        const start = async () => {
            await connection.start();
            await connection.invoke('ConnectToChat', CHAT_ID);
            const loaded = await connection.invoke<ChatMessage[]>(
                'GetMessages',
                CHAT_ID
            );
            const availableModels =
                (await connection.invoke<string[]>('GetAIModels')) ?? [];
            setMessages(loaded ?? []);
            setModels(availableModels);
            if (
                availableModels.length > 0 &&
                !availableModels.includes(model)
            ) {
                setModel(availableModels[0]);
            }
        };

        start();

        return () => {
            connection.off('ReceiveMessage');
            connection.stop();
            connectionRef.current = null;
        };
    }, [open, backendUrl]);

    async function handleSend() {
        const connection = connectionRef.current;
        if (!connection || loading || !prompt.trim()) return;

        setLoading(true);
        const text = prompt.trim();
        setPrompt('');

        try {
            const userMessage = await connection.invoke<ChatMessage>(
                'SendMessage',
                {
                    parentId: CHAT_ID,
                    userId: 'User',
                    text,
                    date: new Date().toISOString(),
                }
            );
            addMessage(userMessage);
            await connection.invoke<ChatMessage | null>(
                'AddAIResponseToChat',
                model,
                CHAT_ID
            );
        } catch (err) {
            console.error((err as Error).message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogOverlay className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
            <DialogContent className="flex flex-col gap-0 p-0 sm:max-w-[500px] h-[620px] overflow-hidden rounded-2xl border border-border shadow-2xl">
                {/* Header */}
                <DialogHeader className="px-5 pt-5 pb-4 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 shadow-md flex-shrink-0">
                            <Sparkles className="h-4 w-4 text-white" />
                        </div>
                        <div>
                            <DialogTitle className="text-base font-bold leading-tight text-left">
                                Chat With Hive AI
                            </DialogTitle>
                            <p className="text-[11px] text-muted-foreground leading-tight">
                                Powered by your colonys knowledge
                            </p>
                        </div>
                    </div>

                    {/* Model selector */}
                    <div className="mt-3">
                        <Select value={model} onValueChange={setModel}>
                            <SelectTrigger className="h-8 text-xs w-full">
                                <SelectValue placeholder="Select model" />
                            </SelectTrigger>
                            <SelectContent>
                                {models.length === 0 ? (
                                    <SelectItem
                                        value="ministral"
                                        className="text-xs"
                                    >
                                        ministral
                                    </SelectItem>
                                ) : (
                                    models.map((m) => (
                                        <SelectItem
                                            key={m}
                                            value={m}
                                            className="text-xs"
                                        >
                                            {m}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                </DialogHeader>

                <Separator />

                {/* Messages */}
                <div className="flex-1 min-h-0">
                    {' '}
                    <ScrollArea className="h-full px-4 py-3">
                        {orderedMessages.length === 0 ? (
                            <div className="flex h-full flex-col items-center justify-center gap-3 py-20 text-center">
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                                    <Sparkles className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">
                                        Ask Hive AI anything
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
                                        Get help with studying, explanations,
                                        summaries and more.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {orderedMessages.map((m, idx) => (
                                    <MessageBubble
                                        key={
                                            m.id ??
                                            `${m.userId}-${m.date}-${idx}`
                                        }
                                        m={m}
                                        idx={idx}
                                    />
                                ))}

                                {/* Typing indicator */}
                                {loading && (
                                    <div className="flex gap-2.5">
                                        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-500">
                                            <Sparkles className="h-3.5 w-3.5 text-white" />
                                        </div>
                                        <div className="rounded-2xl rounded-tl-sm bg-muted px-3.5 py-2.5">
                                            <TypingDots />
                                        </div>
                                    </div>
                                )}

                                <div ref={bottomRef} />
                            </div>
                        )}
                    </ScrollArea>
                </div>

                <Separator />

                {/* Input */}
                <div className="flex items-center gap-2 px-4 py-3 flex-shrink-0">
                    <Input
                        ref={inputRef}
                        placeholder="Ask anything..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        disabled={loading}
                        className="flex-1 h-10 text-sm rounded-xl bg-muted/40"
                    />
                    <Button
                        size="icon"
                        onClick={handleSend}
                        disabled={!prompt.trim() || loading}
                        className="h-10 w-10 rounded-xl flex-shrink-0 bg-gradient-to-br from-yellow-400 to-orange-500 hover:opacity-90 border-0"
                        aria-label="Send"
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-white" />
                        ) : (
                            <Send className="h-4 w-4 text-white" />
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
