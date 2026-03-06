'use client';
import { useEffect, useState, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { getAuthUser } from '@/lib/auth';

const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5082';

export function usePresence() {
    const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
    const connectionRef = useRef<signalR.HubConnection | null>(null);

    useEffect(() => {
        const userId = getAuthUser()?.id;
        if (!userId) return;

        const connection = new signalR.HubConnectionBuilder()
            .withUrl(`${API_BASE}/apphub?userId=${userId}`, {
                withCredentials: false,
            })
            .withAutomaticReconnect()
            .build();

        connectionRef.current = connection;

        connection.on('UserOnline', (id: string) => {
            setOnlineUsers((prev) => [...new Set([...prev, id])]);
        });

        connection.on('UserOffline', (id: string) => {
            setOnlineUsers((prev) => prev.filter((u) => u !== id));
        });

        connection.start().then(async () => {
            const online = await connection.invoke<string[]>('GetOnlineUsers');
            setOnlineUsers(online);
        });

        return () => {
            connection.off('UserOnline');
            connection.off('UserOffline');
            void connection.stop();
            connectionRef.current = null;
        };
    }, []);

    return { onlineUsers };
}
