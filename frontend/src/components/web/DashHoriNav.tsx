'use client';
import { AIChatPopup } from './ai-chat-popup';
import { Button } from '../ui/button';
import { ThemeToggle } from './theme-toggle';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, Sparkles, Circle } from 'lucide-react';
import { Input } from '../ui/input';
import { cn } from '@/lib/utils';
import { usePresence } from '@/lib/usePresence';
import { getAuthUser } from '@/lib/auth';

const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5082';

type UserResult = {
    id?: string;
    username?: string;
    email?: string;
};

export function HoriNavBar() {
    const [aiOpen, setAiOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState<UserResult[]>([]);
    const [searching, setSearching] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { onlineUsers } = usePresence();
    const currentUserId = getAuthUser()?.id;

    useEffect(() => {
        if (searchOpen) inputRef.current?.focus();
    }, [searchOpen]);

    // Close on Escape
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setSearchOpen(false);
                setSearchQuery('');
                setResults([]);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // Close dropdown on outside click
    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target as Node)
            ) {
                setResults([]);
            }
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, []);

    // Debounced search
    useEffect(() => {
        if (!searchQuery.trim()) {
            setResults([]);
            return;
        }

        const timeout = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await fetch(
                    `${API_BASE}/api/users/search?q=${encodeURIComponent(searchQuery)}`
                );

                if (res.ok) {
                    const data = (await res.json()) as UserResult[];
                    // Filter out self, sort online users to top
                    const filtered = data
                        .filter((u) => u.id !== currentUserId)
                        .sort((a, b) => {
                            const aOnline = onlineUsers.includes(a.id ?? '');
                            const bOnline = onlineUsers.includes(b.id ?? '');
                            return Number(bOnline) - Number(aOnline);
                        });
                    setResults(filtered);
                }
            } finally {
                setSearching(false);
            }
        }, 300);

        return () => clearTimeout(timeout);
    }, [searchQuery, onlineUsers, currentUserId]);

    return (
        <nav
            className="sticky top-0 w-full px-6 py-3
            flex items-center justify-between
            backdrop-blur-md
            bg-white/60 dark:bg-[#0a0a0a]/40
            border-b border-gray-300 dark:border-[#262626]
            shadow-lg z-50 gap-4"
        >
            {/* Search area */}
            <div
                className="flex flex-1 items-center gap-2 relative"
                ref={dropdownRef}
            >
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                        setSearchOpen(!searchOpen);
                        if (searchOpen) {
                            setSearchQuery('');
                            setResults([]);
                        }
                    }}
                    aria-label="Toggle search"
                >
                    {searchOpen ? (
                        <X className="h-4 w-4" />
                    ) : (
                        <Search className="h-4 w-4" />
                    )}
                </Button>

                <div
                    className={cn(
                        'relative overflow-visible transition-all duration-300 ease-in-out',
                        searchOpen ? 'w-72 opacity-100' : 'w-0 opacity-0'
                    )}
                >
                    <Input
                        ref={inputRef}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search users..."
                        className="h-9 text-sm"
                    />

                    {/* Results dropdown */}
                    {(results.length > 0 || searching) && searchOpen && (
                        <div className="absolute top-full left-0 mt-1.5 w-full min-w-[280px] rounded-xl border border-border bg-background/95 backdrop-blur-sm shadow-xl z-50 overflow-hidden">
                            {searching ? (
                                <div className="px-4 py-3 text-xs text-muted-foreground">
                                    Searching...
                                </div>
                            ) : (
                                <>
                                    <div className="px-3 py-2 border-b border-border">
                                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                            Users · {results.length} found
                                        </p>
                                    </div>
                                    <ul className="max-h-64 overflow-y-auto py-1">
                                        {results.map((user) => {
                                            const isOnline =
                                                onlineUsers.includes(
                                                    user.id ?? ''
                                                );
                                            return (
                                                <li key={user.id}>
                                                    <button
                                                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/60 transition-colors text-left"
                                                        onClick={() => {
                                                            // navigate or open DM
                                                            setSearchQuery('');
                                                            setResults([]);
                                                            setSearchOpen(
                                                                false
                                                            );
                                                        }}
                                                    >
                                                        {/* Avatar */}
                                                        <div className="relative flex-shrink-0">
                                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                                                                {(
                                                                    user.username ??
                                                                    '?'
                                                                )
                                                                    .charAt(0)
                                                                    .toUpperCase()}
                                                            </div>
                                                            {/* Online dot */}
                                                            {isOnline && (
                                                                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background" />
                                                            )}
                                                        </div>

                                                        {/* Info */}
                                                        <div className="flex-1 overflow-hidden">
                                                            <p className="text-sm font-medium truncate">
                                                                {user.username}
                                                            </p>
                                                            <p className="text-[11px] text-muted-foreground truncate">
                                                                {isOnline ? (
                                                                    <span className="text-green-500 font-medium">
                                                                        Online
                                                                    </span>
                                                                ) : (
                                                                    user.email
                                                                )}
                                                            </p>
                                                        </div>
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setAiOpen(true)}
                    aria-label="Open AI"
                >
                    <Sparkles className="h-4 w-4" />
                </Button>
                <AIChatPopup open={aiOpen} setOpen={setAiOpen} />
                <ThemeToggle />
            </div>
        </nav>
    );
}
