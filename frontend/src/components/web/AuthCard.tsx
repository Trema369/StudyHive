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
import { Separator } from '@/components/ui/separator';

interface AuthCardProps {
    open: boolean;
    setOpen: (open: boolean) => void;
}

export function AuthCard({ open, setOpen }: AuthCardProps) {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleSignIn() {
        setLoading(true);
        setError('');
        try {
            const user = await fetch('http://localhost:5082/api/auth/signin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            if (!user.ok) throw new Error('Invalid credentials');
            const data = await user.json();
            console.log('Signed in user:', data);
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
            const user = await fetch('http://localhost:5082/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password }),
            });
            if (!user.ok) throw new Error('Sign up failed');
            const data = await user.json();
            console.log('Signed up user:', data);
            setOpen(false);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogOverlay className="fixed inset-0 bg-black/30 backdrop-blur-md" />
            <DialogContent className="sm:max-w-md p-6 space-y-4">
                {/* Header */}
                <DialogHeader className="relative text-center">
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

                <Input
                    className="w-full h-12"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                <Input
                    className="w-full h-12"
                    placeholder="Email (for sign up)"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                    className="w-full h-12"
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                <Button className="w-full h-12" disabled={loading}>
                    Continue with Google
                </Button>

                <Button
                    className="flex-1 h-12"
                    onClick={handleSignUp}
                    disabled={loading}
                >
                    Sign Up
                </Button>
                <div className="flex items-center gap-3">
                    <Separator className="flex-1 " />
                    <span className="text-xs text-muted-foreground">or</span>
                    <Separator className="flex-1 " />
                </div>
                <Button
                    className="flex-1 h-12"
                    onClick={handleSignIn}
                    disabled={loading}
                >
                    Sign In
                </Button>
            </DialogContent>
        </Dialog>
    );
}
