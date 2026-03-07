'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { JSX, useState } from 'react'
import { SummarizerCardPage } from '@/components/web/SummarizerCardPage'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import {
    ArrowLeft,
    FlipHorizontal,
    FileText,
    HelpCircle,
    Zap,
    Globe,
    Brain,
    Github,
    Twitter,
    ArrowRight,
} from 'lucide-react'

export default function Materials() {
    const router = useRouter()
    const [activeFeature, setActiveFeature] = useState<null | JSX.Element>(null)

    const features = [
        {
            title: 'FlashCards',
            description:
                'Generate and flip through AI-powered cards built from your notes.',
            icon: <FlipHorizontal className="h-6 w-6" />,
            accent: '#f59e0b',
            tag: 'Active Recall',
            // Navigate to the flashcards page instead of rendering inline
            href: '/flashcards',
            component: null,
        },
        {
            title: 'Notes',
            description: 'Review and edit your summarized notes with AI assistance.',
            icon: <FileText className="h-6 w-6" />,
            accent: '#10b981',
            tag: 'Summarizer',
            href: null,
            component: <SummarizerCardPage />,
        },
        {
            title: 'Quiz Maker',
            description:
                'Transform your notes into quizzes that test your knowledge.',
            icon: <HelpCircle className="h-6 w-6" />,
            accent: '#8b5cf6',
            tag: 'Coming Soon',
            href: null,
            component: null,
        },
    ]

    const benefits = [
        {
            icon: <Zap className="h-5 w-5" />,
            title: 'Save Time',
            desc: 'Stop spending hours creating flashcards manually. Let AI do the heavy lifting so you can focus on learning.',
            color: '#f59e0b',
        },
        {
            icon: <Brain className="h-5 w-5" />,
            title: 'Study Smarter',
            desc: 'AI-generated content is structured for retention — summaries cut the fluff, flashcards drive active recall.',
            color: '#3b82f6',
        },
        {
            icon: <Globe className="h-5 w-5" />,
            title: 'Always Available',
            desc: 'Hive AI is built directly into the platform — no switching tabs. It lives where your notes already are.',
            color: '#10b981',
        },
    ]

    if (activeFeature) {
        return (
            <div className="min-h-screen bg-[#0c0a08] p-6 relative">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveFeature(null)}
                    className="mb-6 gap-2 text-amber-400 hover:text-amber-300 hover:bg-amber-400/10"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Hive AI
                </Button>
                <div>{activeFeature}</div>
            </div>
        )
    }

    return (
        <div
            className="min-h-screen flex flex-col"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Fraunces:ital,wght@0,700;0,900;1,700&display=swap');

                .feature-card {
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.07);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                    overflow: hidden;
                    text-decoration: none;
                    display: block;
                }
                .feature-card::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                    pointer-events: none;
                }
                .feature-card:hover {
                    transform: translateY(-4px);
                    border-color: rgba(255,255,255,0.15);
                    box-shadow: 0 20px 60px -10px rgba(0,0,0,0.5);
                    cursor: pointer;
                }
                .feature-card:hover::before { opacity: 1; }
                .card-1:hover::before { background: radial-gradient(circle at 30% 20%, rgba(245,158,11,0.12) 0%, transparent 60%); }
                .card-2:hover::before { background: radial-gradient(circle at 30% 20%, rgba(16,185,129,0.12) 0%, transparent 60%); }
                .card-3:hover::before { background: radial-gradient(circle at 30% 20%, rgba(139,92,246,0.12) 0%, transparent 60%); }
                .arrow-icon { transition: transform 0.2s ease; }
                .feature-card:hover .arrow-icon { transform: translateX(4px); }
                .benefit-item {
                    border-left: 1px solid rgba(255,255,255,0.06);
                    padding-left: 1.5rem;
                }
                .footer-link {
                    color: rgba(255,255,255,0.4);
                    transition: color 0.2s ease;
                    font-size: 0.875rem;
                }
                .footer-link:hover { color: rgba(255,255,255,0.85); }
                .tag {
                    font-size: 0.65rem;
                    letter-spacing: 0.08em;
                    text-transform: uppercase;
                    font-weight: 600;
                    padding: 2px 8px;
                    border-radius: 999px;
                }
                .divider-line {
                    height: 1px;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
                }
                .hero-glow {
                    background: radial-gradient(ellipse 80% 50% at 50% -10%, rgba(251,191,36,0.15) 0%, transparent 70%);
                }
            `}</style>

            <main className="flex-1">
                {/* Hero */}
                <div className="hero-glow">
                    <section className="w-full max-w-3xl mx-auto px-6 pt-20 pb-14 text-center">
                        <h1
                            style={{
                                fontFamily: "'Fraunces', serif",
                                fontSize: 'clamp(2.5rem, 6vw, 4rem)',
                                fontWeight: 900,
                                color: '#fafaf9',
                                lineHeight: 1.1,
                                letterSpacing: '-0.02em',
                                marginBottom: '1rem',
                            }}
                        >
                            Your study hub, <span style={{ color: '#fbbf24' }}>amplified.</span>
                        </h1>
                        <p
                            style={{
                                color: 'rgba(255,255,255,0.45)',
                                fontSize: '1.05rem',
                                lineHeight: 1.7,
                                maxWidth: '520px',
                                margin: '0 auto',
                            }}
                        >
                            Flashcards, notes, and quizzes — all generated from your material
                            and ready when you are.
                        </p>
                    </section>
                </div>

                {/* Feature Cards */}
                <section className="w-full max-w-4xl mx-auto px-6 pb-16">
                    <div className="grid gap-4 sm:grid-cols-3">
                        {features.map((feature, i) => {
                            const inner = (
                                <>
                                    <div
                                        className="flex h-12 w-12 items-center justify-center rounded-xl mb-4"
                                        style={{
                                            background: `${feature.accent}15`,
                                            color: feature.accent,
                                        }}
                                    >
                                        {feature.icon}
                                    </div>
                                    <span
                                        className="tag mb-3 inline-block"
                                        style={{
                                            background: `${feature.accent}15`,
                                            color: feature.accent,
                                        }}
                                    >
                                        {feature.tag}
                                    </span>
                                    <h3
                                        style={{
                                            fontFamily: "'Fraunces', serif",
                                            fontSize: '1.3rem',
                                            fontWeight: 700,
                                            color: '#fafaf9',
                                            marginBottom: '0.5rem',
                                        }}
                                    >
                                        {feature.title}
                                    </h3>
                                    <p
                                        style={{
                                            color: 'rgba(255,255,255,0.4)',
                                            fontSize: '0.875rem',
                                            lineHeight: 1.65,
                                            marginBottom: '1.25rem',
                                        }}
                                    >
                                        {feature.description}
                                    </p>
                                    <div
                                        className="flex items-center gap-1"
                                        style={{
                                            color: feature.accent,
                                            fontSize: '0.8rem',
                                            fontWeight: 600,
                                        }}
                                    >
                                        Open <ArrowRight className="h-3.5 w-3.5 arrow-icon" />
                                    </div>
                                </>
                            )

                            // FlashCards → navigate to /flashcards
                            if (feature.href) {
                                return (
                                    <Link
                                        key={feature.title}
                                        href={feature.href}
                                        className={`feature-card card-${i + 1} rounded-2xl p-6`}
                                    >
                                        {inner}
                                    </Link>
                                )
                            }

                            // Others → render inline
                            return (
                                <div
                                    key={feature.title}
                                    className={`feature-card card-${i + 1} rounded-2xl p-6`}
                                    onClick={() =>
                                        setActiveFeature(
                                            feature.component ?? (
                                                <p
                                                    style={{
                                                        color: 'rgba(255,255,255,0.4)',
                                                        fontSize: '0.9rem',
                                                    }}
                                                >
                                                    Coming soon!
                                                </p>
                                            ),
                                        )
                                    }
                                >
                                    {inner}
                                </div>
                            )
                        })}
                    </div>
                </section>

                <div className="divider-line max-w-4xl mx-auto px-6 mb-16" />

                {/* Benefits */}
                <section className="w-full max-w-4xl mx-auto px-6 pb-20">
                    <p
                        style={{
                            fontSize: '0.7rem',
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            color: 'rgba(255,255,255,0.3)',
                            fontWeight: 600,
                            marginBottom: '2.5rem',
                        }}
                    >
                        Why Hive AI
                    </p>
                    <div className="grid gap-8 sm:grid-cols-3">
                        {benefits.map((b) => (
                            <div
                                key={b.title}
                                className="benefit-item"
                                style={{ borderColor: b.color + '30' }}
                            >
                                <div
                                    className="flex h-9 w-9 items-center justify-center rounded-lg mb-4"
                                    style={{ background: b.color + '15', color: b.color }}
                                >
                                    {b.icon}
                                </div>
                                <h4
                                    style={{
                                        fontFamily: "'Fraunces', serif",
                                        fontSize: '1.05rem',
                                        fontWeight: 700,
                                        color: '#fafaf9',
                                        marginBottom: '0.5rem',
                                    }}
                                >
                                    {b.title}
                                </h4>
                                <p
                                    style={{
                                        color: 'rgba(255,255,255,0.38)',
                                        fontSize: '0.85rem',
                                        lineHeight: 1.7,
                                    }}
                                >
                                    {b.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer
                style={{
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    background: 'rgba(255,255,255,0.01)',
                }}
            >
                <div className="max-w-6xl mx-auto px-6 py-12 grid gap-10 sm:grid-cols-2 md:grid-cols-4">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Image
                                src="/icon.png"
                                alt="StudyHive"
                                width={32}
                                height={32}
                                className="h-8 w-8 rounded-md"
                            />
                            <span
                                style={{
                                    fontFamily: "'Fraunces', serif",
                                    fontWeight: 700,
                                    fontSize: '1.1rem',
                                    color: '#fafaf9',
                                }}
                            >
                                <span style={{ color: '#fbbf24' }}>Study</span>Hive
                            </span>
                        </div>
                        <p
                            style={{
                                fontSize: '0.8rem',
                                color: 'rgba(255,255,255,0.3)',
                                lineHeight: 1.7,
                            }}
                        >
                            A collaborative learning platform for students and teachers.
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
                            links: ['Privacy Policy', 'Terms of Service', 'Cookie Policy'],
                        },
                    ].map(({ label, links }) => (
                        <div key={label} className="space-y-3">
                            <p
                                style={{
                                    fontSize: '0.65rem',
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.1em',
                                    color: 'rgba(255,255,255,0.25)',
                                }}
                            >
                                {label}
                            </p>
                            <ul className="space-y-2">
                                {links.map((item) => (
                                    <li key={item}>
                                        <Link href="#" className="footer-link">
                                            {item}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="divider-line" />

                <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)' }}>
                        © {new Date().getFullYear()} StudyHive. All rights reserved.
                    </p>
                    <div className="flex items-center gap-4">
                        {[Twitter, Github, Globe].map((Icon, i) => (
                            <Link
                                key={i}
                                href="#"
                                style={{
                                    color: 'rgba(255,255,255,0.25)',
                                    transition: 'color 0.2s',
                                }}
                                onMouseEnter={(e) =>
                                    (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')
                                }
                                onMouseLeave={(e) =>
                                    (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')
                                }
                            >
                                <Icon className="h-4 w-4" />
                            </Link>
                        ))}
                    </div>
                </div>
            </footer>
        </div>
    )
}
