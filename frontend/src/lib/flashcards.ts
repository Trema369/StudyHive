// frontend/utils/api.ts
export interface AIFlashcardRequest {
    notes: string;
}

export interface FlashcardCard {
    front: string;
    back: string;
    flashcardId?: string;
    id?: string;
}

// frontend/utils/api.ts
export async function generateAIFlashcards(
    notes: string
): Promise<FlashcardCard[]> {
    const res = await fetch('http://localhost:5082/api/flashcards/generate', {
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
