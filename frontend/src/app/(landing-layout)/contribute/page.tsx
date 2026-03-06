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
import { FileDropzone } from '@/components/web/Dropzone';
import { useState } from 'react';
import {
    Upload,
    FileText,
    BookOpen,
    Video,
    Github,
    Twitter,
    Globe,
    Heart,
} from 'lucide-react';

export default function Contribute() {
    const [attachments, setAttachments] = useState<string[]>([]);
    const supportedTypes = ['pdf', 'txt', 'doc', 'ppt', 'xls', 'docx', 'md'];

    const handleUploadedFiles = async (files: string[]) => {
        setAttachments((prev) => [...prev, ...files]);
    };

    const categories = [
        {
            icon: <FileText className="h-5 w-5 text-blue-500" />,
            title: 'Notes',
            desc: 'Notes are saved and accessible in our Notes section. Students can donate to the uploader as a thank you.',
            accent: '#3b82f6',
        },
        {
            icon: <BookOpen className="h-5 w-5 text-green-500" />,
            title: 'Books',
            desc: 'Books are saved and accessible in our Library. Students can donate to the uploader as a thank you.',
            accent: '#10b981',
        },
        {
            icon: <Video className="h-5 w-5 text-purple-500" />,
            title: 'Video Courses',
            desc: 'Videos are saved and accessible in our Courses section. Students can donate to the uploader as a thank you.',
            accent: '#8b5cf6',
        },
    ];

    return (
        <div className="min-h-screen flex flex-col">
            <main className="flex-1">
                {/* ── Hero ── */}
                <section className="w-full max-w-4xl mx-auto px-6 pt-32 pb-16 text-center space-y-4">
                    <Badge
                        variant="outline"
                        className="gap-1.5 border-yellow-300 bg-yellow-50 text-yellow-700 dark:bg-yellow-950/40 dark:border-yellow-800 dark:text-yellow-400"
                    >
                        <Heart className="h-3 w-3" />
                        Help students worldwide
                    </Badge>
                    <h1 className="text-4xl font-extrabold tracking-tight">
                        Contribute to our growing collection
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
                        Someone out there is searching for your document. Share
                        knowledge with everyone and help students who need it
                        most.
                    </p>
                </section>

                {/* ── Dropzone ── */}
                <section className="w-full max-w-4xl mx-auto px-6 pb-10">
                    <Card className="p-6">
                        <CardHeader className="px-0 pt-0 pb-4">
                            <div className="flex items-center gap-2">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-100 dark:bg-yellow-950/40">
                                    <Upload className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                                </div>
                                <div>
                                    <CardTitle className="text-base">
                                        Upload your files
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Supported: {supportedTypes.join(', ')}{' '}
                                        and many more
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="px-0 pb-0">
                            <FileDropzone
                                onUploadComplete={handleUploadedFiles}
                            />

                            {attachments.length > 0 && (
                                <div className="mt-5 space-y-2">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        Uploaded · {attachments.length} file
                                        {attachments.length > 1 ? 's' : ''}
                                    </p>
                                    <div className="rounded-xl border border-border divide-y divide-border">
                                        {attachments.map((file, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center gap-3 px-4 py-2.5"
                                            >
                                                <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                                <span className="text-sm text-muted-foreground truncate">
                                                    {file.slice(0, 80)}
                                                    {file.length > 80
                                                        ? '...'
                                                        : ''}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <p className="text-center text-sm text-muted-foreground mt-4">
                        By uploading, you help thousands of students who cant
                        afford learning materials.
                    </p>
                </section>

                <div className="w-full max-w-4xl mx-auto px-6">
                    <Separator />
                </div>

                {/* ── What happens section ── */}
                <section className="w-full max-w-4xl mx-auto px-6 py-16 space-y-8">
                    <div className="text-center space-y-2">
                        <Badge variant="secondary" className="gap-1.5">
                            What happens to your files
                        </Badge>
                        <h2 className="text-2xl font-extrabold tracking-tight">
                            Your uploads make a real difference
                        </h2>
                        <p className="text-muted-foreground text-sm max-w-lg mx-auto">
                            Our platform is designed to make learning resources
                            accessible to every student around the world.
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        {categories.map(({ icon, title, desc, accent }) => (
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

            {/* ── Footer ── */}
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
