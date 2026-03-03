'use client';
import { useState } from 'react';
import { AuthCard } from './AuthCard';
import { Button, buttonVariants } from '@/components/ui/button';
import Link from 'next/link';
import { ThemeToggle } from './theme-toggle';
export function Navbar() {
    const [open, setOpen] = useState(false);
    return (
        <nav
            className="w-full px-6 py-3 
           flex items-center justify-between
           backdrop-blur-md
           bg-white/60 dark:bg-[#0a0a0a]/40
           border-b border-gray-300 dark:border-[#262626]
           shadow-lg"
        >
            {/* Left Section */}
            <div className="flex-1">
                <Link href="/">
                    <h1 className="text-3xl font-bold">
                        <span className="text-blue-500">Study</span>
                        <span className="text-orange-500">Hive</span>
                    </h1>
                </Link>
            </div>

            {/* Center Section */}
            <div className="flex-1 flex justify-center gap-8">
                <Link className={buttonVariants({ variant: 'ghost' })} href="/">
                    Contribute
                </Link>
                <Link
                    className={buttonVariants({ variant: 'ghost' })}
                    href="/wateranalysis"
                >
                    Coaching
                </Link>
                <Link
                    className={buttonVariants({ variant: 'ghost' })}
                    href="/plantanalysis"
                >
                    Leaderboard
                </Link>
                <Link
                    className={buttonVariants({ variant: 'ghost' })}
                    href="/plantanalysis"
                >
                    HiveAi
                </Link>
            </div>

            {/* Right Section */}
            <div className="flex-1 flex justify-end items-center gap-2">
                <Button variant="outline" onClick={() => setOpen(true)}>
                    Get started
                </Button>
                <AuthCard open={open} setOpen={setOpen} />
                <ThemeToggle />
            </div>
        </nav>
    );
}
