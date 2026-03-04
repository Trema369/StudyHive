'use client';
import { useState } from 'react';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogOverlay,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { setAuthUser } from '@/lib/auth';
import Image from 'next/image';

interface AuthCardProps {
    open: boolean;
    setOpen: (open: boolean) => void;
}

export function AuthCard({ open, setOpen }: AuthCardProps) {
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5082';
    const [mode, setMode] = useState<'signin' | 'signup'>('signin');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleSignIn() {
        setLoading(true);
        setError('');
        try {
            const user = await fetch(`${API_BASE}/api/auth/signin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const payload = await user.json();
            if (!user.ok) throw new Error(payload?.message ?? 'Invalid credentials');
            setAuthUser(payload);
            setOpen(false);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }

    async function handleSignUp() {
        setLoading(true);
        setError('');
        try {
            const user = await fetch(`${API_BASE}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password }),
            });
            const payload = await user.json();
            if (!user.ok) throw new Error(payload?.message ?? 'Sign up failed');
            setAuthUser(payload);
            setOpen(false);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }
    const submit = () => {
        if (mode === 'signin') {
            void handleSignIn();
            return;
        }
        void handleSignUp();
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogOverlay className="fixed inset-0 bg-black/30 backdrop-blur-md" />
            <DialogContent className="sm:max-w-md p-6 space-y-4">
                {/* Header */}
                <DialogHeader className="relative text-center">
                    <div className="mx-auto mb-2">
                        <Image
                            src="/icon.png"
                            alt="StudyHive icon"
                            width={40}
                            height={40}
                            className="h-10 w-10 rounded-md"
                            priority
                        />
                    </div>
                    <DialogTitle className="text-2xl font-bold text-center">
                        Log in or Sign up
                    </DialogTitle>

                    <DialogDescription className="text-sm text-muted-foreground mt-2 text-center">
                        Access StudyHive to track progress and compete on the
                        leaderboard.
                    </DialogDescription>
                </DialogHeader>
                {error && (
                    <div className="text-red-500 text-sm text-center">
                        {error}
                    </div>
                )}

                <div className="flex gap-2">
                    <Button
                        className="flex-1"
                        variant={mode === 'signin' ? 'default' : 'outline'}
                        onClick={() => setMode('signin')}
                        disabled={loading}
                    >
                        Sign In
                    </Button>
                    <Button
                        className="flex-1"
                        variant={mode === 'signup' ? 'default' : 'outline'}
                        onClick={() => setMode('signup')}
                        disabled={loading}
                    >
                        Sign Up
                    </Button>
                </div>

                <Input
                    className="w-full h-12"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') submit();
                    }}
                />
                {mode === 'signup' && (
                    <Input
                        className="w-full h-12"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') submit();
                        }}
                    />
                )}
                <Input
                    className="w-full h-12"
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') submit();
                    }}
                />

                <Button className="flex-1 h-12" onClick={submit} disabled={loading}>
                    {mode === 'signin' ? 'Sign In' : 'Sign Up'}
                </Button>
            </DialogContent>
        </Dialog>
    );
}
