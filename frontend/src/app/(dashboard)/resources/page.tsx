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
    Users,
    Globe,
    Hash,
    Search,
    Compass,
    LogIn,
    DoorOpen,
    FolderOpen,
    X,
    SlidersHorizontal,
    Sparkles,
    ArrowUpRight,
    BookOpen,
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
    code?: string
    isPublic?: boolean
    accentColor?: string
}

type ResourceKind = 'all' | 'flashcard' | 'note' | 'colony'

// ── Component ─────────────────────────────────────────────────────────────────

export default function ExplorePage() {
    const [userId, setUserId] = useState('')
    const [search, setSearch] = useState('')
    const [activeKind, setActiveKind] = useState<ResourceKind>('all')
    const [loading, setLoading] = useState(true)

    const [publicFlashcards, setPublicFlashcards] = useState<FlashcardSet[]>([])
    const [publicNoteGroups, setPublicNoteGroups] = useState<NoteGroup[]>([])
    const [publicColonies, setPublicColonies] = useState<ClassItem[]>([])
    const [joinedColonyIds, setJoinedColonyIds] = useState<Set<string>>(new Set())
    const [myFlashcardIds, setMyFlashcardIds] = useState<Set<string>>(new Set())

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

    // Load all public resources
    useEffect(() => {
        setLoading(true)
        void (async () => {
            const [fcRes, ngRes, clRes] = await Promise.all([
                fetch(`${API_BASE}/api/flashcards/search?query=`),
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
            setLoading(false)
        })()
    }, [])

    // Load user's owned items to show join state
    useEffect(() => {
        if (!userId) return
        void (async () => {
            const [fcRes, clRes] = await Promise.all([
                fetch(`${API_BASE}/api/flashcards/user/${userId}`),
                fetch(`${API_BASE}/api/classes/user/${userId}`),
            ])
            if (fcRes.ok) {
                const rows = (await fcRes.json()) as FlashcardSet[]
                setMyFlashcardIds(
                    new Set(rows.map((x) => x.id).filter(Boolean) as string[]),
                )
            }
            if (clRes.ok) {
                const rows = (await clRes.json()) as ClassItem[]
                setJoinedColonyIds(
                    new Set(rows.map((x) => x.id).filter(Boolean) as string[]),
                )
            }
        })()
    }, [userId])

    const joinColony = async (classId: string) => {
        if (!userId) return
        await fetch(`${API_BASE}/api/classes/${classId}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
        })
        setJoinedColonyIds((prev) => new Set([...prev, classId]))
    }

    // ── Filtered results ──────────────────────────────────────────────────────

    const q = search.toLowerCase().trim()

    const filteredFC = useMemo(
        () =>
            publicFlashcards.filter(
                (x) =>
                    !q ||
                    x.name?.toLowerCase().includes(q) ||
                    x.description?.toLowerCase().includes(q),
            ),
        [publicFlashcards, q],
    )

    const filteredNG = useMemo(
        () =>
            publicNoteGroups.filter(
                (x) =>
                    !q ||
                    x.name?.toLowerCase().includes(q) ||
                    x.description?.toLowerCase().includes(q) ||
                    (x.labels ?? []).some((l) => l.toLowerCase().includes(q)),
            ),
        [publicNoteGroups, q],
    )

    const filteredCL = useMemo(
        () =>
            publicColonies.filter(
                (x) =>
                    !q ||
                    x.name?.toLowerCase().includes(q) ||
                    x.description?.toLowerCase().includes(q),
            ),
        [publicColonies, q],
    )

    const totalResults = filteredFC.length + filteredNG.length + filteredCL.length

    const tabs: {
        kind: ResourceKind
        label: string
        icon: React.ElementType
        count: number
        color: string
    }[] = [
            {
                kind: 'all',
                label: 'All',
                icon: Compass,
                count: totalResults,
                color: '#fbbf24',
            },
            {
                kind: 'flashcard',
                label: 'Flashcards',
                icon: FlipHorizontal,
                count: filteredFC.length,
                color: '#fbbf24',
            },
            {
                kind: 'note',
                label: 'Note Groups',
                icon: BookOpen,
                count: filteredNG.length,
                color: '#60a5fa',
            },
            {
                kind: 'colony',
                label: 'Colonies',
                icon: Users,
                count: filteredCL.length,
                color: '#a78bfa',
            },
        ]

    const showFC = activeKind === 'all' || activeKind === 'flashcard'
    const showNG = activeKind === 'all' || activeKind === 'note'
    const showCL = activeKind === 'all' || activeKind === 'colony'

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

                /* Decorative grid */
                .ex-grid {
                    background-image: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
                    background-size: 52px 52px;
                    mask-image: radial-gradient(ellipse 100% 40% at 50% 0%, black 0%, transparent 70%);
                }


                /* Resource cards */
                .res-card {
                    background: rgba(255,255,255,0.025);
                    border: 1px solid rgba(255,255,255,0.07);
                    border-radius: 14px;
                    padding: 16px 18px 14px 22px;
                    position: relative; overflow: hidden;
                    transition: all 0.22s cubic-bezier(0.4,0,0.2,1);
                    display: flex; flex-direction: column; gap: 8px;
                    text-decoration: none; color: inherit;
                }
                .res-card:hover {
                    border-color: rgba(251,191,36,0.22);
                    background: rgba(255,255,255,0.038);
                    transform: translateY(-2px);
                    box-shadow: 0 14px 40px -12px rgba(0,0,0,0.5);
                }
                .res-card::before {
                    content: '';
                    position: absolute; top: 0; left: 0; right: 0; height: 1px;
                    background: linear-gradient(90deg, transparent, rgba(251,191,36,0.3), transparent);
                    opacity: 0; transition: opacity 0.22s;
                }
                .res-card:hover::before { opacity: 1; }
                .res-card .card-arrow {
                    position: absolute; top: 14px; right: 14px;
                    opacity: 0; transform: translate(-3px, 3px);
                    transition: all 0.18s; color: #fbbf24;
                }
                .res-card:hover .card-arrow { opacity: 1; transform: translate(0,0); }

                /* Accent left strip */
                .accent-strip {
                    position: absolute; left: 0; top: 0; bottom: 0;
                    width: 3px; border-radius: 3px 0 0 3px;
                }

                /* Prose inside cards */
                .res-card .prose, .res-card .prose p {
                    font-size: 0.77rem !important;
                    color: rgba(255,255,255,0.3) !important;
                    margin: 0 !important;
                    line-height: 1.45 !important;
                }

                /* Filter tabs */
                .filter-tab {
                    display: inline-flex; align-items: center; gap: 6px;
                    padding: 6px 14px; border-radius: 10px;
                    font-size: 0.8rem; font-weight: 500;
                    border: 1px solid rgba(255,255,255,0.08);
                    background: rgba(255,255,255,0.03);
                    color: rgba(255,255,255,0.45);
                    cursor: pointer; transition: all 0.18s;
                    white-space: nowrap;
                }
                .filter-tab:hover { border-color: rgba(255,255,255,0.18); color: #fafaf9; background: rgba(255,255,255,0.06); }
                .filter-tab.active { background: rgba(251,191,36,0.12); border-color: rgba(251,191,36,0.35); color: #fbbf24; }

                /* Pills */
                .pill { display: inline-flex; align-items: center; gap: 3px; font-size: 0.65rem; padding: 1px 7px; border-radius: 999px; font-family: monospace; }
                .pill-code { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.28); }
                .pill-label { background: rgba(96,165,250,0.1); color: #60a5fa; border: 1px solid rgba(96,165,250,0.18); font-family: inherit; }
                .pill-joined { background: rgba(52,211,153,0.1); color: #34d399; border: 1px solid rgba(52,211,153,0.18); font-family: inherit; }

                /* Input */
                .ex-input { background: rgba(255,255,255,0.05) !important; border: 1px solid rgba(255,255,255,0.1) !important; color: #fafaf9 !important; border-radius: 12px !important; transition: all 0.2s !important; height: 42px !important; font-size: 0.9rem !important; }
                .ex-input:focus { border-color: rgba(251,191,36,0.45) !important; outline: none !important; box-shadow: 0 0 0 3px rgba(251,191,36,0.08) !important; }
                .ex-input::placeholder { color: rgba(255,255,255,0.2) !important; }

                /* Buttons */
                .ex-btn-join { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 8px; font-size: 0.71rem; font-weight: 600; background: rgba(251,191,36,0.1); color: #fbbf24; border: 1px solid rgba(251,191,36,0.25); cursor: pointer; transition: all 0.15s; font-family: inherit; }
                .ex-btn-join:hover { background: rgba(251,191,36,0.2); border-color: rgba(251,191,36,0.45); }
                .ex-btn-view { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 8px; font-size: 0.71rem; font-weight: 500; background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.45); border: 1px solid rgba(255,255,255,0.09); cursor: pointer; transition: all 0.15s; font-family: inherit; text-decoration: none; }
                .ex-btn-view:hover { background: rgba(255,255,255,0.09); color: #fafaf9; border-color: rgba(255,255,255,0.18); }

                /* Section heading */
                .sec-head {
                    display: flex; align-items: center; gap: 8px;
                    padding-bottom: 14px;
                    border-bottom: 1px solid rgba(255,255,255,0.055);
                    margin-bottom: 16px;
                }

                /* Loading shimmer */
                @keyframes shimmer { from { background-position: -400px 0; } to { background-position: 400px 0; } }
                .shimmer {
                    background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%);
                    background-size: 800px 100%;
                    animation: shimmer 1.6s infinite;
                    border-radius: 12px;
                }

                /* Stagger in */
                @keyframes exUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
                .ex-a1 { animation: exUp 0.4s ease both 0.0s; }
                .ex-a2 { animation: exUp 0.4s ease both 0.06s; }
                .ex-a3 { animation: exUp 0.4s ease both 0.12s; }
                .ex-a4 { animation: exUp 0.4s ease both 0.18s; }

                /* Scrollbar */
                ::-webkit-scrollbar { width: 4px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 99px; }
            `}</style>

            {/* Decorative grid */}
            <div
                className="ex-grid"
                style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}
            />

            <div style={{ position: 'relative', zIndex: 1 }}>
                <div className="mx-auto max-w-6xl px-6 pb-20">
                    {/* ── HERO ──────────────────────────────────────────────── */}
                    <div className="ex-glow pt-14 pb-8">
                        <div className="ex-a1 flex items-end justify-between gap-6 flex-wrap">
                            <div>
                                <div
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        marginBottom: 16,
                                        padding: '4px 12px',
                                        borderRadius: 999,
                                        background: 'rgba(251,191,36,0.08)',
                                        border: '1px solid rgba(251,191,36,0.2)',
                                        fontSize: '0.7rem',
                                        fontWeight: 600,
                                        color: '#fbbf24',
                                        letterSpacing: '0.05em',
                                    }}
                                >
                                    <Globe size={10} /> Public resources
                                </div>
                                <h1
                                    style={{
                                        fontFamily: "'Fraunces', serif",
                                        fontSize: 'clamp(2rem, 5vw, 3.2rem)',
                                        fontWeight: 900,
                                        color: '#fafaf9',
                                        lineHeight: 1.08,
                                        letterSpacing: '-0.03em',
                                        marginBottom: 10,
                                    }}
                                >
                                    Explore the
                                    <br />
                                    <em
                                        style={{
                                            fontStyle: 'italic',
                                            fontWeight: 400,
                                            color: '#fbbf24',
                                        }}
                                    >
                                        community
                                    </em>
                                    .
                                </h1>
                                <p
                                    style={{
                                        color: 'rgba(255,255,255,0.33)',
                                        fontSize: '0.92rem',
                                        maxWidth: '44ch',
                                        lineHeight: 1.65,
                                    }}
                                >
                                    Browse every public flashcard set, note group, and colony.
                                    Join what interests you, study what you find.
                                </p>
                            </div>

                            {/* Live count badges */}
                            <div className="ex-a2 flex gap-3 flex-wrap">
                                {[
                                    {
                                        label: 'Flashcard sets',
                                        value: publicFlashcards.length,
                                        color: '#fbbf24',
                                        Icon: FlipHorizontal,
                                    },
                                    {
                                        label: 'Note groups',
                                        value: publicNoteGroups.length,
                                        color: '#60a5fa',
                                        Icon: BookOpen,
                                    },
                                    {
                                        label: 'Colonies',
                                        value: publicColonies.length,
                                        color: '#a78bfa',
                                        Icon: Users,
                                    },
                                ].map(({ label, value, color, Icon }) => (
                                    <div
                                        key={label}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 10,
                                            padding: '10px 16px',
                                            borderRadius: 12,
                                            background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid rgba(255,255,255,0.07)',
                                        }}
                                    >
                                        <Icon size={16} style={{ color, opacity: 0.8 }} />
                                        <div>
                                            <div
                                                style={{
                                                    fontSize: '1.4rem',
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
                                                    fontSize: '0.65rem',
                                                    color: 'rgba(255,255,255,0.28)',
                                                    marginTop: 2,
                                                }}
                                            >
                                                {label}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ── Search + filters ───────────────────────────────── */}
                        <div className="ex-a3 mt-8 flex items-center gap-3 flex-wrap">
                            <div
                                style={{ position: 'relative', flex: '1 1 300px', maxWidth: 480 }}
                            >
                                <Search
                                    size={14}
                                    style={{
                                        position: 'absolute',
                                        left: 13,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: 'rgba(255,255,255,0.22)',
                                        pointerEvents: 'none',
                                    }}
                                />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search by name, description, or label…"
                                    className="ex-input pl-10"
                                />
                                {search && (
                                    <button
                                        onClick={() => setSearch('')}
                                        style={{
                                            position: 'absolute',
                                            right: 12,
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: 'rgba(255,255,255,0.3)',
                                            display: 'flex',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <X size={13} />
                                    </button>
                                )}
                            </div>

                            {/* Kind filter tabs */}
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.kind}
                                        onClick={() => setActiveKind(tab.kind)}
                                        className={`filter-tab ${activeKind === tab.kind ? 'active' : ''}`}
                                    >
                                        <tab.icon size={12} />
                                        {tab.label}
                                        <span
                                            style={{
                                                fontSize: '0.65rem',
                                                padding: '0px 5px',
                                                borderRadius: 999,
                                                background:
                                                    activeKind === tab.kind
                                                        ? 'rgba(251,191,36,0.2)'
                                                        : 'rgba(255,255,255,0.06)',
                                                color:
                                                    activeKind === tab.kind
                                                        ? '#fbbf24'
                                                        : 'rgba(255,255,255,0.28)',
                                                fontWeight: 600,
                                            }}
                                        >
                                            {tab.count}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Result summary */}
                        {(search || activeKind !== 'all') && !loading && (
                            <div
                                className="ex-a4 mt-4"
                                style={{
                                    fontSize: '0.78rem',
                                    color: 'rgba(255,255,255,0.28)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                }}
                            >
                                <SlidersHorizontal size={11} />
                                {totalResults === 0
                                    ? 'No results'
                                    : `${totalResults} result${totalResults !== 1 ? 's' : ''}`}
                                {search && (
                                    <span style={{ color: '#fbbf24' }}>for "{search}"</span>
                                )}
                                {activeKind !== 'all' && (
                                    <span>· filtered by {activeKind}</span>
                                )}
                                {(search || activeKind !== 'all') && (
                                    <button
                                        onClick={() => {
                                            setSearch('')
                                            setActiveKind('all')
                                        }}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: 'rgba(255,255,255,0.3)',
                                            fontSize: '0.72rem',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 3,
                                            fontFamily: 'inherit',
                                        }}
                                    >
                                        <X size={10} /> Clear
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── CONTENT ────────────────────────────────────────────── */}
                    {loading ? (
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                                gap: 12,
                                marginTop: 8,
                            }}
                        >
                            {Array.from({ length: 9 }).map((_, i) => (
                                <div key={i} className="shimmer" style={{ height: 110 }} />
                            ))}
                        </div>
                    ) : totalResults === 0 ? (
                        <div
                            style={{
                                textAlign: 'center',
                                padding: '5rem 1rem',
                                color: 'rgba(255,255,255,0.18)',
                            }}
                        >
                            <Compass
                                size={40}
                                style={{ margin: '0 auto 14px', opacity: 0.18 }}
                            />
                            <div
                                style={{
                                    fontFamily: "'Fraunces', serif",
                                    fontSize: '1.2rem',
                                    fontWeight: 700,
                                    marginBottom: 8,
                                }}
                            >
                                Nothing found
                            </div>
                            <p
                                style={{
                                    fontSize: '0.85rem',
                                    maxWidth: '32ch',
                                    margin: '0 auto',
                                }}
                            >
                                {search
                                    ? `No public resources match "${search}".`
                                    : 'There are no public resources yet.'}
                            </p>
                            {search && (
                                <button
                                    onClick={() => setSearch('')}
                                    className="filter-tab active"
                                    style={{ margin: '16px auto 0', display: 'inline-flex' }}
                                >
                                    <X size={11} /> Clear search
                                </button>
                            )}
                        </div>
                    ) : (
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2.5rem',
                                marginTop: 8,
                            }}
                        >
                            {/* ── Flashcard sets section ─────────────────────── */}
                            {showFC && filteredFC.length > 0 && (
                                <section>
                                    <div className="sec-head">
                                        <span
                                            style={{
                                                width: 30,
                                                height: 30,
                                                borderRadius: 9,
                                                background: 'rgba(251,191,36,0.1)',
                                                border: '1px solid rgba(251,191,36,0.2)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                            }}
                                        >
                                            <FlipHorizontal size={14} style={{ color: '#fbbf24' }} />
                                        </span>
                                        <div>
                                            <div
                                                style={{
                                                    fontWeight: 700,
                                                    fontSize: '0.95rem',
                                                    color: '#fafaf9',
                                                }}
                                            >
                                                Flashcard Sets
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: '0.7rem',
                                                    color: 'rgba(255,255,255,0.3)',
                                                    marginTop: 1,
                                                }}
                                            >
                                                {filteredFC.length} public set
                                                {filteredFC.length !== 1 ? 's' : ''}
                                            </div>
                                        </div>
                                        <Link
                                            href="/flashcards"
                                            style={{
                                                marginLeft: 'auto',
                                                fontSize: '0.72rem',
                                                color: 'rgba(255,255,255,0.3)',
                                                textDecoration: 'none',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 4,
                                            }}
                                            onMouseEnter={(e) =>
                                                (e.currentTarget.style.color = '#fbbf24')
                                            }
                                            onMouseLeave={(e) =>
                                                (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')
                                            }
                                        >
                                            Go to Flashcards <ArrowUpRight size={11} />
                                        </Link>
                                    </div>

                                    <div
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns:
                                                'repeat(auto-fill, minmax(280px, 1fr))',
                                            gap: 10,
                                        }}
                                    >
                                        {filteredFC.map((set) => (
                                            <Link
                                                key={set.id}
                                                href={`/flashcards/${set.id}`}
                                                className="res-card"
                                            >
                                                <span
                                                    className="accent-strip"
                                                    style={{ background: '#fbbf24' }}
                                                />
                                                <ArrowUpRight size={13} className="card-arrow" />
                                                <div
                                                    style={{
                                                        fontWeight: 700,
                                                        fontSize: '0.88rem',
                                                        color: '#fafaf9',
                                                        paddingRight: 20,
                                                    }}
                                                >
                                                    {set.name ?? 'Untitled Set'}
                                                </div>
                                                {set.description && (
                                                    <MarkdownContent
                                                        className="prose prose-sm max-w-none line-clamp-2"
                                                        content={set.description}
                                                    />
                                                )}
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 6,
                                                        marginTop: 2,
                                                    }}
                                                >
                                                    {set.code && (
                                                        <span className="pill pill-code">
                                                            <Hash size={8} />
                                                            {set.code}
                                                        </span>
                                                    )}
                                                    <span
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 3,
                                                            fontSize: '0.65rem',
                                                            color: '#34d399',
                                                        }}
                                                    >
                                                        <Globe size={8} /> Public
                                                    </span>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* ── Note groups section ────────────────────────── */}
                            {showNG && filteredNG.length > 0 && (
                                <section>
                                    <div className="sec-head">
                                        <span
                                            style={{
                                                width: 30,
                                                height: 30,
                                                borderRadius: 9,
                                                background: 'rgba(96,165,250,0.1)',
                                                border: '1px solid rgba(96,165,250,0.2)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                            }}
                                        >
                                            <BookOpen size={14} style={{ color: '#60a5fa' }} />
                                        </span>
                                        <div>
                                            <div
                                                style={{
                                                    fontWeight: 700,
                                                    fontSize: '0.95rem',
                                                    color: '#fafaf9',
                                                }}
                                            >
                                                Note Groups
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: '0.7rem',
                                                    color: 'rgba(255,255,255,0.3)',
                                                    marginTop: 1,
                                                }}
                                            >
                                                {filteredNG.length} public group
                                                {filteredNG.length !== 1 ? 's' : ''}
                                            </div>
                                        </div>
                                        <Link
                                            href="/notes"
                                            style={{
                                                marginLeft: 'auto',
                                                fontSize: '0.72rem',
                                                color: 'rgba(255,255,255,0.3)',
                                                textDecoration: 'none',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 4,
                                            }}
                                            onMouseEnter={(e) =>
                                                (e.currentTarget.style.color = '#60a5fa')
                                            }
                                            onMouseLeave={(e) =>
                                                (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')
                                            }
                                        >
                                            Go to Notes <ArrowUpRight size={11} />
                                        </Link>
                                    </div>

                                    <div
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns:
                                                'repeat(auto-fill, minmax(280px, 1fr))',
                                            gap: 10,
                                        }}
                                    >
                                        {filteredNG.map((g) => (
                                            <Link key={g.id} href="/notes" className="res-card">
                                                <span
                                                    className="accent-strip"
                                                    style={{ background: g.accentColor ?? '#60a5fa' }}
                                                />
                                                <ArrowUpRight size={13} className="card-arrow" />
                                                <div
                                                    style={{
                                                        fontWeight: 700,
                                                        fontSize: '0.88rem',
                                                        color: '#fafaf9',
                                                        paddingRight: 20,
                                                    }}
                                                >
                                                    {g.name ?? 'Untitled Group'}
                                                </div>
                                                {g.description && (
                                                    <MarkdownContent
                                                        className="prose prose-sm max-w-none line-clamp-2"
                                                        content={g.description}
                                                    />
                                                )}
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 5,
                                                        flexWrap: 'wrap',
                                                        marginTop: 2,
                                                    }}
                                                >
                                                    {g.code && (
                                                        <span className="pill pill-code">
                                                            <Hash size={8} />
                                                            {g.code}
                                                        </span>
                                                    )}
                                                    <span
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 3,
                                                            fontSize: '0.65rem',
                                                            color: '#34d399',
                                                        }}
                                                    >
                                                        <Globe size={8} /> Public
                                                    </span>
                                                    {(g.labels ?? []).slice(0, 3).map((l) => (
                                                        <span key={l} className="pill pill-label">
                                                            {l}
                                                        </span>
                                                    ))}
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* ── Colonies section ───────────────────────────── */}
                            {showCL && filteredCL.length > 0 && (
                                <section>
                                    <div className="sec-head">
                                        <span
                                            style={{
                                                width: 30,
                                                height: 30,
                                                borderRadius: 9,
                                                background: 'rgba(167,139,250,0.1)',
                                                border: '1px solid rgba(167,139,250,0.2)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                            }}
                                        >
                                            <Users size={14} style={{ color: '#a78bfa' }} />
                                        </span>
                                        <div>
                                            <div
                                                style={{
                                                    fontWeight: 700,
                                                    fontSize: '0.95rem',
                                                    color: '#fafaf9',
                                                }}
                                            >
                                                Colonies
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: '0.7rem',
                                                    color: 'rgba(255,255,255,0.3)',
                                                    marginTop: 1,
                                                }}
                                            >
                                                {filteredCL.length} public colon
                                                {filteredCL.length !== 1 ? 'ies' : 'y'}
                                            </div>
                                        </div>
                                        <Link
                                            href="/classes"
                                            style={{
                                                marginLeft: 'auto',
                                                fontSize: '0.72rem',
                                                color: 'rgba(255,255,255,0.3)',
                                                textDecoration: 'none',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 4,
                                            }}
                                            onMouseEnter={(e) =>
                                                (e.currentTarget.style.color = '#a78bfa')
                                            }
                                            onMouseLeave={(e) =>
                                                (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')
                                            }
                                        >
                                            Go to Colonies <ArrowUpRight size={11} />
                                        </Link>
                                    </div>

                                    <div
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns:
                                                'repeat(auto-fill, minmax(280px, 1fr))',
                                            gap: 10,
                                        }}
                                    >
                                        {filteredCL.map((c) => {
                                            const alreadyIn = !!c.id && joinedColonyIds.has(c.id)
                                            const accent = c.accentColor ?? '#a78bfa'
                                            return (
                                                <div
                                                    key={c.id}
                                                    className="res-card"
                                                    style={{ cursor: 'default' }}
                                                >
                                                    <span
                                                        className="accent-strip"
                                                        style={{ background: accent }}
                                                    />
                                                    <div
                                                        style={{
                                                            fontWeight: 700,
                                                            fontSize: '0.88rem',
                                                            color: '#fafaf9',
                                                            paddingRight: 20,
                                                        }}
                                                    >
                                                        {c.name ?? 'Untitled Colony'}
                                                    </div>
                                                    {c.description && (
                                                        <MarkdownContent
                                                            className="prose prose-sm max-w-none line-clamp-2"
                                                            content={c.description}
                                                        />
                                                    )}
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 6,
                                                            flexWrap: 'wrap',
                                                            marginTop: 2,
                                                        }}
                                                    >
                                                        {c.code && (
                                                            <span className="pill pill-code">
                                                                <Hash size={8} />
                                                                {c.code}
                                                            </span>
                                                        )}
                                                        <span
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: 3,
                                                                fontSize: '0.65rem',
                                                                color: '#34d399',
                                                            }}
                                                        >
                                                            <Globe size={8} /> Public
                                                        </span>
                                                        {alreadyIn && (
                                                            <span className="pill pill-joined">
                                                                <Users size={8} />
                                                                Joined
                                                            </span>
                                                        )}
                                                    </div>
                                                    {/* Actions */}
                                                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                                        {!alreadyIn && userId && (
                                                            <button
                                                                className="ex-btn-join"
                                                                onClick={() => void joinColony(c.id ?? '')}
                                                            >
                                                                <LogIn size={10} /> Join
                                                            </button>
                                                        )}
                                                        <Link
                                                            href={`/classes/${c.id}`}
                                                            className="ex-btn-view"
                                                        >
                                                            <DoorOpen size={10} /> View
                                                        </Link>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </section>
                            )}
                        </div>
                    )}

                    {/* ── Bottom spacer CTA ──────────────────────────────────── */}
                    {!loading && totalResults > 0 && (
                        <div
                            style={{
                                marginTop: '3.5rem',
                                padding: '1.75rem 2rem',
                                borderRadius: 18,
                                background:
                                    'linear-gradient(135deg, rgba(251,191,36,0.06), rgba(167,139,250,0.03))',
                                border: '1px solid rgba(255,255,255,0.07)',
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
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 7,
                                        marginBottom: 5,
                                    }}
                                >
                                    <Sparkles size={14} style={{ color: '#fbbf24' }} />
                                    <span
                                        style={{
                                            fontFamily: "'Fraunces', serif",
                                            fontSize: '1.1rem',
                                            fontWeight: 700,
                                            color: '#fafaf9',
                                        }}
                                    >
                                        Want to contribute?
                                    </span>
                                </div>
                                <p
                                    style={{
                                        fontSize: '0.82rem',
                                        color: 'rgba(255,255,255,0.32)',
                                        maxWidth: '42ch',
                                        lineHeight: 1.5,
                                    }}
                                >
                                    Create a public flashcard set, share a note group, or start a
                                    colony for your community.
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <Link
                                    href="/flashcards"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 5,
                                        padding: '7px 14px',
                                        borderRadius: 10,
                                        background: 'rgba(251,191,36,0.12)',
                                        border: '1px solid rgba(251,191,36,0.28)',
                                        color: '#fbbf24',
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        textDecoration: 'none',
                                        transition: 'all 0.15s',
                                    }}
                                    onMouseEnter={(e) =>
                                        (e.currentTarget.style.background = 'rgba(251,191,36,0.22)')
                                    }
                                    onMouseLeave={(e) =>
                                        (e.currentTarget.style.background = 'rgba(251,191,36,0.12)')
                                    }
                                >
                                    <FlipHorizontal size={12} /> New set
                                </Link>
                                <Link
                                    href="/notes"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 5,
                                        padding: '7px 14px',
                                        borderRadius: 10,
                                        background: 'rgba(96,165,250,0.1)',
                                        border: '1px solid rgba(96,165,250,0.22)',
                                        color: '#60a5fa',
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        textDecoration: 'none',
                                        transition: 'all 0.15s',
                                    }}
                                    onMouseEnter={(e) =>
                                        (e.currentTarget.style.background = 'rgba(96,165,250,0.2)')
                                    }
                                    onMouseLeave={(e) =>
                                        (e.currentTarget.style.background = 'rgba(96,165,250,0.1)')
                                    }
                                >
                                    <BookOpen size={12} /> Share notes
                                </Link>
                                <Link
                                    href="/classes"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 5,
                                        padding: '7px 14px',
                                        borderRadius: 10,
                                        background: 'rgba(167,139,250,0.1)',
                                        border: '1px solid rgba(167,139,250,0.22)',
                                        color: '#a78bfa',
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        textDecoration: 'none',
                                        transition: 'all 0.15s',
                                    }}
                                    onMouseEnter={(e) =>
                                        (e.currentTarget.style.background = 'rgba(167,139,250,0.2)')
                                    }
                                    onMouseLeave={(e) =>
                                        (e.currentTarget.style.background = 'rgba(167,139,250,0.1)')
                                    }
                                >
                                    <Users size={12} /> Start a colony
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </main>
    )
}
