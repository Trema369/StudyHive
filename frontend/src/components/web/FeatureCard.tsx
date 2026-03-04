'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FeatureCardProps {
    title: string;
    description: string;
    onClick: () => void;
}

export function FeatureCard({ title, description, onClick }: FeatureCardProps) {
    return (
        <Card
            className="cursor-pointer hover:shadow-lg transition-all w-64"
            onClick={onClick}
        >
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">{description}</p>
            </CardContent>
        </Card>
    );
}
