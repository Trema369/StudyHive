import { useState } from 'react';
import { Card } from '../ui/card';

interface FlashCardProps {
    cardText: string;
}

export function FlashCard({ cardText }: FlashCardProps) {
    const [showBack, setShowBack] = useState(false);

    const [front, back] = cardText.split('\nBack: ');

    return (
        <Card
            className="flex flex-col justify-center items-center p-6 cursor-pointer w-60 h-40"
            onClick={() => setShowBack((prev) => !prev)}
        >
            <h2 className="text-center">
                {showBack ? back : front.replace('Front: ', '')}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
                {showBack ? 'Click to see Front' : 'Click to see Back'}
            </p>
        </Card>
    );
}
