'use client'

import Link from 'next/link'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { MarkdownContent } from '@/components/web/markdown-content'
import {
    ArrowLeft,
    ArrowRight,
    RotateCcw,
    Plus,
    Pencil,
    Trash2,
    FlipHorizontal,
    Hash,
    Globe,
    Lock,
    BookOpen,
    X,
    Check,
    Layers,
} from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5082'

type FlashcardSet = {
    id: string
    userId: string
    name: string
    description: string
    published: boolean
    code: string
}

type FlashcardCard = {
    id: string
    front: string
    back: string
}

type Mode = 'browse' | 'study'

export default function FlashcardSetPage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()
    const [userId, setUserId] = useState('')
    const [set, setSet] = useState<FlashcardSet | null>(null)
    const [cards, setCards] = useState<FlashcardCard[]>([])
    const [loading, setLoading] = useState(true)

    // Study mode
    const [mode, setMode] = useState<Mode>('browse')
    const [currentIndex, setCurrentIndex] = useState(0)
    const [flipped, setFlipped] = useState(false)
    const [animating, setAnimating] = useState(false)

    // Edit / add card
    const [editingCard, setEditingCard] = useState<FlashcardCard | null>(null)
    const [addingCard, setAddingCard] = useState(false)
    const [newFront, setNewFront] = useState('')
    const [newBack, setNewBack] = useState('')

    const syncAuth = useCallback(() => setUserId(getAuthUser()?.id ?? ''), [])

    const loadSet = useCallback(async () => {
        if (!id) return
        setLoading(true)
        const [setRes, cardsRes] = await Promise.all([
            fetch(`${API_BASE}/api/flashcards/${id}`),
            fetch(`${API_BASE}/api/flashcards/${id}/cards`),
        ])
        if (setRes.ok) setSet((await setRes.json()) as FlashcardSet)
        if (cardsRes.ok) setCards((await cardsRes.json()) as FlashcardCard[])
        setLoading(false)
    }, [id])

    useEffect(() => {
        syncAuth()
        window.addEventListener('auth-changed', syncAuth)
        window.addEventListener('storage', syncAuth)
        return () => {
            window.removeEventListener('auth-changed', syncAuth)
            window.removeEventListener('storage', syncAuth)
        }
    }, [syncAuth])

    useEffect(() => {
        void loadSet()
    }, [loadSet])

    // Keyboard navigation in study mode
    useEffect(() => {
        if (mode !== 'study') return
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') navigate(1)
            else if (e.key === 'ArrowLeft') navigate(-1)
            else if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault()
                flipCard()
            } else if (e.key === 'Escape') exitStudy()
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [mode, currentIndex, flipped, animating, cards.length])

    const isOwner = set?.userId === userId

    // Study mode controls
    const startStudy = () => {
        setCurrentIndex(0)
        setFlipped(false)
        setMode('study')
    }

    const exitStudy = () => {
        setMode('browse')
        setFlipped(false)
    }

    const navigate = (dir: 1 | -1) => {
        if (animating) return
        setAnimating(true)
        setFlipped(false)
        setTimeout(() => {
            setCurrentIndex((prev) =>
                Math.max(0, Math.min(cards.length - 1, prev + dir)),
            )
            setAnimating(false)
        }, 220)
    }

    const flipCard = () => {
        if (animating) return
        setFlipped((f) => !f)
    }

    // CRUD
    const addCard = async () => {
        if (!newFront.trim() || !newBack.trim()) return
        await fetch(`${API_BASE}/api/flashcards/${id}/cards`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ front: newFront.trim(), back: newBack.trim() }),
        })
        setNewFront('')
        setNewBack('')
        setAddingCard(false)
        await loadSet()
    }

    const saveEdit = async () => {
        if (!editingCard || !editingCard.front.trim() || !editingCard.back.trim())
            return
        await fetch(`${API_BASE}/api/flashcards/${id}/cards/${editingCard.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                front: editingCard.front.trim(),
                back: editingCard.back.trim(),
            }),
        })
        setEditingCard(null)
        await loadSet()
    }

    const deleteCard = async (cardId: string) => {
        await fetch(`${API_BASE}/api/flashcards/${id}/cards/${cardId}`, {
            method: 'DELETE',
        })
        await loadSet()
    }

    const progress =
        cards.length > 0 ? ((currentIndex + 1) / cards.length) * 100 : 0

    // ── STUDY MODE ─────────────────────────────────────────────────────
    if (mode === 'study' && cards.length > 0) {
        const card = cards[currentIndex]
        return (
            <div
                style={{
                    background: '#0c0a08',
                    minHeight: '100vh',
                    fontFamily: "'DM Sans', sans-serif",
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Fraunces:wght@700;900&display=swap');

                    .study-card { width: 100%; max-width: 640px; height: 340px; perspective: 1200px; cursor: pointer; }
                    .study-card-inner {
                        width: 100%; height: 100%; position: relative;
                        transform-style: preserve-3d;
                        transition: transform 0.55s cubic-bezier(0.4, 0, 0.2, 1);
                    }
                    .study-card-inner.flipped { transform: rotateY(180deg); }
                    .study-card-face {
                        position: absolute; inset: 0;
                        backface-visibility: hidden; -webkit-backface-visibility: hidden;
                        border-radius: 24px; display: flex; flex-direction: column;
                        align-items: center; justify-content: center;
                        padding: 2.5rem; text-align: center;
                        transform: translateZ(0);
                    }
                    .study-card-front { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); }
                    .study-card-back  { background: rgba(251,191,36,0.06); border: 1px solid rgba(251,191,36,0.25); transform: rotateY(180deg) translateZ(0); }

                    .nav-btn {
                        display: inline-flex; align-items: center; justify-content: center;
                        width: 48px; height: 48px; border-radius: 50%;
                        border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04);
                        color: rgba(255,255,255,0.6); cursor: pointer; transition: all 0.2s;
                    }
                    .nav-btn:hover:not(:disabled) { border-color: rgba(255,255,255,0.2); background: rgba(255,255,255,0.08); color: #fafaf9; }
                    .nav-btn:disabled { opacity: 0.2; cursor: not-allowed; }

                    .pill-btn {
                        display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px;
                        border-radius: 999px; font-size: 0.82rem; font-weight: 500;
                        cursor: pointer; transition: all 0.2s; font-family: 'DM Sans', sans-serif;
                    }
                    .fade-slide { animation: fadeSlide 0.2s ease; }
                    @keyframes fadeSlide { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
                    @keyframes spin { to { transform: rotate(360deg); } }
                `}</style>

                {/* Top bar */}
                <div
                    style={{
                        padding: '16px 24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        flexShrink: 0,
                    }}
                >
                    <button
                        className="pill-btn"
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'rgba(255,255,255,0.6)',
                            flexShrink: 0,
                        }}
                        onClick={exitStudy}
                    >
                        <ArrowLeft size={14} /> {set?.name ?? 'Set'}
                    </button>

                    <p
                        style={{
                            fontFamily: "'Fraunces', serif",
                            fontWeight: 700,
                            color: '#fafaf9',
                            fontSize: '1rem',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {currentIndex + 1}{' '}
                        <span style={{ color: 'rgba(255,255,255,0.3)' }}>
                            / {cards.length}
                        </span>
                    </p>

                    <button
                        className="pill-btn"
                        style={{
                            background: 'rgba(251,191,36,0.12)',
                            border: '1px solid rgba(251,191,36,0.25)',
                            color: '#fbbf24',
                            fontWeight: 600,
                            flexShrink: 0,
                        }}
                        onClick={exitStudy}
                    >
                        <BookOpen size={13} /> Browse
                    </button>
                </div>

                {/* Progress */}
                <div
                    style={{
                        height: 2,
                        background: 'rgba(255,255,255,0.06)',
                        flexShrink: 0,
                    }}
                >
                    <div
                        style={{
                            height: '100%',
                            background: '#fbbf24',
                            width: `${progress}%`,
                            transition: 'width 0.3s ease',
                            borderRadius: '0 2px 2px 0',
                        }}
                    />
                </div>

                {/* Card area */}
                <div
                    style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '2rem 1.5rem',
                        gap: '2rem',
                    }}
                >
                    {/* Dot indicators */}
                    <div
                        style={{
                            display: 'flex',
                            gap: '5px',
                            flexWrap: 'wrap',
                            justifyContent: 'center',
                            maxWidth: '400px',
                        }}
                    >
                        {cards.map((_, i) => (
                            <div
                                key={i}
                                onClick={() => {
                                    if (!animating) {
                                        setFlipped(false)
                                        setCurrentIndex(i)
                                    }
                                }}
                                style={{
                                    width: i === currentIndex ? 18 : 6,
                                    height: 6,
                                    borderRadius: 999,
                                    background:
                                        i === currentIndex ? '#fbbf24' : 'rgba(255,255,255,0.1)',
                                    transition: 'all 0.3s',
                                    cursor: 'pointer',
                                }}
                            />
                        ))}
                    </div>

                    {/* Flip card */}
                    <div className="study-card" onClick={flipCard}>
                        <div className={`study-card-inner ${flipped ? 'flipped' : ''}`}>
                            <div className="study-card-face study-card-front">
                                <p
                                    style={{
                                        fontSize: '0.6rem',
                                        letterSpacing: '0.12em',
                                        textTransform: 'uppercase',
                                        color: 'rgba(255,255,255,0.22)',
                                        fontWeight: 600,
                                        marginBottom: '1rem',
                                    }}
                                >
                                    Question
                                </p>
                                <p
                                    className={animating ? '' : 'fade-slide'}
                                    style={{
                                        fontFamily: "'Fraunces', serif",
                                        fontSize: 'clamp(1.1rem, 3vw, 1.6rem)',
                                        fontWeight: 700,
                                        color: '#fafaf9',
                                        lineHeight: 1.4,
                                    }}
                                >
                                    {card?.front}
                                </p>
                                <p
                                    style={{
                                        marginTop: '1.5rem',
                                        fontSize: '0.72rem',
                                        color: 'rgba(255,255,255,0.18)',
                                    }}
                                >
                                    Click or press Space to reveal
                                </p>
                            </div>
                            <div className="study-card-face study-card-back">
                                <p
                                    style={{
                                        fontSize: '0.6rem',
                                        letterSpacing: '0.12em',
                                        textTransform: 'uppercase',
                                        color: 'rgba(251,191,36,0.5)',
                                        fontWeight: 600,
                                        marginBottom: '1rem',
                                    }}
                                >
                                    Answer
                                </p>
                                <p
                                    className={animating ? '' : 'fade-slide'}
                                    style={{
                                        fontFamily: "'Fraunces', serif",
                                        fontSize: 'clamp(1rem, 2.5vw, 1.35rem)',
                                        fontWeight: 700,
                                        color: '#fafaf9',
                                        lineHeight: 1.5,
                                    }}
                                >
                                    {card?.back}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button
                            className="nav-btn"
                            onClick={() => navigate(-1)}
                            disabled={currentIndex === 0}
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <button
                            className="pill-btn"
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'rgba(255,255,255,0.5)',
                                fontSize: '0.78rem',
                            }}
                            onClick={flipCard}
                        >
                            <RotateCcw size={13} /> Flip
                        </button>
                        <button
                            className="nav-btn"
                            onClick={() => navigate(1)}
                            disabled={currentIndex === cards.length - 1}
                        >
                            <ArrowRight size={20} />
                        </button>
                    </div>

                    {currentIndex === cards.length - 1 && (
                        <button
                            className="pill-btn"
                            style={{
                                background: '#fbbf24',
                                color: '#0c0a08',
                                fontWeight: 700,
                                border: 'none',
                                fontSize: '0.875rem',
                            }}
                            onClick={() => {
                                setCurrentIndex(0)
                                setFlipped(false)
                            }}
                        >
                            <RotateCcw size={14} /> Start over
                        </button>
                    )}

                    <p
                        style={{
                            fontSize: '0.7rem',
                            color: 'rgba(255,255,255,0.15)',
                            marginTop: '-0.5rem',
                        }}
                    >
                        ← → to navigate · Space to flip · Esc to exit
                    </p>
                </div>
            </div>
        )
    }

    // ── BROWSE MODE ────────────────────────────────────────────────────
    return (
        <main
            style={{
                background: '#0c0a08',
                minHeight: '100vh',
                fontFamily: "'DM Sans', sans-serif",
            }}
        >
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Fraunces:wght@700;900&display=swap');

                .cd-card {
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.07);
                    border-radius: 16px;
                    transition: border-color 0.2s;
                    position: relative;
                    overflow: hidden;
                }
                .cd-card-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 0;
                    border-radius: 12px;
                    border: 1px solid rgba(255,255,255,0.06);
                    background: rgba(255,255,255,0.02);
                    overflow: hidden;
                    transition: border-color 0.2s;
                }
                .cd-card-row:hover { border-color: rgba(251,191,36,0.15); }
                .cd-cell {
                    padding: 16px 20px;
                    font-size: 0.9rem;
                    color: rgba(255,255,255,0.75);
                    line-height: 1.5;
                }
                .cd-cell-front {
                    border-right: 1px solid rgba(255,255,255,0.06);
                    font-weight: 600;
                    color: #fafaf9;
                }
                .cd-input {
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    color: #fafaf9;
                    border-radius: 10px;
                    padding: 10px 14px;
                    font-size: 0.875rem;
                    font-family: 'DM Sans', sans-serif;
                    outline: none;
                    width: 100%;
                    resize: vertical;
                    transition: border-color 0.2s;
                    box-sizing: border-box;
                }
                .cd-input:focus { border-color: rgba(251,191,36,0.4); box-shadow: 0 0 0 3px rgba(251,191,36,0.08); }
                .cd-input::placeholder { color: rgba(255,255,255,0.2); }
                .cd-btn-primary {
                    display: inline-flex; align-items: center; gap: 6px;
                    padding: 9px 18px; border-radius: 10px;
                    background: #fbbf24; color: #0c0a08; font-weight: 700; border: none;
                    font-size: 0.875rem; cursor: pointer; transition: all 0.2s;
                    font-family: 'DM Sans', sans-serif;
                }
                .cd-btn-primary:hover { filter: brightness(1.08); transform: translateY(-1px); box-shadow: 0 4px 20px rgba(251,191,36,0.25); }
                .cd-btn-outline {
                    display: inline-flex; align-items: center; gap: 6px;
                    padding: 9px 18px; border-radius: 10px;
                    background: transparent; color: rgba(255,255,255,0.6);
                    border: 1px solid rgba(255,255,255,0.12);
                    font-size: 0.875rem; cursor: pointer; transition: all 0.2s;
                    font-family: 'DM Sans', sans-serif;
                }
                .cd-btn-outline:hover { border-color: rgba(255,255,255,0.25); color: #fafaf9; }
                .cd-btn-icon {
                    display: inline-flex; align-items: center; justify-content: center;
                    width: 32px; height: 32px; border-radius: 8px;
                    border: 1px solid rgba(255,255,255,0.08);
                    background: transparent; color: rgba(255,255,255,0.4);
                    cursor: pointer; transition: all 0.2s;
                }
                .cd-btn-icon:hover { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.8); border-color: rgba(255,255,255,0.15); }
                .cd-btn-delete:hover { background: rgba(248,113,113,0.1); color: #f87171; border-color: rgba(248,113,113,0.2); }
                .code-pill {
                    display: inline-flex; align-items: center; gap: 4px;
                    font-size: 0.7rem; padding: 3px 9px; border-radius: 999px;
                    background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.35); font-family: monospace;
                }
                .study-btn {
                    display: inline-flex; align-items: center; gap: 8px;
                    padding: 12px 28px; border-radius: 14px;
                    background: #fbbf24; color: #0c0a08; font-weight: 700; border: none;
                    font-size: 0.95rem; cursor: pointer; transition: all 0.2s;
                    font-family: 'DM Sans', sans-serif;
                }
                .study-btn:hover { filter: brightness(1.1); transform: translateY(-2px); box-shadow: 0 8px 30px rgba(251,191,36,0.3); }
                .hero-glow { background: radial-gradient(ellipse 60% 40% at 50% 0%, rgba(251,191,36,0.08) 0%, transparent 70%); }
                .section-label {
                    font-size: 0.62rem; letter-spacing: 0.1em; text-transform: uppercase;
                    font-weight: 600; color: rgba(255,255,255,0.22); margin-bottom: 1rem;
                }
                .divider { height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent); margin: 2rem 0; }
            `}</style>

            <div className="mx-auto max-w-4xl px-6 pb-20">
                <div className="hero-glow pt-12 pb-8">
                    {/* Back + breadcrumb */}
                    <Link
                        href="/flashcards"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: 'rgba(255,255,255,0.4)',
                            fontSize: '0.8rem',
                            marginBottom: '1.5rem',
                            textDecoration: 'none',
                            transition: 'color 0.2s',
                        }}
                        onMouseEnter={(e) =>
                            (e.currentTarget.style.color = 'rgba(255,255,255,0.75)')
                        }
                        onMouseLeave={(e) =>
                            (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')
                        }
                    >
                        <ArrowLeft size={13} /> Flashcards
                    </Link>

                    {loading ? (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                color: 'rgba(255,255,255,0.3)',
                                fontSize: '0.875rem',
                            }}
                        >
                            <div
                                style={{
                                    width: 18,
                                    height: 18,
                                    borderRadius: '50%',
                                    border: '2px solid rgba(251,191,36,0.2)',
                                    borderTopColor: '#fbbf24',
                                    animation: 'spin 0.7s linear infinite',
                                }}
                            />
                            Loading…
                            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                        </div>
                    ) : set ? (
                        <>
                            {/* Header */}
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    justifyContent: 'space-between',
                                    gap: '1.5rem',
                                    flexWrap: 'wrap',
                                }}
                            >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            marginBottom: '8px',
                                            flexWrap: 'wrap',
                                        }}
                                    >
                                        <span className="code-pill">
                                            <Hash size={9} />
                                            {set.code}
                                        </span>
                                        <span className="code-pill">
                                            {set.published ? <Globe size={9} /> : <Lock size={9} />}
                                            {set.published ? 'Public' : 'Private'}
                                        </span>
                                        <span
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                fontSize: '0.7rem',
                                                color: 'rgba(251,191,36,0.6)',
                                                fontWeight: 600,
                                            }}
                                        >
                                            <Layers size={9} />
                                            {cards.length} card{cards.length !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                    <h1
                                        style={{
                                            fontFamily: "'Fraunces', serif",
                                            fontSize: 'clamp(1.8rem, 5vw, 2.5rem)',
                                            fontWeight: 900,
                                            color: '#fafaf9',
                                            lineHeight: 1.1,
                                            letterSpacing: '-0.02em',
                                            marginBottom: '0.5rem',
                                        }}
                                    >
                                        {set.name}
                                    </h1>
                                    <MarkdownContent
                                        content={set.description}
                                        className="prose prose-sm max-w-none"
                                        style={{
                                            color: 'rgba(255,255,255,0.42)',
                                            fontSize: '0.875rem',
                                            lineHeight: 1.65,
                                        }}
                                    />
                                </div>

                                {/* Study button */}
                                {cards.length > 0 && (
                                    <button
                                        className="study-btn"
                                        onClick={startStudy}
                                        style={{ flexShrink: 0 }}
                                    >
                                        <FlipHorizontal size={17} /> Study
                                    </button>
                                )}
                            </div>
                        </>
                    ) : (
                        <p style={{ color: 'rgba(255,255,255,0.3)' }}>Set not found.</p>
                    )}
                </div>

                {set && (
                    <>
                        <div className="divider" />

                        {/* Cards list */}
                        <div>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: '1.25rem',
                                }}
                            >
                                <p className="section-label" style={{ margin: 0 }}>
                                    Cards
                                </p>
                                {isOwner && (
                                    <button
                                        className="cd-btn-outline"
                                        style={{ fontSize: '0.78rem', padding: '6px 14px' }}
                                        onClick={() => {
                                            setAddingCard(true)
                                            setNewFront('')
                                            setNewBack('')
                                        }}
                                    >
                                        <Plus size={13} /> Add card
                                    </button>
                                )}
                            </div>

                            {/* Add card form */}
                            {addingCard && (
                                <div
                                    className="cd-card"
                                    style={{
                                        padding: '16px',
                                        marginBottom: '12px',
                                        borderColor: 'rgba(251,191,36,0.2)',
                                    }}
                                >
                                    <div
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: '1fr 1fr',
                                            gap: '12px',
                                            marginBottom: '12px',
                                        }}
                                    >
                                        <div>
                                            <p
                                                className="section-label"
                                                style={{ marginBottom: '6px', fontSize: '0.6rem' }}
                                            >
                                                Front (question)
                                            </p>
                                            <textarea
                                                value={newFront}
                                                onChange={(e) => setNewFront(e.target.value)}
                                                className="cd-input"
                                                placeholder="e.g. What is photosynthesis?"
                                                rows={3}
                                            />
                                        </div>
                                        <div>
                                            <p
                                                className="section-label"
                                                style={{ marginBottom: '6px', fontSize: '0.6rem' }}
                                            >
                                                Back (answer)
                                            </p>
                                            <textarea
                                                value={newBack}
                                                onChange={(e) => setNewBack(e.target.value)}
                                                className="cd-input"
                                                placeholder="The process plants use to make food from sunlight"
                                                rows={3}
                                            />
                                        </div>
                                    </div>
                                    <div
                                        style={{
                                            display: 'flex',
                                            gap: '8px',
                                            justifyContent: 'flex-end',
                                        }}
                                    >
                                        <button
                                            className="cd-btn-outline"
                                            style={{ fontSize: '0.8rem', padding: '7px 14px' }}
                                            onClick={() => setAddingCard(false)}
                                        >
                                            <X size={13} /> Cancel
                                        </button>
                                        <button
                                            className="cd-btn-primary"
                                            onClick={() => void addCard()}
                                        >
                                            <Check size={13} /> Save card
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Cards */}
                            <div
                                style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
                            >
                                {cards.length === 0 && !addingCard && (
                                    <div
                                        style={{
                                            textAlign: 'center',
                                            padding: '3rem 0',
                                            color: 'rgba(255,255,255,0.2)',
                                            fontSize: '0.875rem',
                                        }}
                                    >
                                        <FlipHorizontal
                                            size={32}
                                            style={{ margin: '0 auto 10px', opacity: 0.25 }}
                                        />
                                        No cards yet.{isOwner ? ' Add your first card above.' : ''}
                                    </div>
                                )}

                                {cards.map((card, i) => (
                                    <div key={card.id}>
                                        {editingCard?.id === card.id ? (
                                            /* Edit form */
                                            <div
                                                className="cd-card"
                                                style={{
                                                    padding: '16px',
                                                    borderColor: 'rgba(251,191,36,0.2)',
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        display: 'grid',
                                                        gridTemplateColumns: '1fr 1fr',
                                                        gap: '12px',
                                                        marginBottom: '12px',
                                                    }}
                                                >
                                                    <div>
                                                        <p
                                                            className="section-label"
                                                            style={{ marginBottom: '6px', fontSize: '0.6rem' }}
                                                        >
                                                            Front
                                                        </p>
                                                        <textarea
                                                            value={editingCard.front}
                                                            onChange={(e) =>
                                                                setEditingCard({
                                                                    ...editingCard,
                                                                    front: e.target.value,
                                                                })
                                                            }
                                                            className="cd-input"
                                                            rows={3}
                                                        />
                                                    </div>
                                                    <div>
                                                        <p
                                                            className="section-label"
                                                            style={{ marginBottom: '6px', fontSize: '0.6rem' }}
                                                        >
                                                            Back
                                                        </p>
                                                        <textarea
                                                            value={editingCard.back}
                                                            onChange={(e) =>
                                                                setEditingCard({
                                                                    ...editingCard,
                                                                    back: e.target.value,
                                                                })
                                                            }
                                                            className="cd-input"
                                                            rows={3}
                                                        />
                                                    </div>
                                                </div>
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        gap: '8px',
                                                        justifyContent: 'flex-end',
                                                    }}
                                                >
                                                    <button
                                                        className="cd-btn-outline"
                                                        style={{ fontSize: '0.8rem', padding: '7px 14px' }}
                                                        onClick={() => setEditingCard(null)}
                                                    >
                                                        <X size={13} /> Cancel
                                                    </button>
                                                    <button
                                                        className="cd-btn-primary"
                                                        onClick={() => void saveEdit()}
                                                    >
                                                        <Check size={13} /> Save
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            /* Card row */
                                            <div
                                                style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}
                                            >
                                                <div className="cd-card-row" style={{ flex: 1 }}>
                                                    <div className="cd-cell cd-cell-front">
                                                        <p
                                                            style={{
                                                                fontSize: '0.6rem',
                                                                letterSpacing: '0.08em',
                                                                textTransform: 'uppercase',
                                                                color: 'rgba(255,255,255,0.2)',
                                                                fontWeight: 600,
                                                                marginBottom: '4px',
                                                            }}
                                                        >
                                                            {i + 1}
                                                        </p>
                                                        {card.front}
                                                    </div>
                                                    <div
                                                        className="cd-cell"
                                                        style={{ color: 'rgba(255,255,255,0.55)' }}
                                                    >
                                                        <p
                                                            style={{
                                                                fontSize: '0.6rem',
                                                                letterSpacing: '0.08em',
                                                                textTransform: 'uppercase',
                                                                color: 'rgba(251,191,36,0.35)',
                                                                fontWeight: 600,
                                                                marginBottom: '4px',
                                                            }}
                                                        >
                                                            Answer
                                                        </p>
                                                        {card.back}
                                                    </div>
                                                </div>
                                                {isOwner && (
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: '4px',
                                                            paddingLeft: '8px',
                                                            justifyContent: 'center',
                                                        }}
                                                    >
                                                        <button
                                                            className="cd-btn-icon"
                                                            onClick={() => setEditingCard(card)}
                                                            title="Edit"
                                                        >
                                                            <Pencil size={13} />
                                                        </button>
                                                        <button
                                                            className="cd-btn-icon cd-btn-delete"
                                                            onClick={() => void deleteCard(card.id)}
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Start studying CTA at bottom if cards exist */}
                        {cards.length > 1 && (
                            <div
                                style={{
                                    marginTop: '3rem',
                                    display: 'flex',
                                    justifyContent: 'center',
                                }}
                            >
                                <button className="study-btn" onClick={startStudy}>
                                    <FlipHorizontal size={17} /> Study {cards.length} cards
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </main>
    )
}
