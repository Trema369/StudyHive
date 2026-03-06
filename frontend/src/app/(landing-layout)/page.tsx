'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { AuthCard } from '@/components/web/AuthCard';
import { cn } from '@/lib/utils';
import {
    Users,
    Sparkles,
    MessageSquare,
    Trophy,
    FileText,
    Github,
    Twitter,
    Globe,
    Layers,
    Brain,
    FlipHorizontal,
} from 'lucide-react';

function StackedCards() {
    const cards = [
        {
            icon: <Brain className="h-5 w-5 text-yellow-500" />,
            title: 'Hive AI',
            desc: "Ask anything and get smart answers powered by AI trained on your colony's knowledge.",
            className:
                'border-yellow-200 dark:border-yellow-800 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/40 dark:to-orange-950/30',
        },
        {
            icon: <FlipHorizontal className="h-5 w-5 text-blue-500" />,
            title: 'Flashcards',
            desc: 'Create and share flashcard decks. Study smarter with AI-generated cards from your notes.',
            className:
                'border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-950/40 dark:to-sky-950/30',
        },
        {
            icon: <Trophy className="h-5 w-5 text-purple-500" />,
            title: 'Leaderboard',
            desc: 'Compete with classmates, earn points for contributions, and climb colony rankings.',
            className:
                'border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/40 dark:to-violet-950/30',
        },
    ];

    return (
        <div className="relative w-[300px] h-[210px] flex-shrink-0">
            {cards.map((card, i) => (
                <Card
                    key={i}
                    className={cn(
                        'absolute w-full transition-all duration-500 cursor-default',
                        'hover:z-40 hover:!translate-x-0 hover:!translate-y-0 hover:shadow-xl',
                        card.className
                    )}
                    style={{
                        zIndex: 30 - i * 10,
                        transform: `translateX(${i * 12}px) translateY(${i * 12}px)`,
                    }}
                >
                    <CardHeader className="pb-1 pt-4 px-4">
                        <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/70 dark:bg-black/20 shadow-sm">
                                {card.icon}
                            </div>
                            <CardTitle className="text-sm">
                                {card.title}
                            </CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <CardDescription className="text-xs leading-relaxed">
                            {card.desc}
                        </CardDescription>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

function FeatureCard({
    icon,
    title,
    desc,
    accent,
}: {
    icon: React.ReactNode;
    title: string;
    desc: string;
    accent: string;
}) {
    return (
        <Card className="group relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
            <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{
                    background: `radial-gradient(circle at 0% 0%, ${accent}18 0%, transparent 60%)`,
                }}
            />
            <CardHeader className="pb-2">
                <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl mb-1"
                    style={{ background: `${accent}20`, color: accent }}
                >
                    {icon}
                </div>
                <CardTitle className="text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <CardDescription className="text-sm leading-relaxed">
                    {desc}
                </CardDescription>
            </CardContent>
        </Card>
    );
}

export default function Home() {
    const [authOpen, setAuthOpen] = useState(false);

    const features = [
        {
            icon: <Users className="h-5 w-5" />,
            title: 'Colonies',
            desc: 'Create or join themed study colonies — think subreddits, but for learning. Each colony has its own resources, discussions, and members.',
            accent: '#f59e0b',
        },
        {
            icon: <MessageSquare className="h-5 w-5" />,
            title: 'Q&A Threads',
            desc: 'Ask questions and get answers from peers and teachers. Upvote the best answers, just like Reddit — but focused on education.',
            accent: '#3b82f6',
        },
        {
            icon: <FileText className="h-5 w-5" />,
            title: 'Resource Sharing',
            desc: 'Share notes, documents, and study materials with your colony. Keep everything organized and accessible to everyone.',
            accent: '#10b981',
        },
        {
            icon: <Brain className="h-5 w-5" />,
            title: 'Hive AI',
            desc: 'An AI assistant that lives inside your chats and colonies. Ask it to summarize notes, generate flashcards, or explain concepts.',
            accent: '#f59e0b',
        },
        {
            icon: <FlipHorizontal className="h-5 w-5" />,
            title: 'Flashcards',
            desc: 'Build flashcard decks manually or let AI generate them from your notes. Share decks with your colony or keep them private.',
            accent: '#8b5cf6',
        },
        {
            icon: <Trophy className="h-5 w-5" />,
            title: 'Leaderboard',
            desc: 'Earn points by contributing resources, answering questions, and helping others. Compete with classmates and track your progress.',
            accent: '#ef4444',
        },
    ];

    const faqs = [
        {
            q: 'What is a Colony?',
            a: 'A Colony is a shared learning space — like a classroom or study group. You can create one for your subject, grade, or school, then invite students and teachers to join, share resources, and discuss topics together.',
        },
        {
            q: 'Is StudyHive free to use?',
            a: 'Yes! StudyHive is free for students and teachers. You can create colonies, share resources, and access all core features at no cost.',
        },
        {
            q: 'How does the AI assistant work?',
            a: "Hive AI is built into your chats and colonies. You can ask it questions, have it summarize your notes, generate flashcard decks, or explain difficult concepts — all within the context of your colony's content.",
        },
        {
            q: 'Can teachers create private colonies?',
            a: 'Yes. When creating a colony you can set it to private, meaning students can only join with an invite code. Public colonies are discoverable by anyone on the platform.',
        },
        {
            q: 'How are flashcards different from regular notes?',
            a: 'Flashcards are structured front/back cards designed for active recall. You can create them manually, generate them from notes using AI, and share entire decks with your colony for collaborative studying.',
        },
        {
            q: 'Can I use StudyHive for any subject?',
            a: "Absolutely. StudyHive is subject-agnostic — whether you're studying maths, history, programming, or medicine, you can create a colony and share relevant resources.",
        },
    ];

    return (
        <main className="min-h-screen flex flex-col">
            <section className="w-full max-w-6xl mx-auto px-6 pt-32 pb-24 flex flex-col md:flex-row items-center gap-16">
                <div className="flex-1 max-w-xl">
                    <Badge
                        variant="outline"
                        className="mb-6 gap-1.5 border-yellow-300 bg-yellow-50 text-yellow-700 dark:bg-yellow-950/40 dark:border-yellow-800 dark:text-yellow-400"
                    >
                        <Sparkles className="h-3 w-3" />
                        Where students become teachers
                    </Badge>

                    <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.1] mb-5">
                        Learn together,{' '}
                        <span className="text-yellow-400">grow</span> together
                        with <span className="text-yellow-400">StudyHive</span>.
                    </h1>

                    <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                        Create or join{' '}
                        <strong className="text-foreground">Colonies</strong> —
                        shared learning spaces where students and teachers share
                        resources, ask questions, and teach each other.
                    </p>

                    <div className="flex items-center gap-3 flex-wrap">
                        <Button
                            size="lg"
                            className="gap-2 bg-yellow-400 hover:bg-yellow-500 text-black font-bold"
                            onClick={() => setAuthOpen(true)}
                        >
                            <Sparkles className="h-4 w-4" />
                            Get Started Free
                        </Button>
                        <Link
                            href="/colonies"
                            className={cn(
                                buttonVariants({
                                    variant: 'outline',
                                    size: 'lg',
                                }),
                                'gap-2'
                            )}
                        >
                            <Globe className="h-4 w-4" />
                            Explore Colonies
                        </Link>
                    </div>
                </div>

                <div className="flex-shrink-0 flex items-center justify-center md:justify-end w-full md:w-auto">
                    <StackedCards />
                </div>
            </section>

            {/* ── Features ── */}
            <section className="w-full max-w-6xl mx-auto px-6 py-24 space-y-12">
                <div className="text-center space-y-3 max-w-xl mx-auto">
                    <Badge variant="secondary" className="gap-1.5">
                        <Layers className="h-3 w-3" />
                        Everything you need
                    </Badge>
                    <h2 className="text-3xl font-extrabold tracking-tight">
                        Built for how students actually learn
                    </h2>
                    <p className="text-muted-foreground">
                        StudyHive combines the best of Reddit, Notion, and AI
                        tutoring into one collaborative platform.
                    </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {features.map((f) => (
                        <FeatureCard key={f.title} {...f} />
                    ))}
                </div>
            </section>

            <section className="w-full bg-muted/40 border-y border-border py-24">
                <div className="max-w-6xl mx-auto px-6 space-y-12">
                    <div className="text-center space-y-3 max-w-xl mx-auto">
                        <h2 className="text-3xl font-extrabold tracking-tight">
                            Get started in minutes
                        </h2>
                        <p className="text-muted-foreground">
                            No complicated setup. Just sign up and start
                            learning.
                        </p>
                    </div>
                    <div className="grid gap-6 md:grid-cols-3">
                        {[
                            {
                                step: '01',
                                title: 'Create your account',
                                desc: 'Sign up for free in seconds. No credit card required.',
                                color: 'text-yellow-500',
                            },
                            {
                                step: '02',
                                title: 'Join or create a Colony',
                                desc: 'Find a colony for your subject or create your own and invite classmates.',
                                color: 'text-blue-500',
                            },
                            {
                                step: '03',
                                title: 'Learn together',
                                desc: 'Share notes, ask questions, use AI, and help each other grow.',
                                color: 'text-green-500',
                            },
                        ].map(({ step, title, desc, color }) => (
                            <Card key={step} className="bg-background">
                                <CardHeader>
                                    <span
                                        className={cn(
                                            'text-5xl font-black opacity-20 leading-none',
                                            color
                                        )}
                                    >
                                        {step}
                                    </span>
                                    <CardTitle className="text-base mt-2">
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
                </div>
            </section>

            {/* ── FAQ ── */}
            <section className="w-full max-w-3xl mx-auto px-6 py-24 space-y-10">
                <div className="text-center space-y-3">
                    <h2 className="text-3xl font-extrabold tracking-tight">
                        Frequently asked questions
                    </h2>
                    <p className="text-muted-foreground">
                        Everything you need to know about StudyHive.
                    </p>
                </div>
                <Accordion
                    type="single"
                    collapsible
                    className="rounded-2xl border border-border bg-card px-6"
                >
                    {faqs.map((faq, i) => (
                        <AccordionItem key={i} value={`item-${i}`}>
                            <AccordionTrigger className="text-sm font-medium text-left">
                                {faq.q}
                            </AccordionTrigger>
                            <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                                {faq.a}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </section>

            <section className="w-full max-w-6xl mx-auto px-6 pb-24">
                <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-yellow-400 to-orange-400 p-12 text-center">
                    <div
                        className="absolute inset-0 opacity-10 pointer-events-none"
                        style={{
                            backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
                            backgroundSize: '32px 32px',
                        }}
                    />
                    <div className="relative z-10 space-y-4 max-w-xl mx-auto">
                        <h2 className="text-3xl font-extrabold text-black tracking-tight">
                            Ready to join the hive?
                        </h2>
                        <p className="text-black/70 font-medium">
                            Start learning with your colony today. Free forever.
                        </p>
                        <Button
                            size="lg"
                            className="bg-black text-white hover:bg-black/80 font-bold gap-2"
                            onClick={() => setAuthOpen(true)}
                        >
                            <Sparkles className="h-4 w-4" />
                            Get Started Free
                        </Button>
                    </div>
                </Card>
            </section>

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

            <AuthCard open={authOpen} setOpen={setAuthOpen} />
        </main>
    );
}
