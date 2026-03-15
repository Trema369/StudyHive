export interface AIFlashcardRequest {
    notes: string;
}

export interface FlashcardCard {
    front: string;
    back: string;
    flashcardId?: string;
    id?: string;
}

export async function generateAIFlashcards(
    notes: string
): Promise<FlashcardCard[]> {
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5082';
    const res = await fetch(`${API_BASE}/api/flashcards/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to generate flashcards');
    }

    return res.json();
}
