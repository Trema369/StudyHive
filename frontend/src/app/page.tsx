'use client';
import { useEffect, useState } from 'react';

export default function Home() {
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetch('http://localhost:5082/api/Test')
            .then((res) => res.json())
            .then((data) => setMessage(data.message))
            .catch((err) => console.error(err));
    }, []);

    return (
        <div>
            <h1>Backend says:</h1>
            <p>{message}</p>
        </div>
    );
}
