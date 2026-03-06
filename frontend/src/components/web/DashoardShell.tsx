'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { usePresence } from '@/lib/usePresence';
import { HoriNavBar } from '@/components/web/DashHoriNav';
import { Sidebar } from '@/components/web/Sidebar';

export function DashboardShell({ children }: { children: React.ReactNode }) {
    usePresence();
    const router = useRouter();

    useEffect(() => {
        const user = getAuthUser();
        if (!user) router.replace('/');
    }, []);

    return (
        <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
                <HoriNavBar />
                <main className="flex-1 overflow-y-auto p-6">{children}</main>
            </div>
        </div>
    );
}
