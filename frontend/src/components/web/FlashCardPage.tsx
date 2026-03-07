'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { FileDropzone } from './Dropzone'
import { generateAIFlashcards, FlashcardCard } from '@/lib/flashcards'
import { saveFlashcardDraft } from '@/lib/ai-handoff'
import {
    Edit,
    ArrowLeft,
    ArrowRight,
    RotateCcw,
    Save,
    Layers,
} from 'lucide-react'

export function FlashCardPage() {
    const router = useRouter()
    const [fileTexts, setFileTexts] = useState<string[]>([])
    const [longText, setLongText] = useState('')
    const [flashcards, setFlashcards] = useState<FlashcardCard[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Study mode state
    const [studying, setStudying] = useState(false)
    const [currentIndex, setCurrentIndex] = useState(0)
    const [flipped, setFlipped] = useState(false)
    const [animating, setAnimating] = useState(false)

    const handleUploadedFiles = async (texts: string[]) => {
        const updatedTexts = [...fileTexts, ...texts]
        setFileTexts(updatedTexts)
        await generateFromTexts(updatedTexts)
    }

    const generateFromTexts = async (texts: string[]) => {
        setError(null)
        setLoading(true)
        setFlashcards([])
        setStudying(false)
        try {
            const combinedText = texts.join('\n\n') + '\n\n' + longText
            if (!combinedText.trim()) throw new Error('Notes cannot be empty')
            const cards = await generateAIFlashcards(combinedText)
            setFlashcards(cards)
        } catch (err: unknown) {
            if (err instanceof Error) setError(err.message)
            else setError('Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    const handleGenerate = async () => {
        await generateFromTexts(fileTexts)
    }

    const sendToFlashcardsEditor = () => {
        if (flashcards.length === 0) return
        saveFlashcardDraft({
            name: 'AI Flashcards',
            description: longText.trim() || 'Generated from uploaded documents.',
            cards: flashcards,
        })
        router.push('/flashcards')
    }

    const startStudying = () => {
        setCurrentIndex(0)
        setFlipped(false)
        setStudying(true)
    }

    const navigate = (dir: 1 | -1) => {
        if (animating) return
        setAnimating(true)
        setFlipped(false)
        setTimeout(() => {
            setCurrentIndex((prev) =>
                Math.max(0, Math.min(flashcards.length - 1, prev + dir)),
            )
            setAnimating(false)
        }, 200)
    }

    const flipCard = () => {
        if (animating) return
        setFlipped((f) => !f)
    }

    // STUDY MODE
    if (studying && flashcards.length > 0) {
        const card = flashcards[currentIndex]
        const progress = ((currentIndex + 1) / flashcards.length) * 100

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

          .study-card {
            width: 100%;
            max-width: 600px;
            height: 320px;
            perspective: 1200px;
            cursor: pointer;
          }
          .study-card-inner {
            width: 100%;
            height: 100%;
            position: relative;
            transform-style: preserve-3d;
            transition: transform 0.55s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .study-card-inner.flipped {
            transform: rotateY(180deg);
          }
          .study-card-face {
            position: absolute;
            inset: 0;
            backface-visibility: hidden;
            -webkit-backface-visibility: hidden;
            border-radius: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 2.5rem;
            text-align: center;
            /* Ensure GPU compositing so backface-visibility works reliably */
            transform: translateZ(0);
          }
          .study-card-front {
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.1);
            /* Front sits at Z=0 by default */
          }
          .study-card-back {
            background: rgba(251,191,36,0.06);
            border: 1px solid rgba(251,191,36,0.25);
            /* Rotate 180deg around Y so it faces the other way */
            transform: rotateY(180deg) translateZ(0);
          }
          .nav-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            border: 1px solid rgba(255,255,255,0.1);
            background: rgba(255,255,255,0.04);
            color: rgba(255,255,255,0.6);
            cursor: pointer;
            transition: all 0.2s;
          }
          .nav-btn:hover:not(:disabled) {
            border-color: rgba(255,255,255,0.2);
            background: rgba(255,255,255,0.08);
            color: #fafaf9;
          }
          .nav-btn:disabled { opacity: 0.25; cursor: not-allowed; }
          .pill-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 16px;
            border-radius: 999px;
            font-size: 0.82rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
          }
          .fade-slide { animation: fadeSlide 0.2s ease; }
          @keyframes fadeSlide { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
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
                    }}
                >
                    {/* Left: back to generator */}
                    <button
                        className="pill-btn"
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'rgba(255,255,255,0.6)',
                            flexShrink: 0,
                        }}
                        onClick={() => {
                            setStudying(false)
                            setFlipped(false)
                        }}
                    >
                        <ArrowLeft size={14} /> Generator
                    </button>

                    {/* Center: card count */}
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
                            / {flashcards.length}
                        </span>
                    </p>

                    {/* Right: save set */}
                    <button
                        className="pill-btn"
                        style={{
                            background: 'rgba(251,191,36,0.12)',
                            border: '1px solid rgba(251,191,36,0.25)',
                            color: '#fbbf24',
                            fontWeight: 600,
                            flexShrink: 0,
                        }}
                        onClick={sendToFlashcardsEditor}
                    >
                        <Save size={13} /> Save set
                    </button>
                </div>

                {/* Progress bar */}
                <div style={{ height: 2, background: 'rgba(255,255,255,0.06)' }}>
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
                    {/* Stack preview dots */}
                    <div style={{ display: 'flex', gap: '5px', marginBottom: '-8px' }}>
                        {flashcards.map((_, i) => (
                            <div
                                key={i}
                                style={{
                                    width: i === currentIndex ? 18 : 6,
                                    height: 6,
                                    borderRadius: 999,
                                    background:
                                        i === currentIndex ? '#fbbf24' : 'rgba(255,255,255,0.1)',
                                    transition: 'all 0.3s',
                                }}
                            />
                        ))}
                    </div>

                    {/* The card */}
                    <div className="study-card" onClick={flipCard}>
                        <div className={`study-card-inner ${flipped ? 'flipped' : ''}`}>
                            <div className="study-card-face study-card-front">
                                <p
                                    style={{
                                        fontSize: '0.65rem',
                                        letterSpacing: '0.12em',
                                        textTransform: 'uppercase',
                                        color: 'rgba(255,255,255,0.25)',
                                        fontWeight: 600,
                                        marginBottom: '1rem',
                                    }}
                                >
                                    Front
                                </p>
                                <p
                                    className={animating ? '' : 'fade-slide'}
                                    style={{
                                        fontFamily: "'Fraunces', serif",
                                        fontSize: 'clamp(1.1rem, 3vw, 1.5rem)',
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
                                        fontSize: '0.75rem',
                                        color: 'rgba(255,255,255,0.2)',
                                    }}
                                >
                                    Click to reveal answer
                                </p>
                            </div>
                            <div className="study-card-face study-card-back">
                                <p
                                    style={{
                                        fontSize: '0.65rem',
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
                                        fontSize: 'clamp(1rem, 2.5vw, 1.3rem)',
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
                            <ArrowLeft size={18} />
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
                            <RotateCcw size={12} /> Flip
                        </button>
                        <button
                            className="nav-btn"
                            onClick={() => navigate(1)}
                            disabled={currentIndex === flashcards.length - 1}
                        >
                            <ArrowRight size={18} />
                        </button>
                    </div>

                    {currentIndex === flashcards.length - 1 && (
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
                </div>
            </div>
        )
    }

    // GENERATOR MODE
    return (
        <div
            style={{
                background: '#0c0a08',
                minHeight: '100vh',
                fontFamily: "'DM Sans', sans-serif",
            }}
        >
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Fraunces:wght@700;900&display=swap');
        .fc-tab-list { background: rgba(255,255,255,0.04) !important; border: 1px solid rgba(255,255,255,0.08) !important; border-radius: 12px !important; padding: 3px !important; }
        .fc-tab-trigger { border-radius: 9px !important; color: rgba(255,255,255,0.4) !important; font-size: 0.85rem !important; transition: all 0.2s !important; }
        .fc-tab-trigger[data-state="active"] { background: rgba(255,255,255,0.08) !important; color: #fafaf9 !important; }
        .fc-textarea { width: 100%; height: 100%; resize: none; outline: none; background: transparent; color: #fafaf9; font-family: 'DM Sans', sans-serif; font-size: 0.9rem; line-height: 1.6; }
        .fc-textarea::placeholder { color: rgba(255,255,255,0.2); }
        .fc-btn-primary { background: #fbbf24 !important; color: #0c0a08 !important; font-weight: 700 !important; border: none !important; border-radius: 10px !important; transition: all 0.2s !important; }
        .fc-btn-primary:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); box-shadow: 0 4px 20px rgba(251,191,36,0.3) !important; }
        .fc-btn-primary:disabled { opacity: 0.4 !important; transform: none !important; }
        .fc-btn-ghost { background: transparent !important; color: rgba(255,255,255,0.55) !important; border: 1px solid rgba(255,255,255,0.1) !important; border-radius: 10px !important; transition: all 0.2s !important; }
        .fc-btn-ghost:hover:not(:disabled) { border-color: rgba(255,255,255,0.2) !important; color: #fafaf9 !important; }
        .fc-btn-ghost:disabled { opacity: 0.3 !important; }

        .stack-card {
          position: absolute;
          width: 100%;
          border-radius: 16px;
          transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
        }
      `}</style>

            <div className="mx-auto max-w-3xl px-6 pb-16 pt-14">
                {/* Hero */}
                <div className="text-center mb-10">
                    <div
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 12px',
                            borderRadius: 999,
                            background: 'rgba(251,191,36,0.1)',
                            border: '1px solid rgba(251,191,36,0.2)',
                            color: '#fbbf24',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            marginBottom: '1rem',
                        }}
                    >
                        <Layers size={12} /> Flashcard Generator
                    </div>
                    <h1
                        style={{
                            fontFamily: "'Fraunces', serif",
                            fontSize: 'clamp(2rem, 5vw, 2.8rem)',
                            fontWeight: 900,
                            color: '#fafaf9',
                            letterSpacing: '-0.02em',
                            lineHeight: 1.1,
                        }}
                    >
                        Turn notes into
                        <br />
                        <span style={{ color: '#fbbf24' }}>flashcards.</span>
                    </h1>
                    <p
                        style={{
                            color: 'rgba(255,255,255,0.35)',
                            marginTop: '0.75rem',
                            fontSize: '0.95rem',
                        }}
                    >
                        Upload files or paste text — AI does the rest.
                    </p>
                </div>

                {/* Input tabs */}
                <Tabs defaultValue="files" className="w-full">
                    <TabsList className="fc-tab-list mb-4">
                        <TabsTrigger value="files" className="fc-tab-trigger">
                            Files
                        </TabsTrigger>
                        <TabsTrigger value="long-text" className="fc-tab-trigger">
                            Text
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="files">
                        <div
                            style={{
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '16px',
                                padding: '1.5rem',
                            }}
                        >
                            <FileDropzone onUploadComplete={handleUploadedFiles} />
                            {fileTexts.length > 0 && (
                                <div
                                    style={{
                                        marginTop: '1rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                    }}
                                >
                                    <div
                                        style={{
                                            width: 8,
                                            height: 8,
                                            borderRadius: '50%',
                                            background: '#10b981',
                                        }}
                                    />
                                    <p
                                        style={{
                                            fontSize: '0.82rem',
                                            color: 'rgba(255,255,255,0.45)',
                                        }}
                                    >
                                        {fileTexts.length} file{fileTexts.length > 1 ? 's' : ''}{' '}
                                        processed
                                    </p>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="long-text">
                        <div
                            style={{
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '16px',
                                padding: '1.25rem',
                                position: 'relative',
                                height: '280px',
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            <textarea
                                value={longText}
                                onChange={(e) => setLongText(e.target.value)}
                                className="fc-textarea"
                                placeholder="Paste your notes here…"
                                style={{ flex: 1 }}
                            />
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'flex-end',
                                    paddingTop: '10px',
                                    borderTop: '1px solid rgba(255,255,255,0.06)',
                                    gap: '8px',
                                }}
                            >
                                <Button
                                    className="fc-btn-ghost"
                                    onClick={sendToFlashcardsEditor}
                                    disabled={flashcards.length === 0}
                                >
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                    className="fc-btn-primary"
                                    onClick={handleGenerate}
                                    disabled={loading}
                                >
                                    {loading ? 'Generating…' : 'Generate'}
                                </Button>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>

                {/* Error */}
                {error && (
                    <p
                        style={{
                            marginTop: '1rem',
                            color: '#f87171',
                            fontSize: '0.85rem',
                            textAlign: 'center',
                        }}
                    >
                        {error}
                    </p>
                )}

                {/* Loading shimmer */}
                {loading && (
                    <div
                        style={{
                            marginTop: '2rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '12px',
                        }}
                    >
                        <div
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                border: '3px solid rgba(251,191,36,0.2)',
                                borderTopColor: '#fbbf24',
                                animation: 'spin 0.8s linear infinite',
                            }}
                        />
                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>
                            Generating flashcards…
                        </p>
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                )}

                {/* Stack preview + Study button */}
                {flashcards.length > 0 && !loading && (
                    <div
                        style={{
                            marginTop: '3rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '2rem',
                        }}
                    >
                        {/* Card stack visual */}
                        <div
                            style={{
                                position: 'relative',
                                width: '100%',
                                maxWidth: '440px',
                                height: '180px',
                            }}
                        >
                            {/* Shadow cards */}
                            {[2, 1].map((offset) => (
                                <div
                                    key={offset}
                                    className="stack-card"
                                    style={{
                                        height: '160px',
                                        background: `rgba(255,255,255,${0.02 * offset})`,
                                        border: '1px solid rgba(255,255,255,0.06)',
                                        top: `${offset * 8}px`,
                                        left: `${offset * 6}px`,
                                        right: `${offset * 6}px`,
                                        width: `calc(100% - ${offset * 12}px)`,
                                    }}
                                />
                            ))}
                            {/* Top card */}
                            <div
                                className="stack-card"
                                style={{
                                    height: '160px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.12)',
                                    top: 0,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    padding: '1.5rem',
                                    textAlign: 'center',
                                }}
                            >
                                <p
                                    style={{
                                        fontSize: '0.65rem',
                                        letterSpacing: '0.1em',
                                        textTransform: 'uppercase',
                                        color: 'rgba(255,255,255,0.25)',
                                        fontWeight: 600,
                                    }}
                                >
                                    Preview
                                </p>
                                <p
                                    style={{
                                        fontFamily: "'Fraunces', serif",
                                        fontWeight: 700,
                                        fontSize: '1.05rem',
                                        color: '#fafaf9',
                                        lineHeight: 1.4,
                                    }}
                                >
                                    {flashcards[0]?.front}
                                </p>
                            </div>
                        </div>

                        {/* Count + actions */}
                        <div
                            style={{
                                textAlign: 'center',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '12px',
                            }}
                        >
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>
                                <span
                                    style={{
                                        color: '#fbbf24',
                                        fontWeight: 700,
                                        fontSize: '1.1rem',
                                    }}
                                >
                                    {flashcards.length}
                                </span>{' '}
                                cards generated
                            </p>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    onClick={startStudying}
                                    style={{
                                        background: '#fbbf24',
                                        color: '#0c0a08',
                                        fontWeight: 700,
                                        border: 'none',
                                        borderRadius: '12px',
                                        padding: '12px 28px',
                                        fontSize: '0.9rem',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={(e) => {
                                        ; (e.currentTarget as HTMLButtonElement).style.filter =
                                            'brightness(1.1)'
                                            ; (e.currentTarget as HTMLButtonElement).style.transform =
                                                'translateY(-2px)'
                                    }}
                                    onMouseLeave={(e) => {
                                        ; (e.currentTarget as HTMLButtonElement).style.filter = ''
                                            ; (e.currentTarget as HTMLButtonElement).style.transform = ''
                                    }}
                                >
                                    <Layers size={15} /> Study now
                                </button>
                                <button
                                    onClick={sendToFlashcardsEditor}
                                    style={{
                                        background: 'transparent',
                                        color: 'rgba(255,255,255,0.55)',
                                        border: '1px solid rgba(255,255,255,0.12)',
                                        borderRadius: '12px',
                                        padding: '12px 20px',
                                        fontSize: '0.9rem',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={(e) => {
                                        ; (e.currentTarget as HTMLButtonElement).style.borderColor =
                                            'rgba(255,255,255,0.25)'
                                            ; (e.currentTarget as HTMLButtonElement).style.color =
                                                '#fafaf9'
                                    }}
                                    onMouseLeave={(e) => {
                                        ; (e.currentTarget as HTMLButtonElement).style.borderColor =
                                            'rgba(255,255,255,0.12)'
                                            ; (e.currentTarget as HTMLButtonElement).style.color =
                                                'rgba(255,255,255,0.55)'
                                    }}
                                >
                                    <Save size={14} /> Save set
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
