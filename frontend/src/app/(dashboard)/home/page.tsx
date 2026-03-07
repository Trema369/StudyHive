'use client'

import Link from 'next/link'
import { useEffect, useState, useMemo } from 'react'
import { getAuthUser } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MarkdownContent } from '@/components/web/markdown-content'
import {
    FlipHorizontal,
    FileText,
    Compass,
    Globe,
    Lock,
    Hash,
    Search,
    Sparkles,
    ArrowRight,
    BookOpen,
    Users,
    Wand2,
    FolderOpen,
    ChevronRight,
    Plus,
    LogIn,
    DoorOpen,
    Star,
    TrendingUp,
} from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5082'

// ── Types ─────────────────────────────────────────────────────────────────────

type FlashcardSet = {
    id?: string
    userId?: string
    name?: string
    published?: boolean
    description?: string
    code?: string
}

type NoteGroup = {
    id?: string
    userId?: string
    name?: string
    description?: string
    labels?: string[]
    accentColor?: string
    isPublic?: boolean
    code?: string
}

type ClassItem = {
    id?: string
    name?: string
    description?: string
    userIds?: string[]
    teacherIds?: string[]
    code?: string
    isPublic?: boolean
    accentColor?: string
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({
    icon: Icon,
    label,
    count,
    href,
    linkLabel,
}: {
    icon: React.ElementType
    label: string
    count?: number
    href?: string
    linkLabel?: string
}) {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 14,
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div
                    style={{
                        width: 24,
                        height: 24,
                        borderRadius: 7,
                        background: 'rgba(251,191,36,0.1)',
                        border: '1px solid rgba(251,191,36,0.18)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Icon size={12} style={{ color: '#fbbf24' }} />
                </div>
                <span
                    style={{
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: 'rgba(255,255,255,0.7)',
                        letterSpacing: '0.01em',
                    }}
                >
                    {label}
                </span>
                {count !== undefined && (
                    <span
                        style={{
                            fontSize: '0.65rem',
                            padding: '1px 7px',
                            borderRadius: 999,
                            background: 'rgba(255,255,255,0.06)',
                            color: 'rgba(255,255,255,0.3)',
                            fontWeight: 600,
                        }}
                    >
                        {count}
                    </span>
                )}
            </div>
            {href && linkLabel && (
                <Link
                    href={href}
                    style={{
                        fontSize: '0.72rem',
                        color: 'rgba(255,255,255,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                        textDecoration: 'none',
                        transition: 'color 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#fbbf24')}
                    onMouseLeave={(e) =>
                        (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')
                    }
                >
                    {linkLabel} <ArrowRight size={10} />
                </Link>
            )}
        </div>
    )
}

// Colony card styled to match the dark amber system
function ColonyCard({
    item,
    accentColor,
    isPublic,
    code,
    description,
    href,
    badge,
    actions,
}: {
    item: string
    accentColor?: string
    isPublic?: boolean
    code?: string
    description?: string
    href?: string
    badge?: React.ReactNode
    actions?: React.ReactNode
}) {
    const accent = accentColor ?? '#fbbf24'
    const inner = (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                padding: '12px 14px 12px 18px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.065)',
                background: 'rgba(255,255,255,0.02)',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.2s',
                cursor: href ? 'pointer' : 'default',
            }}
            className="colony-row"
        >
            {/* Accent left bar */}
            <span
                style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 3,
                    borderRadius: '3px 0 0 3px',
                    background: accent,
                }}
            />

            <div
                style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 8,
                }}
            >
                <div
                    style={{
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        color: '#fafaf9',
                        lineHeight: 1.3,
                    }}
                >
                    {item}
                </div>
                {badge}
            </div>

            {description && (
                <MarkdownContent
                    className="prose prose-sm max-w-none line-clamp-2"
                    content={description}
                />
            )}

            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 2,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {code && (
                        <span
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                                fontSize: '0.67rem',
                                padding: '1px 7px',
                                borderRadius: 999,
                                background: 'rgba(255,255,255,0.05)',
                                color: 'rgba(255,255,255,0.28)',
                                fontFamily: 'monospace',
                            }}
                        >
                            <Hash size={8} />
                            {code}
                        </span>
                    )}
                    <span
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            fontSize: '0.67rem',
                            padding: '1px 7px',
                            borderRadius: 999,
                            background: 'rgba(255,255,255,0.04)',
                            color: isPublic ? '#34d399' : 'rgba(255,255,255,0.22)',
                        }}
                    >
                        {isPublic ? <Globe size={8} /> : <Lock size={8} />}
                        {isPublic ? 'Public' : 'Private'}
                    </span>
                </div>
                {actions}
            </div>
        </div>
    )

    return href ? (
        <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>
            {inner}
        </Link>
    ) : (
        inner
    )
}

