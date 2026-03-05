export async function generateAISummary(notes: string): Promise<string> {
    const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:5082"}/api/AISummary/generate`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ notes }),
        }
    );

    if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.message ?? 'Failed to generate summary');
    }

    const data = await res.json();
    return data.summary;
}
