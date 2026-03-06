'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import {
    GraduationCap,
    Users,
    Sparkles,
    BookOpen,
    Globe,
    Github,
    Twitter,
} from 'lucide-react';

export default function Coaching() {
    const [form, setForm] = useState({
        name: '',
        email: '',
        subject: '',
        experience: '',
        links: '',
    });

    const benefits = [
        {
            icon: <Users className="h-5 w-5 text-blue-500" />,
            title: 'Teach Students Worldwide',
            desc: 'Help students from around the world understand difficult concepts and succeed in their studies.',
            accent: '#3b82f6',
        },
        {
            icon: <BookOpen className="h-5 w-5 text-green-500" />,
            title: 'Share Your Knowledge',
            desc: 'Create lessons, answer questions, and guide learners through complex topics.',
            accent: '#10b981',
        },
        {
            icon: <Sparkles className="h-5 w-5 text-purple-500" />,
            title: 'Build Your Reputation',
            desc: 'Become recognized in the StudyHive community and grow your personal teaching brand.',
            accent: '#8b5cf6',
        },
    ];

    return (
        <div className="min-h-screen flex flex-col">
            <main className="flex-1">
                {/* Hero */}
                <section className="w-full max-w-4xl mx-auto px-6 pt-32 pb-16 text-center space-y-4">
                    <Badge
                        variant="outline"
                        className="gap-1.5 border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-400"
                    >
                        <GraduationCap className="h-3 w-3" />
                        Become a StudyHive Coach
                    </Badge>

                    <h1 className="text-4xl font-extrabold tracking-tight">
                        Teach and inspire students
                    </h1>

                    <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
                        Share your knowledge, help students succeed, and join
                        our community of educators helping learners around the
                        world.
                    </p>
                </section>

                {/* Application Form */}
                <section className="w-full max-w-4xl mx-auto px-6 pb-10">
                    <Card className="p-6">
                        <CardHeader className="px-0 pt-0 pb-4">
                            <CardTitle className="text-base">
                                Coaching Application
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Tell us about yourself and your teaching
                                experience.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="px-0 pb-0 space-y-4">
                            <Input
                                placeholder="Full Name"
                                value={form.name}
                                onChange={(e) =>
                                    setForm({ ...form, name: e.target.value })
                                }
                            />

                            <Input
                                placeholder="Email Address"
                                value={form.email}
                                onChange={(e) =>
                                    setForm({ ...form, email: e.target.value })
                                }
                            />

                            <Input
                                placeholder="Subject(s) you want to teach (e.g. Mathematics, Physics)"
                                value={form.subject}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        subject: e.target.value,
                                    })
                                }
                            />

                            <Textarea
                                placeholder="Describe your teaching experience or qualifications"
                                value={form.experience}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        experience: e.target.value,
                                    })
                                }
                            />

                            <Textarea
                                placeholder="Portfolio, LinkedIn, YouTube, or other links (optional)"
                                value={form.links}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        links: e.target.value,
                                    })
                                }
                            />

                            <Button className="w-full">
                                Submit Application
                            </Button>
                        </CardContent>
                    </Card>

                    <p className="text-center text-sm text-muted-foreground mt-4">
                        Our team reviews every application carefully.
                    </p>
                </section>

                <div className="w-full max-w-4xl mx-auto px-6">
                    <Separator />
                </div>

                {/* Benefits */}
                <section className="w-full max-w-4xl mx-auto px-6 py-16 space-y-8">
                    <div className="text-center space-y-2">
                        <Badge variant="secondary">Why become a coach</Badge>

                        <h2 className="text-2xl font-extrabold tracking-tight">
                            Make an impact through teaching
                        </h2>

                        <p className="text-muted-foreground text-sm max-w-lg mx-auto">
                            StudyHive connects passionate educators with
                            students who need guidance and support.
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
                                        style={{
                                            background: `${accent}20`,
                                            color: accent,
                                        }}
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

            {/* Footer */}
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
                    ].map(({ label, links }: any) => (
                        <div key={label} className="space-y-3">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {label}
                            </p>

                            <ul className="space-y-2">
                                {links.map((item: string) => (
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