function EmptyState({
    icon: Icon,
    message,
}: {
    icon: React.ElementType
    message: string
}) {
    return (
        <div
            style={{
                textAlign: 'center',
                padding: '2.2rem 1rem',
                color: 'rgba(255,255,255,0.18)',
                fontSize: '0.82rem',
            }}
        >
            <Icon size={26} style={{ margin: '0 auto 10px', opacity: 0.22 }} />
            {message}
        </div>
    )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function HomePage() {
    const [userId, setUserId] = useState('')
    const [search, setSearch] = useState('')

    // Personal data
    const [myFlashcards, setMyFlashcards] = useState<FlashcardSet[]>([])
    const [myNoteGroups, setMyNoteGroups] = useState<NoteGroup[]>([])
    const [myColonies, setMyColonies] = useState<ClassItem[]>([])

    // Public / discover data
    const [publicFlashcards, setPublicFlashcards] = useState<FlashcardSet[]>([])
    const [publicNoteGroups, setPublicNoteGroups] = useState<NoteGroup[]>([])
    const [publicColonies, setPublicColonies] = useState<ClassItem[]>([])

    const syncAuth = () => setUserId(getAuthUser()?.id ?? '')

    useEffect(() => {
        syncAuth()
        window.addEventListener('auth-changed', syncAuth)
        window.addEventListener('storage', syncAuth)
        return () => {
            window.removeEventListener('auth-changed', syncAuth)
            window.removeEventListener('storage', syncAuth)
        }
    }, [])

    // Load personal content
    useEffect(() => {
        if (!userId) return
        void (async () => {
            const [fcRes, ngRes, clRes] = await Promise.all([
                fetch(`${API_BASE}/api/flashcards/user/${userId}`),
                fetch(`${API_BASE}/api/notes/groups/${userId}`),
                fetch(`${API_BASE}/api/classes/user/${userId}`),
            ])
            if (fcRes.ok) setMyFlashcards((await fcRes.json()) as FlashcardSet[])
            if (ngRes.ok) setMyNoteGroups((await ngRes.json()) as NoteGroup[])
            if (clRes.ok) setMyColonies((await clRes.json()) as ClassItem[])
        })()
    }, [userId])

    // Load discover content (no auth needed)
    useEffect(() => {
        void (async () => {
            const [fcRes, ngRes, clRes] = await Promise.all([
                fetch(
                    `${API_BASE}/api/flashcards/search?query=${encodeURIComponent(search)}`,
                ),
                fetch(`${API_BASE}/api/notes/groups/public`),
                fetch(`${API_BASE}/api/classes/public`),
            ])
            if (fcRes.ok) {
                const rows = (await fcRes.json()) as FlashcardSet[]
                setPublicFlashcards(rows.filter((x) => x.published))
            }
            if (ngRes.ok) {
                const rows = (await ngRes.json()) as NoteGroup[]
                setPublicNoteGroups(rows.filter((x) => x.isPublic))
            }
            if (clRes.ok) setPublicColonies((await clRes.json()) as ClassItem[])
        })()
    }, [search])

    const joinedColonyIds = useMemo(
        () => new Set(myColonies.map((x) => x.id).filter(Boolean)),
        [myColonies],
    )

    const joinColony = async (classId: string) => {
        if (!userId) return
        await fetch(`${API_BASE}/api/classes/${classId}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
        })
        const res = await fetch(`${API_BASE}/api/classes/user/${userId}`)
        if (res.ok) setMyColonies((await res.json()) as ClassItem[])
    }

    const totalOwned =
        myFlashcards.length + myNoteGroups.length + myColonies.length
    const totalPublic =
        publicFlashcards.length + publicNoteGroups.length + publicColonies.length

    // filtered public for search
    const filtFC = useMemo(
        () =>
            publicFlashcards
                .filter(
                    (x) =>
                        !search || x.name?.toLowerCase().includes(search.toLowerCase()),
                )
                .slice(0, 5),
        [publicFlashcards, search],
    )
    const filtNG = useMemo(
        () =>
            publicNoteGroups
                .filter(
                    (x) =>
                        !search || x.name?.toLowerCase().includes(search.toLowerCase()),
                )
                .slice(0, 5),
        [publicNoteGroups, search],
    )
    const filtCL = useMemo(
        () =>
            publicColonies
                .filter(
                    (x) =>
                        !search || x.name?.toLowerCase().includes(search.toLowerCase()),
                )
                .slice(0, 5),
        [publicColonies, search],
    )

    return (
        <main
            style={{
                background: '#0a0907',
                minHeight: '100vh',
                fontFamily: "'DM Sans', sans-serif",
            }}
        >
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300&family=Fraunces:ital,opsz,wght@0,9..144,700;0,9..144,900;1,9..144,400&display=swap');

                /* Grid lines */
                .hp-grid-lines {
                    background-image: linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px);
                    background-size: 52px 52px;
                    mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, black 0%, transparent 65%);
                }

                /* Section panels */
                .hp-panel {
                    background: rgba(255,255,255,0.025);
                    border: 1px solid rgba(255,255,255,0.07);
                    border-radius: 18px;
                    padding: 20px;
                    position: relative;
                    overflow: hidden;
                    transition: border-color 0.25s;
                }
                .hp-panel::before {
                    content: '';
                    position: absolute; top: 0; left: 0; right: 0; height: 1px;
                    background: linear-gradient(90deg, transparent, rgba(251,191,36,0.25), transparent);
                    opacity: 0; transition: opacity 0.25s;
                }
                .hp-panel:hover { border-color: rgba(251,191,36,0.15); }
                .hp-panel:hover::before { opacity: 1; }

                /* Colony rows */
                .colony-row:hover {
                    border-color: rgba(251,191,36,0.2) !important;
                    background: rgba(251,191,36,0.04) !important;
                }
                .colony-row .prose, .colony-row .prose p {
                    font-size: 0.75rem !important;
                    color: rgba(255,255,255,0.32) !important;
                    margin: 0 !important;
                    line-height: 1.4 !important;
                }

                /* Stat cards */
                .hp-stat {
                    background: rgba(255,255,255,0.025);
                    border: 1px solid rgba(255,255,255,0.065);
                    border-radius: 14px;
                    padding: 16px 18px;
                    transition: border-color 0.2s, transform 0.2s;
                    position: relative; overflow: hidden;
                }
                .hp-stat:hover { border-color: rgba(251,191,36,0.2); transform: translateY(-2px); }
                .hp-stat::after { content: ''; position: absolute; bottom: -16px; right: -16px; width: 60px; height: 60px; border-radius: 50%; background: radial-gradient(circle, rgba(251,191,36,0.07), transparent 70%); }

                /* Feature shortcut cards */
                .hp-feature {
                    display: flex; flex-direction: column; gap: 10px;
                    padding: 20px; border-radius: 16px;
                    border: 1px solid rgba(255,255,255,0.07);
                    background: rgba(255,255,255,0.025);
                    text-decoration: none; color: inherit;
                    transition: all 0.25s cubic-bezier(0.4,0,0.2,1);
                    position: relative; overflow: hidden;
                }
                .hp-feature:hover { border-color: rgba(251,191,36,0.28); transform: translateY(-3px); box-shadow: 0 18px 52px -14px rgba(0,0,0,0.55); }
                .hp-feature .feat-arrow { position: absolute; top: 18px; right: 18px; opacity: 0; transform: translateX(-5px); transition: all 0.2s; color: #fbbf24; }
                .hp-feature:hover .feat-arrow { opacity: 1; transform: translateX(0); }

                /* Inputs */
                .hp-input { background: rgba(255,255,255,0.05) !important; border: 1px solid rgba(255,255,255,0.1) !important; color: #fafaf9 !important; border-radius: 10px !important; transition: border-color 0.2s !important; }
                .hp-input:focus { border-color: rgba(251,191,36,0.4) !important; outline: none !important; box-shadow: 0 0 0 3px rgba(251,191,36,0.07) !important; }
                .hp-input::placeholder { color: rgba(255,255,255,0.2) !important; }

                /* Buttons */
                .hp-btn-ai { background: linear-gradient(135deg, rgba(251,191,36,0.18), rgba(245,158,11,0.08)) !important; color: #fbbf24 !important; border: 1px solid rgba(251,191,36,0.3) !important; border-radius: 10px !important; font-weight: 600 !important; transition: all 0.2s !important; }
                .hp-btn-ai:hover { background: linear-gradient(135deg, rgba(251,191,36,0.28), rgba(245,158,11,0.18)) !important; border-color: rgba(251,191,36,0.5) !important; transform: translateY(-1px); box-shadow: 0 4px 20px rgba(251,191,36,0.15) !important; }
                .hp-btn-outline { background: transparent !important; color: rgba(255,255,255,0.6) !important; border: 1px solid rgba(255,255,255,0.12) !important; border-radius: 10px !important; transition: all 0.2s !important; }
                .hp-btn-outline:hover { border-color: rgba(255,255,255,0.25) !important; color: #fafaf9 !important; background: rgba(255,255,255,0.05) !important; }
                .hp-btn-join { background: rgba(251,191,36,0.12) !important; color: #fbbf24 !important; border: 1px solid rgba(251,191,36,0.22) !important; border-radius: 8px !important; font-size: 0.72rem !important; padding: 3px 10px !important; transition: all 0.15s !important; height: auto !important; }
                .hp-btn-join:hover { background: rgba(251,191,36,0.22) !important; }

                /* Divider */
                .hp-divider { height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent); margin: 2rem 0; }

                /* Stagger animations */
                @keyframes hpUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
                .hp-a1 { animation: hpUp 0.45s ease both 0.0s; }
                .hp-a2 { animation: hpUp 0.45s ease both 0.07s; }
                .hp-a3 { animation: hpUp 0.45s ease both 0.14s; }
                .hp-a4 { animation: hpUp 0.45s ease both 0.21s; }
                .hp-a5 { animation: hpUp 0.45s ease both 0.28s; }
                .hp-a6 { animation: hpUp 0.45s ease both 0.35s; }
            `}</style>

            {/* Decorative grid bg */}
            <div
                className="hp-grid-lines"
                style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}
            />

            <div style={{ position: 'relative', zIndex: 1 }}>
                <div className="mx-auto max-w-6xl px-6 pb-20">
                    {/* ── HERO ─────────────────────────────────────────────── */}
                    <div className="hp-glow pt-16 pb-8">
                        {/* Top row: title + actions */}
                        <div className="hp-a1 flex items-start justify-between gap-6 flex-wrap">
                            <div>
                                <div
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        marginBottom: 18,
                                        padding: '4px 12px',
                                        borderRadius: 999,
                                        background: 'rgba(251,191,36,0.08)',
                                        border: '1px solid rgba(251,191,36,0.18)',
                                        fontSize: '0.72rem',
                                        fontWeight: 600,
                                        color: '#fbbf24',
                                        letterSpacing: '0.04em',
                                    }}
                                >
                                    <Sparkles size={10} /> Your learning colony
                                </div>
                                <h1
                                    style={{
                                        fontFamily: "'Fraunces', serif",
                                        fontSize: 'clamp(2.2rem, 5.5vw, 3.6rem)',
                                        fontWeight: 900,
                                        color: '#fafaf9',
                                        lineHeight: 1.05,
                                        letterSpacing: '-0.03em',
                                        marginBottom: 12,
                                    }}
                                >
                                    Everything you
                                    <br />
                                    <em
                                        style={{
                                            fontStyle: 'italic',
                                            fontWeight: 400,
                                            color: '#fbbf24',
                                        }}
                                    >
                                        know
                                    </em>
                                    , one place.
                                </h1>
                                <p
                                    style={{
                                        color: 'rgba(255,255,255,0.35)',
                                        fontSize: '0.95rem',
                                        maxWidth: '40ch',
                                        lineHeight: 1.65,
                                    }}
                                >
                                    Flashcards, notes, and colonies — explore what you own and
                                    discover what the community is building.
                                </p>
                            </div>

                            {/* Feature shortcuts */}
                            <div
                                className="hp-a2 flex flex-col gap-2"
                                style={{ minWidth: 210 }}
                            >
                                <Link href="/flashcards" className="hp-feature">
                                    <ArrowRight size={14} className="feat-arrow" />
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                        <span
                                            style={{
                                                width: 32,
                                                height: 32,
                                                borderRadius: 9,
                                                background: 'rgba(251,191,36,0.1)',
                                                border: '1px solid rgba(251,191,36,0.2)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                            }}
                                        >
                                            <FlipHorizontal size={15} style={{ color: '#fbbf24' }} />
                                        </span>
                                        <div>
                                            <div
                                                style={{
                                                    fontSize: '0.84rem',
                                                    fontWeight: 700,
                                                    color: '#fafaf9',
                                                }}
                                            >
                                                Flashcards
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: '0.68rem',
                                                    color: 'rgba(255,255,255,0.3)',
                                                }}
                                            >
                                                {myFlashcards.length} sets
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                                <Link href="/notes" className="hp-feature">
                                    <ArrowRight size={14} className="feat-arrow" />
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                        <span
                                            style={{
                                                width: 32,
                                                height: 32,
                                                borderRadius: 9,
                                                background: 'rgba(96,165,250,0.1)',
                                                border: '1px solid rgba(96,165,250,0.18)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                            }}
                                        >
                                            <BookOpen size={15} style={{ color: '#60a5fa' }} />
                                        </span>
                                        <div>
                                            <div
                                                style={{
                                                    fontSize: '0.84rem',
                                                    fontWeight: 700,
                                                    color: '#fafaf9',
                                                }}
                                            >
                                                Notes
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: '0.68rem',
                                                    color: 'rgba(255,255,255,0.3)',
                                                }}
                                            >
                                                {myNoteGroups.length} groups
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                                <Link href="/classes" className="hp-feature">
                                    <ArrowRight size={14} className="feat-arrow" />
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                        <span
                                            style={{
                                                width: 32,
                                                height: 32,
                                                borderRadius: 9,
                                                background: 'rgba(167,139,250,0.1)',
                                                border: '1px solid rgba(167,139,250,0.18)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                            }}
                                        >
                                            <Users size={15} style={{ color: '#a78bfa' }} />
                                        </span>
                                        <div>
                                            <div
                                                style={{
                                                    fontSize: '0.84rem',
                                                    fontWeight: 700,
                                                    color: '#fafaf9',
                                                }}
                                            >
                                                Colonies
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: '0.68rem',
                                                    color: 'rgba(255,255,255,0.3)',
                                                }}
                                            >
                                                {myColonies.length} joined
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="hp-a3 relative mt-8" style={{ maxWidth: 460 }}>
                            <Search
                                size={13}
                                style={{
                                    position: 'absolute',
                                    left: 12,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'rgba(255,255,255,0.25)',
                                    pointerEvents: 'none',
                                }}
                            />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search flashcards, note groups, colonies…"
                                className="hp-input pl-9"
                            />
                        </div>

                        {/* Stats row */}
                        <div className="hp-a4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-8">
                            {[
                                {
                                    label: 'My sets',
                                    value: myFlashcards.length,
                                    color: '#fbbf24',
                                    Icon: FlipHorizontal,
                                },
                                {
                                    label: 'My notes',
                                    value: myNoteGroups.length,
                                    color: '#60a5fa',
                                    Icon: FileText,
                                },
                                {
                                    label: 'My colonies',
                                    value: myColonies.length,
                                    color: '#a78bfa',
                                    Icon: Users,
                                },
                                {
                                    label: 'Public sets',
                                    value: publicFlashcards.length,
                                    color: '#34d399',
                                    Icon: Globe,
                                },
                                {
                                    label: 'Public notes',
                                    value: publicNoteGroups.length,
                                    color: '#f472b6',
                                    Icon: FolderOpen,
                                },
                                {
                                    label: 'Public colonies',
                                    value: publicColonies.length,
                                    color: '#fb923c',
                                    Icon: Compass,
                                },
                            ].map(({ label, value, color, Icon }) => (
                                <div key={label} className="hp-stat">
                                    <Icon
                                        size={14}
                                        style={{ color, opacity: 0.8, marginBottom: 8 }}
                                    />
                                    <div
                                        style={{
                                            fontSize: 'clamp(1.3rem, 2.5vw, 1.8rem)',
                                            fontWeight: 800,
                                            color: '#fafaf9',
                                            fontFamily: "'Fraunces', serif",
                                            lineHeight: 1,
                                        }}
                                    >
                                        {value}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: '0.67rem',
                                            color: 'rgba(255,255,255,0.28)',
                                            marginTop: 4,
                                            lineHeight: 1.3,
                                        }}
                                    >
                                        {label}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="hp-divider" />

                    {/* ── MAIN GRID: My stuff + Discover ────────────────────── */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '1.25rem',
                        }}
                    >
                        {/* ── LEFT: My Library ─────────────────────────────── */}
                        <div className="hp-a5 flex flex-col gap-5">
                            {/* My Flashcards */}
                            <div className="hp-panel">
                                <SectionHeader
                                    icon={FlipHorizontal}
                                    label="My Flashcard Sets"
                                    count={myFlashcards.length}
                                    href="/flashcards"
                                    linkLabel="All sets"
                                />
                                {!userId ? (
                                    <EmptyState
                                        icon={Star}
                                        message="Sign in to see your flashcard sets."
                                    />
                                ) : myFlashcards.length === 0 ? (
                                    <EmptyState
                                        icon={FlipHorizontal}
                                        message="No sets yet — create your first one!"
                                    />
                                ) : (
                                    <div
                                        style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
                                    >
                                        {myFlashcards.slice(0, 4).map((set) => (
                                            <ColonyCard
                                                key={set.id}
                                                item={set.name ?? 'Untitled'}
                                                accentColor="#fbbf24"
                                                isPublic={set.published}
                                                code={set.code}
                                                description={set.description}
                                                href={`/flashcards/${set.id}`}
                                            />
                                        ))}
                                        {myFlashcards.length > 4 && (
                                            <Link
                                                href="/flashcards"
                                                style={{
                                                    fontSize: '0.75rem',
                                                    color: 'rgba(255,255,255,0.3)',
                                                    textAlign: 'center',
                                                    padding: '6px 0',
                                                    textDecoration: 'none',
                                                }}
                                            >
                                                +{myFlashcards.length - 4} more
                                            </Link>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* My Notes */}
                            <div className="hp-panel">
                                <SectionHeader
                                    icon={BookOpen}
                                    label="My Note Groups"
                                    count={myNoteGroups.length}
                                    href="/notes"
                                    linkLabel="All notes"
                                />
                                {!userId ? (
                                    <EmptyState
                                        icon={Star}
                                        message="Sign in to see your note groups."
                                    />
                                ) : myNoteGroups.length === 0 ? (
                                    <EmptyState icon={FileText} message="No note groups yet." />
                                ) : (
                                    <div
                                        style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
                                    >
                                        {myNoteGroups.slice(0, 4).map((g) => (
                                            <ColonyCard
                                                key={g.id}
                                                item={g.name ?? 'Untitled'}
                                                accentColor={g.accentColor}
                                                isPublic={g.isPublic}
                                                code={g.code}
                                                description={g.description}
                                                href="/notes"
                                                badge={
                                                    (g.labels ?? []).length > 0 ? (
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                gap: 4,
                                                                flexWrap: 'wrap',
                                                                justifyContent: 'flex-end',
                                                            }}
                                                        >
                                                            {(g.labels ?? []).slice(0, 2).map((l) => (
                                                                <span
                                                                    key={l}
                                                                    style={{
                                                                        fontSize: '0.6rem',
                                                                        padding: '1px 6px',
                                                                        borderRadius: 999,
                                                                        background: 'rgba(96,165,250,0.1)',
                                                                        color: '#60a5fa',
                                                                        border: '1px solid rgba(96,165,250,0.18)',
                                                                    }}
                                                                >
                                                                    {l}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : undefined
                                                }
                                            />
                                        ))}
                                        {myNoteGroups.length > 4 && (
                                            <Link
                                                href="/notes"
                                                style={{
                                                    fontSize: '0.75rem',
                                                    color: 'rgba(255,255,255,0.3)',
                                                    textAlign: 'center',
                                                    padding: '6px 0',
                                                    textDecoration: 'none',
                                                }}
                                            >
                                                +{myNoteGroups.length - 4} more
                                            </Link>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* My Colonies */}
                            <div className="hp-panel">
                                <SectionHeader
                                    icon={Users}
                                    label="My Colonies"
                                    count={myColonies.length}
                                    href="/classes"
                                    linkLabel="All colonies"
                                />
                                {!userId ? (
                                    <EmptyState
                                        icon={Star}
                                        message="Sign in to see your colonies."
                                    />
                                ) : myColonies.length === 0 ? (
                                    <EmptyState
                                        icon={Users}
                                        message="No colonies yet — join or create one!"
                                    />
                                ) : (
                                    <div
                                        style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
                                    >
                                        {myColonies.slice(0, 4).map((c) => (
                                            <ColonyCard
                                                key={c.id}
                                                item={c.name ?? 'Untitled'}
                                                accentColor={c.accentColor}
                                                isPublic={c.isPublic}
                                                code={c.code}
                                                description={c.description}
                                                href={`/classes/${c.id}`}
                                            />
                                        ))}
                                        {myColonies.length > 4 && (
                                            <Link
                                                href="/classes"
                                                style={{
                                                    fontSize: '0.75rem',
                                                    color: 'rgba(255,255,255,0.3)',
                                                    textAlign: 'center',
                                                    padding: '6px 0',
                                                    textDecoration: 'none',
                                                }}
                                            >
                                                +{myColonies.length - 4} more
                                            </Link>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── RIGHT: Discover ──────────────────────────────── */}
                        <div className="hp-a6 flex flex-col gap-5">
                            {/* Public Flashcards */}
                            <div className="hp-panel">
                                <SectionHeader
                                    icon={FlipHorizontal}
                                    label="Public Flashcard Sets"
                                    count={filtFC.length}
                                    href="/flashcards"
                                    linkLabel="Browse"
                                />
                                {filtFC.length === 0 ? (
                                    <EmptyState
                                        icon={Compass}
                                        message={
                                            search
                                                ? `No public sets matching "${search}"`
                                                : 'No public sets yet.'
                                        }
                                    />
                                ) : (
                                    <div
                                        style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
                                    >
                                        {filtFC.map((set) => (
                                            <ColonyCard
                                                key={set.id}
                                                item={set.name ?? 'Untitled'}
                                                accentColor="#fbbf24"
                                                isPublic
                                                code={set.code}
                                                description={set.description}
                                                href={`/flashcards/${set.id}`}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Public Note Groups */}
                            <div className="hp-panel">
                                <SectionHeader
                                    icon={FolderOpen}
                                    label="Public Note Groups"
                                    count={filtNG.length}
                                    href="/notes"
                                    linkLabel="Browse"
                                />
                                {filtNG.length === 0 ? (
                                    <EmptyState
                                        icon={Compass}
                                        message={
                                            search
                                                ? `No public groups matching "${search}"`
                                                : 'No public note groups yet.'
                                        }
                                    />
                                ) : (
                                    <div
                                        style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
                                    >
                                        {filtNG.map((g) => (
                                            <ColonyCard
                                                key={g.id}
                                                item={g.name ?? 'Untitled'}
                                                accentColor={g.accentColor}
                                                isPublic
                                                code={g.code}
                                                description={g.description}
                                                href="/notes"
                                                badge={
                                                    (g.labels ?? []).length > 0 ? (
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                gap: 4,
                                                                flexWrap: 'wrap',
                                                                justifyContent: 'flex-end',
                                                            }}
                                                        >
                                                            {(g.labels ?? []).slice(0, 2).map((l) => (
                                                                <span
                                                                    key={l}
                                                                    style={{
                                                                        fontSize: '0.6rem',
                                                                        padding: '1px 6px',
                                                                        borderRadius: 999,
                                                                        background: 'rgba(96,165,250,0.1)',
                                                                        color: '#60a5fa',
                                                                        border: '1px solid rgba(96,165,250,0.18)',
                                                                    }}
                                                                >
                                                                    {l}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : undefined
                                                }
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Public Colonies */}
                            <div className="hp-panel">
                                <SectionHeader
                                    icon={Users}
                                    label="Public Colonies"
                                    count={filtCL.length}
                                    href="/classes"
                                    linkLabel="Browse"
                                />
                                {filtCL.length === 0 ? (
                                    <EmptyState
                                        icon={Compass}
                                        message={
                                            search
                                                ? `No colonies matching "${search}"`
                                                : 'No public colonies yet.'
                                        }
                                    />
                                ) : (
                                    <div
                                        style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
                                    >
                                        {filtCL.map((c) => {
                                            const alreadyIn = !!c.id && joinedColonyIds.has(c.id)
                                            return (
                                                <ColonyCard
                                                    key={c.id}
                                                    item={c.name ?? 'Untitled'}
                                                    accentColor={c.accentColor}
                                                    isPublic
                                                    code={c.code}
                                                    description={c.description}
                                                    actions={
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                gap: 6,
                                                                alignItems: 'center',
                                                            }}
                                                        >
                                                            {alreadyIn ? (
                                                                <span
                                                                    style={{
                                                                        fontSize: '0.67rem',
                                                                        padding: '2px 8px',
                                                                        borderRadius: 999,
                                                                        background: 'rgba(167,139,250,0.1)',
                                                                        color: '#a78bfa',
                                                                        border: '1px solid rgba(167,139,250,0.2)',
                                                                    }}
                                                                >
                                                                    <Users
                                                                        size={8}
                                                                        style={{ display: 'inline', marginRight: 3 }}
                                                                    />
                                                                    Joined
                                                                </span>
                                                            ) : userId ? (
                                                                <Button
                                                                    className="hp-btn-join"
                                                                    onClick={(e) => {
                                                                        e.preventDefault()
                                                                        void joinColony(c.id ?? '')
                                                                    }}
                                                                >
                                                                    <LogIn size={9} style={{ marginRight: 4 }} />
                                                                    Join
                                                                </Button>
                                                            ) : null}
                                                            <Link
                                                                href={`/classes/${c.id}`}
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <Button
                                                                    className="hp-btn-join"
                                                                    style={{
                                                                        background:
                                                                            'rgba(255,255,255,0.05) !important',
                                                                        color: 'rgba(255,255,255,0.5) !important',
                                                                        borderColor:
                                                                            'rgba(255,255,255,0.1) !important',
                                                                    }}
                                                                >
                                                                    <DoorOpen size={9} style={{ marginRight: 4 }} />
                                                                    View
                                                                </Button>
                                                            </Link>
                                                        </div>
                                                    }
                                                />
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="hp-divider" />

                    {/* ── BOTTOM CTA ────────────────────────────────────────── */}
                    <div
                        style={{
                            background:
                                'linear-gradient(135deg, rgba(251,191,36,0.07), rgba(245,158,11,0.025))',
                            border: '1px solid rgba(251,191,36,0.15)',
                            borderRadius: 20,
                            padding: '2rem 2.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '1.5rem',
                            flexWrap: 'wrap',
                        }}
                    >
                        <div>
                            <div
                                style={{
                                    fontFamily: "'Fraunces', serif",
                                    fontSize: '1.4rem',
                                    fontWeight: 700,
                                    color: '#fafaf9',
                                    marginBottom: 5,
                                }}
                            >
                                Ready to generate?
                            </div>
                            <p
                                style={{
                                    color: 'rgba(255,255,255,0.35)',
                                    fontSize: '0.88rem',
                                    maxWidth: '42ch',
                                    lineHeight: 1.55,
                                }}
                            >
                                Use AI to create flashcard sets from any topic or summarise
                                notes instantly.
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <Link href="/flashcards">
                                <Button className="hp-btn-ai gap-2">
                                    <Wand2 size={13} /> Generate flashcards
                                </Button>
                            </Link>
                            <Link href="/notes">
                                <Button className="hp-btn-outline gap-2">
                                    <Wand2 size={13} /> Summarise notes
                                </Button>
                            </Link>
                            <Link href="/classes">
                                <Button className="hp-btn-outline gap-2">
                                    <Plus size={13} /> New colony
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    )
}
