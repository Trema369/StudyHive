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
import { splitThink } from '@/lib/chat-think';
import { MarkdownContent } from '@/components/web/markdown-content';
import { Button } from '../ui/button';
import { Send } from 'lucide-react';

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

export function AIChatPopup({ open, setOpen }: AIChatPopupProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [prompt, setPrompt] = useState('');
    const [models, setModels] = useState<string[]>([]);
    const [model, setModel] = useState('ministral');
    const [loading, setLoading] = useState(false);
    const connectionRef = useRef<signalR.HubConnection | null>(null);
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
            <DialogOverlay className="fixed inset-0 bg-black/30 backdrop-blur-md" />
            <DialogContent className="sm:max-w-2xl p-6 space-y-4">
                {/* Header */}
                <DialogHeader className="relative text-center">
                    <DialogTitle className="text-2xl font-bold text-center">
                        Chat With Hive AI
                    </DialogTitle>
                </DialogHeader>

                <div className="h-80 overflow-y-auto rounded-md border p-3 space-y-3">
                    {orderedMessages.map((m, idx) => {
                        const parsed = splitThink(m.text);

                        return (
                            <div
                                key={m.id ?? `${m.userId}-${m.date}-${idx}`}
                                className="rounded-md border bg-muted/50 p-2"
                            >
                                <div className="text-xs text-muted-foreground">
                                    {m.userId ?? 'Unknown'}
                                </div>
                                <MarkdownContent
                                    className="prose prose-sm max-w-none dark:prose-invert"
                                    content={parsed.content || m.text || ''}
                                />
                                {parsed.thinking && (
                                    <details className="mt-2 rounded-md border bg-black/30 p-2">
                                        <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                                            Show thinking
                                        </summary>
                                        <div className="mt-2 text-xs whitespace-pre-wrap text-muted-foreground">
                                            {parsed.thinking}
                                        </div>
                                    </details>
                                )}
                            </div>
                        );
                    })}
                </div>

                <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                >
                    {models.length === 0 && (
                        <option value="ministral">ministral</option>
                    )}
                    {models.map((m) => (
                        <option key={m} value={m}>
                            {m}
                        </option>
                    ))}
                </select>

                <div className="flex gap-2">
                    <Input
                        placeholder="Enter your message..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                    />
                    <Button onClick={() => handleSend()}>
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
