'use client';

import { FeatureCard } from '@/components/web/FeatureCard';
import { useState } from 'react';

export default function HiveAi() {
    const [activeFeature, setActiveFeature] = useState<string | null>(null);

    const features = [
        { title: 'FlashCards', description: 'Generate study notes instantly.' },
        { title: 'Summarizer', description: 'Summarize any text quickly.' },
        { title: 'Quiz Maker', description: 'Create quizzes from your notes.' },
    ];

    if (activeFeature) {
        return (
            <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">{activeFeature}</h2>
                <p className="text-muted-foreground mb-6">
                    This is where the component for {activeFeature} will be
                    displayed.
                </p>
                <button
                    className="px-4 py-2 bg-blue-500 text-white rounded"
                    onClick={() => setActiveFeature(null)}
                >
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="px-4 md:px-0">
            <section className="mt-12 mb-10 text-center">
                <h1 className="text-4xl font-bold mb-5">
                    Hive AI — your all-in-one AI assistant
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    Hive AI is an assistant designed to help students make their
                    lives easier. It comes with a variety of features that make
                    studying simpler and more efficient.
                </p>
            </section>

            <div className="flex gap-4 overflow-x-auto py-6">
                {features.map((feature) => (
                    <FeatureCard
                        key={feature.title}
                        title={feature.title}
                        description={feature.description}
                        onClick={() => setActiveFeature(feature.title)}
                    />
                ))}
            </div>
        </div>
    );
}
