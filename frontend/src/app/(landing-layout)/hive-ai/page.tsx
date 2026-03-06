'use client';

import Link from 'next/link';
import Image from 'next/image';
import { FlashCardPage } from '@/components/web/FlashCardPage';
import { FeatureCard } from '@/components/web/FeatureCard';
import { JSX, useState } from 'react';
import { SummarizerCardPage } from '@/components/web/SummarizerCardPage';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    ArrowLeft,
    Sparkles,
    FlipHorizontal,
    FileText,
    HelpCircle,
    Zap,
    Globe,
    Brain,
    Github,
    Twitter,
} from 'lucide-react';

export default function HiveAi() {
    const [activeFeature, setActiveFeature] = useState<null | JSX.Element>(
        null
    );

    const features = [
        {
            title: 'FlashCards',
            description:
                'Generate flashcard decks instantly from your notes using AI.',
            icon: <FlipHorizontal className="h-5 w-5" />,
            accent: '#3b82f6',
            component: <FlashCardPage />,
        },
        {
            title: 'Summarizer',
            description:
                'Paste any text and get a clean, concise summary in seconds.',
            icon: <FileText className="h-5 w-5" />,
            accent: '#10b981',
            component: <SummarizerCardPage />,
        },
        {
            title: 'Quiz Maker',
            description: 'Turn your notes into a quiz to test your knowledge.',
            icon: <HelpCircle className="h-5 w-5" />,
            accent: '#8b5cf6',
            component: null,
        },
    ];

    const benefits = [
        {
            icon: <Zap className="h-5 w-5 text-yellow-500" />,
            title: 'Save Time',
            desc: 'Stop spending hours creating flashcards and summaries manually. Let AI do the heavy lifting so you can focus on actually learning.',
            accent: '#f59e0b',
        },
        {
            icon: <Brain className="h-5 w-5 text-blue-500" />,
            title: 'Study Smarter',
            desc: 'AI-generated content is structured for retention. Summaries cut out the fluff, and flashcards are formatted for active recall.',
            accent: '#3b82f6',
        },
        {
            icon: <Globe className="h-5 w-5 text-green-500" />,
            title: 'Always Available',
            desc: 'Hive AI is built directly into the platform — no switching tabs or apps. It lives where your notes and colonies already are.',
            accent: '#10b981',
        },
    ];

    if (activeFeature) {
        return (
            <div className="p-6 relative">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveFeature(null)}
                    className="mb-6 gap-2"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Hive AI
                </Button>
                <div>{activeFeature}</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col">
            <main className="flex-1">
                <section className="w-full max-w-4xl mx-auto px-6 pt-16 pb-12 text-center space-y-4">
                    <Badge
                        variant="outline"
                        className="gap-1.5 border-yellow-300 bg-yellow-50 text-yellow-700 dark:bg-yellow-950/40 dark:border-yellow-800 dark:text-yellow-400"
                    >
                        <Sparkles className="h-3 w-3" />
                        Powered by AI
                    </Badge>
                    <h1 className="text-4xl font-extrabold tracking-tight">
                        Hive AI — your all-in-one study assistant
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                        Hive AI is built to help students study smarter, not
                        harder. Generate flashcards, summarize notes, and create
                        quizzes — all in seconds.
                    </p>
                </section>

                <section className="w-full max-w-4xl mx-auto px-6 pb-6">
                    <div className="grid gap-4 sm:grid-cols-3">
                        {features.map((feature) => (
                            <Card
                                key={feature.title}
                                onClick={() =>
                                    setActiveFeature(
                                        feature.component ?? (
                                            <p className="text-muted-foreground text-sm">
                                                Coming soon!
                                            </p>
                                        )
                                    )
                                }
                                className="group relative overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                            >
                                <div
                                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                                    style={{
                                        background: `radial-gradient(circle at 0% 0%, ${feature.accent}18 0%, transparent 60%)`,
                                    }}
                                />
                                <CardHeader className="pb-2">
                                    <div
                                        className="flex h-10 w-10 items-center justify-center rounded-xl mb-1"
                                        style={{
                                            background: `${feature.accent}20`,
                                            color: feature.accent,
                                        }}
                                    >
                                        {feature.icon}
                                    </div>
                                    <CardTitle className="text-base">
                                        {feature.title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <CardDescription className="text-sm leading-relaxed">
                                        {feature.description}
                                    </CardDescription>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                    <p className="text-center text-sm text-muted-foreground mt-5">
                        Click any card above to start a session with Hive AI.
                    </p>
                </section>

                <div className="w-full max-w-4xl mx-auto px-6 py-6">
                    <Separator />
                </div>

                <section className="w-full max-w-4xl mx-auto px-6 pb-20 space-y-8">
                    <div className="text-center space-y-2">
                        <Badge variant="secondary" className="gap-1.5">
                            Why Hive AI?
                        </Badge>
                        <h2 className="text-2xl font-extrabold tracking-tight">
                            Built for how students actually study
                        </h2>
                        <p className="text-muted-foreground text-sm max-w-lg mx-auto">
                            Our platform is designed to make learning more
                            efficient for every student, regardless of where
                            they are in the world.
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        {benefits.map(({ icon, title, desc, accent }) => (
                            <Card
                                key={title}
                                className="group relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                            >
                                <div
                                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                                    style={{
                                        background: `radial-gradient(circle at 0% 0%, ${accent}15 0%, transparent 60%)`,
                                    }}
                                />
                                <CardHeader className="pb-2">
                                    <div
                                        className="flex h-10 w-10 items-center justify-center rounded-xl mb-1"
                                        style={{ background: `${accent}20` }}
                                    >
                                        {icon}
                                    </div>
                                    <CardTitle className="text-base">
                                        {title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <CardDescription className="text-sm leading-relaxed">
                                        {desc}
                                    </CardDescription>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>
            </main>

            <footer className="w-full border-t border-border bg-muted/30">
                <div className="max-w-6xl mx-auto px-6 py-12 grid gap-8 sm:grid-cols-2 md:grid-cols-4">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Image
                                src="/icon.png"
                                alt="StudyHive"
                                width={32}
                                height={32}
                                className="h-8 w-8 rounded-md"
                            />
                            <span className="font-extrabold text-lg">
                                <span className="text-yellow-400">Study</span>
                                <span className="text-foreground">Hive</span>
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            A collaborative learning platform for students and
                            teachers.
                        </p>
                    </div>

                    {[
                        {
                            label: 'Product',
                            links: [
                                'Colonies',
                                'Flashcards',
                                'Q&A',
                                'Leaderboard',
                                'Hive AI',
                            ],
                        },
                        {
                            label: 'Community',
                            links: ['Discord', 'Twitter', 'GitHub', 'Blog'],
                        },
                        {
                            label: 'Legal',
                            links: [
                                'Privacy Policy',
                                'Terms of Service',
                                'Cookie Policy',
                            ],
                        },
                    ].map(({ label, links }) => (
                        <div key={label} className="space-y-3">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {label}
                            </p>
                            <ul className="space-y-2">
                                {links.map((item) => (
                                    <li key={item}>
                                        <Link
                                            href="#"
                                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {item}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <Separator />

                <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
                    <p className="text-xs text-muted-foreground">
                        © {new Date().getFullYear()} StudyHive. All rights
                        reserved.
                    </p>
                    <div className="flex items-center gap-3">
                        {[Twitter, Github, Globe].map((Icon, i) => (
                            <Link
                                key={i}
                                href="#"
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <Icon className="h-4 w-4" />
                            </Link>
                        ))}
                    </div>
                </div>
            </footer>
        </div>
    );
}
