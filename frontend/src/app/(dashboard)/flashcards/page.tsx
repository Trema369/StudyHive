'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogOverlay,
    DialogTitle,
} from '@/components/ui/dialog'
import { getAuthUser } from '@/lib/auth'
import { MarkdownContent } from '@/components/web/markdown-content'
import { MarkdownEditor } from '@/components/web/markdown-editor'
import { AIAppendControls } from '@/components/web/ai-append-controls'
import { FlashCardPage } from '@/components/web/FlashCardPage'
import {
    clearFlashcardDraft,
    readFlashcardDraft,
    type FlashcardDraft,
} from '@/lib/ai-handoff'
import {
    Plus,
    Hash,
    Search,
    FlipHorizontal,
    Compass,
    Lock,
    Globe,
    Sparkles,
    ArrowLeft,
    Wand2,
} from 'lucide-react'

export type FlashcardSet = {
    id?: string
    userId?: string
    name?: string
    published?: boolean
    description?: string
    code?: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5082'

export default function FlashcardsPage() {
    const router = useRouter()
    const [userId, setUserId] = useState('')
    const [sets, setSets] = useState<FlashcardSet[]>([])
    const [discoverSets, setDiscoverSets] = useState<FlashcardSet[]>([])
    const [dialogOpen, setDialogOpen] = useState(false)
    const [dialogMode, setDialogMode] = useState<'create' | 'join'>('create')
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [published, setPublished] = useState(false)
    const [joinCode, setJoinCode] = useState('')
    const [search, setSearch] = useState('')
    const [incomingDraft, setIncomingDraft] = useState<FlashcardDraft | null>(
        null,
    )
    const [showAiGenerator, setShowAiGenerator] = useState(false)

    const syncAuth = () => setUserId(getAuthUser()?.id ?? '')

    const loadData = async () => {
        if (!userId) return
        const [mineRes, discoverRes] = await Promise.all([
            fetch(`${API_BASE}/api/flashcards/user/${userId}`),
            fetch(
                `${API_BASE}/api/flashcards/search?query=${encodeURIComponent(search)}`,
            ),
        ])
        if (mineRes.ok) setSets((await mineRes.json()) as FlashcardSet[])
        if (discoverRes.ok) {
            const rows = (await discoverRes.json()) as FlashcardSet[]
            setDiscoverSets(rows.filter((x) => x.published || x.userId === userId))
        }
    }

    const pickUpDraft = () => {
        const draft = readFlashcardDraft()
        if (!draft) return
        setIncomingDraft(draft)
        setDialogMode('create')
        setName(draft.name || 'AI Flashcards')
        setDescription(draft.description || '')
        setDialogOpen(true)
    }

    useEffect(() => {
        syncAuth()
        window.addEventListener('auth-changed', syncAuth)
        window.addEventListener('storage', syncAuth)
        return () => {
            window.removeEventListener('auth-changed', syncAuth)
            window.removeEventListener('storage', syncAuth)
        }
    }, [])

    // Pick up any draft on first load (e.g. navigated from standalone FlashCardPage)
    useEffect(() => {
        pickUpDraft()
    }, [])

    useEffect(() => {
        void loadData()
    }, [userId, search])

    // Called by the embedded FlashCardPage after saving the draft
    const handleAiSaved = () => {
        setShowAiGenerator(false)
        pickUpDraft()
    }

    const createSet = async () => {
        if (!userId || !name.trim() || !description.trim()) return
        const createdRes = await fetch(`${API_BASE}/api/flashcards`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId,
                name: name.trim(),
                description: description.trim(),
                published,
            }),
        })
        const created = (await createdRes.json()) as FlashcardSet

        if (incomingDraft?.cards?.length && created.id) {
            for (const card of incomingDraft.cards) {
                if (!card.front?.trim() || !card.back?.trim()) continue
                await fetch(`${API_BASE}/api/flashcards/${created.id}/cards`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        front: card.front.trim(),
                        back: card.back.trim(),
                    }),
                })
            }
            clearFlashcardDraft()
            setIncomingDraft(null)
            setDialogOpen(false)
            router.push(`/flashcards/${created.id}`)
            return
        }

        setName('')
        setDescription('')
        setPublished(false)
        setDialogOpen(false)
        await loadData()
    }

    const joinByCode = async () => {
        if (!joinCode.trim()) return
        const res = await fetch(
            `${API_BASE}/api/flashcards/code/${encodeURIComponent(joinCode.trim())}`,
        )
        const set = (await res.json()) as FlashcardSet
        window.location.href = `/flashcards/${set.id}`
    }

    // ── AI Generator view ─────────────────────────────────────────────
    if (showAiGenerator) {
        return (
            <div
                style={{
                    background: '#0c0a08',
                    minHeight: '100vh',
                    fontFamily: "'DM Sans', sans-serif",
                }}
            >
                <div
                    style={{
                        padding: '14px 24px',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                    }}
                >
                    <button
                        onClick={() => setShowAiGenerator(false)}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 14px',
                            borderRadius: 999,
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'rgba(255,255,255,0.6)',
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontFamily: "'DM Sans', sans-serif",
                        }}
                        onMouseEnter={(e) => {
                            ; (e.currentTarget as HTMLButtonElement).style.color = '#fafaf9'
                                ; (e.currentTarget as HTMLButtonElement).style.borderColor =
                                    'rgba(255,255,255,0.2)'
                        }}
                        onMouseLeave={(e) => {
                            ; (e.currentTarget as HTMLButtonElement).style.color =
                                'rgba(255,255,255,0.6)'
                                ; (e.currentTarget as HTMLButtonElement).style.borderColor =
                                    'rgba(255,255,255,0.1)'
                        }}
                    >
                        <ArrowLeft size={13} /> Back to Flashcards
                    </button>
                    <span
                        style={{
                            fontSize: '0.72rem',
                            color: 'rgba(255,255,255,0.2)',
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            fontWeight: 600,
                        }}
                    >
                        AI Generator
                    </span>
                </div>
                {/* Pass onSaved so saving comes back here and opens the dialog */}
                <FlashCardPage onSaved={handleAiSaved} />
            </div>
        )
    }

    // ── Main view ─────────────────────────────────────────────────────
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
                .fc-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; transition: all 0.25s cubic-bezier(0.4,0,0.2,1); position: relative; overflow: hidden; }
                .fc-card:hover { background: rgba(255,255,255,0.05); border-color: rgba(251,191,36,0.2); transform: translateY(-2px); box-shadow: 0 12px 40px -8px rgba(0,0,0,0.4); }
                .fc-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(251,191,36,0.3), transparent); opacity: 0; transition: opacity 0.25s; }
                .fc-card:hover::before { opacity: 1; }
                .fc-input { background: rgba(255,255,255,0.05) !important; border: 1px solid rgba(255,255,255,0.1) !important; color: #fafaf9 !important; border-radius: 10px !important; transition: border-color 0.2s !important; }
                .fc-input:focus { border-color: rgba(251,191,36,0.4) !important; outline: none !important; box-shadow: 0 0 0 3px rgba(251,191,36,0.08) !important; }
                .fc-input::placeholder { color: rgba(255,255,255,0.25) !important; }
                .fc-btn-primary { background: #fbbf24 !important; color: #0c0a08 !important; font-weight: 600 !important; border: none !important; border-radius: 10px !important; transition: all 0.2s !important; }
                .fc-btn-primary:hover { background: #f59e0b !important; transform: translateY(-1px); box-shadow: 0 4px 20px rgba(251,191,36,0.3) !important; }
                .fc-btn-primary:disabled { background: rgba(251,191,36,0.3) !important; color: rgba(0,0,0,0.4) !important; transform: none !important; box-shadow: none !important; }
                .fc-btn-outline { background: transparent !important; color: rgba(255,255,255,0.7) !important; border: 1px solid rgba(255,255,255,0.12) !important; border-radius: 10px !important; transition: all 0.2s !important; }
                .fc-btn-outline:hover { border-color: rgba(255,255,255,0.25) !important; color: #fafaf9 !important; background: rgba(255,255,255,0.05) !important; }
                .fc-btn-ai { background: linear-gradient(135deg, rgba(251,191,36,0.15), rgba(245,158,11,0.08)) !important; color: #fbbf24 !important; border: 1px solid rgba(251,191,36,0.3) !important; border-radius: 10px !important; font-weight: 600 !important; transition: all 0.2s !important; }
                .fc-btn-ai:hover { background: linear-gradient(135deg, rgba(251,191,36,0.25), rgba(245,158,11,0.15)) !important; border-color: rgba(251,191,36,0.5) !important; transform: translateY(-1px); box-shadow: 0 4px 20px rgba(251,191,36,0.15) !important; }
                .set-row { display: block; padding: 14px 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02); transition: all 0.2s; text-decoration: none; }
                .set-row:hover { border-color: rgba(251,191,36,0.2); background: rgba(251,191,36,0.04); }
                .code-pill { display: inline-flex; align-items: center; gap: 4px; font-size: 0.7rem; padding: 2px 8px; border-radius: 999px; background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.35); font-family: monospace; }
                .draft-banner { background: linear-gradient(135deg, rgba(251,191,36,0.08), rgba(245,158,11,0.04)); border: 1px solid rgba(251,191,36,0.2); border-radius: 12px; padding: 12px 16px; }
                .dialog-dark { background: #141210 !important; border: 1px solid rgba(255,255,255,0.1) !important; border-radius: 20px !important; color: #fafaf9 !important; }
                .fc-checkbox { accent-color: #fbbf24; width: 15px; height: 15px; }
                .section-label { font-size: 0.65rem; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 600; color: rgba(255,255,255,0.25); margin-bottom: 1rem; }
            `}</style>

            <div className="mx-auto max-w-5xl px-6 pb-16">
                <div className="hero-glow pt-14 pb-10">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                            <div
                                className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full text-xs font-medium"
                                style={{
                                    background: 'rgba(251,191,36,0.1)',
                                    border: '1px solid rgba(251,191,36,0.2)',
                                    color: '#fbbf24',
                                }}
                            >
                                <FlipHorizontal size={12} /> Active Recall
                            </div>
                            <h1
                                style={{
                                    fontFamily: "'Fraunces', serif",
                                    fontSize: 'clamp(2rem, 5vw, 3rem)',
                                    fontWeight: 900,
                                    color: '#fafaf9',
                                    lineHeight: 1.1,
                                    letterSpacing: '-0.02em',
                                }}
                            >
                                Flashcards
                            </h1>
                            <p
                                style={{
                                    color: 'rgba(255,255,255,0.38)',
                                    marginTop: '0.5rem',
                                    fontSize: '0.95rem',
                                }}
                            >
                                Build, discover, and study sets with AI.
                            </p>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap pt-2">
                            <Button
                                className="fc-btn-ai gap-2"
                                onClick={() => setShowAiGenerator(true)}
                            >
                                <Wand2 size={14} /> Generate with AI
                            </Button>
                            <Button
                                className="fc-btn-primary gap-2"
                                disabled={!userId}
                                onClick={() => {
                                    setDialogMode('create')
                                    setDialogOpen(true)
                                }}
                            >
                                <Plus size={15} /> New set
                            </Button>
                            <Button
                                className="fc-btn-outline gap-2"
                                onClick={() => {
                                    setDialogMode('join')
                                    setDialogOpen(true)
                                }}
                            >
                                <Hash size={15} /> Join by code
                            </Button>
                        </div>
                    </div>

                    <div className="relative mt-6 max-w-sm">
                        <Search
                            size={14}
                            className="absolute left-3 top-1/2 -translate-y-1/2"
                            style={{ color: 'rgba(255,255,255,0.3)' }}
                        />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search flashcard sets…"
                            className="fc-input pl-9"
                        />
                    </div>

                    {incomingDraft && (
                        <div className="draft-banner mt-4 flex items-center gap-3">
                            <Sparkles size={15} style={{ color: '#fbbf24', flexShrink: 0 }} />
                            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                                <span style={{ color: '#fbbf24', fontWeight: 600 }}>
                                    AI draft ready
                                </span>{' '}
                                — {incomingDraft.cards.length} cards will be added to your next
                                set.
                            </p>
                        </div>
                    )}
                </div>

                <div className="grid gap-6 lg:grid-cols-2 mt-2">
                    <div className="fc-card p-5">
                        <p className="section-label flex items-center gap-2">
                            <FlipHorizontal size={11} /> Your sets
                        </p>
                        <div className="space-y-2">
                            {sets.map((set) => (
                                <Link
                                    key={set.id}
                                    href={`/flashcards/${set.id}`}
                                    className="set-row"
                                >
                                    <div
                                        style={{
                                            fontWeight: 600,
                                            color: '#fafaf9',
                                            fontSize: '0.9rem',
                                            marginBottom: '4px',
                                        }}
                                    >
                                        {set.name}
                                    </div>
                                    <MarkdownContent
                                        className="prose prose-sm max-w-none line-clamp-2"
                                        content={set.description ?? ''}
                                    />
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="code-pill">
                                            <Hash size={9} />
                                            {set.code}
                                        </span>
                                        <span className="code-pill">
                                            {set.published ? <Globe size={9} /> : <Lock size={9} />}
                                            {set.published ? 'Public' : 'Private'}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                            {sets.length === 0 && (
                                <div
                                    style={{
                                        textAlign: 'center',
                                        padding: '2rem 0',
                                        color: 'rgba(255,255,255,0.2)',
                                        fontSize: '0.85rem',
                                    }}
                                >
                                    <FlipHorizontal
                                        size={28}
                                        style={{ margin: '0 auto 8px', opacity: 0.3 }}
                                    />
                                    No sets yet. Create your first one!
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="fc-card p-5">
                        <p className="section-label flex items-center gap-2">
                            <Compass size={11} /> Discover
                        </p>
                        <div className="space-y-2">
                            {discoverSets.map((set) => (
                                <Link
                                    key={set.id}
                                    href={`/flashcards/${set.id}`}
                                    className="set-row"
                                >
                                    <div
                                        style={{
                                            fontWeight: 600,
                                            color: '#fafaf9',
                                            fontSize: '0.9rem',
                                            marginBottom: '4px',
                                        }}
                                    >
                                        {set.name}
                                    </div>
                                    <MarkdownContent
                                        className="prose prose-sm max-w-none line-clamp-2"
                                        content={set.description ?? ''}
                                    />
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="code-pill">
                                            <Hash size={9} />
                                            {set.code}
                                        </span>
                                        <span className="code-pill">
                                            {set.published ? <Globe size={9} /> : <Lock size={9} />}
                                            {set.published ? 'Public' : 'Private'}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                            {discoverSets.length === 0 && (
                                <div
                                    style={{
                                        textAlign: 'center',
                                        padding: '2rem 0',
                                        color: 'rgba(255,255,255,0.2)',
                                        fontSize: '0.85rem',
                                    }}
                                >
                                    <Compass
                                        size={28}
                                        style={{ margin: '0 auto 8px', opacity: 0.3 }}
                                    />
                                    No public sets found.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogOverlay className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
                <DialogContent className="dialog-dark sm:max-w-lg w-[95vw]">
                    <DialogHeader>
                        <DialogTitle
                            style={{
                                fontFamily: "'Fraunces', serif",
                                fontSize: '1.3rem',
                                fontWeight: 700,
                                color: '#fafaf9',
                            }}
                        >
                            {dialogMode === 'create' ? 'Create a new set' : 'Join by code'}
                        </DialogTitle>
                    </DialogHeader>

                    {dialogMode === 'create' ? (
                        <div className="space-y-3 mt-1">
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Set name"
                                className="fc-input"
                            />
                            <MarkdownEditor
                                value={description}
                                onChange={setDescription}
                                placeholder="Description (supports markdown)"
                                minRows={6}
                                className="fc-input"
                            />
                            <AIAppendControls
                                domain="flashcard set description"
                                content={description}
                                onAppend={(text) =>
                                    setDescription((prev) => (prev ? `${prev}\n\n${text}` : text))
                                }
                            />
                            <label
                                className="flex items-center gap-2 cursor-pointer"
                                style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}
                            >
                                <input
                                    type="checkbox"
                                    className="fc-checkbox"
                                    checked={published}
                                    onChange={(e) => setPublished(e.target.checked)}
                                />
                                Make this set public
                            </label>
                            <Button
                                className="fc-btn-primary w-full"
                                onClick={() => void createSet()}
                            >
                                Create set
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3 mt-1">
                            <Input
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value)}
                                placeholder="Enter share code"
                                className="fc-input"
                            />
                            <Button
                                className="fc-btn-primary w-full"
                                onClick={() => void joinByCode()}
                            >
                                Open set
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </main>
    )
}
