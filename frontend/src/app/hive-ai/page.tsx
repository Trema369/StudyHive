'use client';

import { FlashCardPage } from '@/components/web/FlashCardPage';
import { FeatureCard } from '@/components/web/FeatureCard';
import { JSX, useState } from 'react';
import { SummarizerCardPage } from '@/components/web/SummarizerCardPage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function HiveAi() {
    const [activeFeature, setActiveFeature] = useState<null | JSX.Element>(
        null
    );

    const features = [
        {
            title: 'FlashCards',
            description: 'Generate study notes instantly.',
            component: <FlashCardPage />,
        },
        {
            title: 'Summarizer',
            description: 'Summarize any text quickly.',
            component: <SummarizerCardPage />,
        },
        { title: 'Quiz Maker', description: 'Create quizzes from your notes.' },
    ];

    if (activeFeature) {
        return (
            <div className="p-6 relative">
                {/* Back Button */}
                <button
                    onClick={() => setActiveFeature(null)}
                    className="absolute top-4 left-4 px-4 py-2 rounded-md bg-muted hover:bg-muted/70 transition"
                >
                    ← Back
                </button>

                {/* Feature Content */}
                <div className="pt-12">{activeFeature}</div>
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
            <div className="flex gap-4 overflow-x-auto py-6 justify-center">
                {features.map((feature) => (
                    <FeatureCard
                        key={feature.title}
                        title={feature.title}
                        description={feature.description}
                        onClick={() =>
                            setActiveFeature(
                                feature.component ?? <p>Coming soon</p>
                            )
                        }
                    />
                ))}
            </div>
            <section className="mt-15 mb-10">
                <p className="text-lg text-center text-muted-foreground mb-2">
                    Simply start session with ai by clicking one of the feature
                    cards
                </p>
            </section>
            <Separator className="max-w-4xl mx-auto mb-20 " />
            <section className="mb-30">
                <div>
                    <Card
                        style={{ backgroundColor: '#111111' }}
                        className="max-w-4xl mx-auto p-6"
                    >
                        <div className="flex flex-col gap-6">
                            <div className="flex flex-col justify-center items-center text-center">
                                <h2 className="text-2xl font-semibold mb-3">
                                    Why use HiveAi?
                                </h2>
                                <p className="text-muted-foreground max-w-md">
                                    Our platform is designed to make learning
                                    resources accessible to any and every
                                    student around the world, hence making
                                    resources available for students in all
                                    parts of the world.
                                </p>
                            </div>

                            {/* Cards below, side by side */}
                            <div className="flex flex-row gap-4 justify-center flex-wrap">
                                <Card
                                    style={{ backgroundColor: '#0e0e0e' }}
                                    className="p-4 w-60"
                                >
                                    <CardHeader>
                                        <CardTitle>First</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p>
                                            Notes are saved in and can be
                                            accessed in our Notes. Students can
                                            donate to the uploader as a thank
                                            you if they can.
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card
                                    style={{ backgroundColor: '#0e0e0e' }}
                                    className="p-4 w-60"
                                >
                                    <CardHeader>
                                        <CardTitle>Second</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p>
                                            Books are saved in and can be
                                            accessed in our library. Students
                                            can donate to the uploader as a
                                            thank you if they can.
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card
                                    style={{ backgroundColor: '#0e0e0e' }}
                                    className="p-4 w-60"
                                >
                                    <CardHeader>
                                        <CardTitle>Third</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p>
                                            Videos are saved in and can be
                                            accessed in our Courses section.
                                            Students can donate to the uploader
                                            as a thank you if they can.
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </Card>
                </div>
            </section>
        </div>
    );
}
