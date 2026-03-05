'use client'

import { useState } from 'react'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { FileDropzone } from './Dropzone'
import { Attachment } from '@/lib/uploads'
import { generateAIFlashcards, FlashcardCard } from '@/lib/flashcards'
import { FlashCard } from './flashcard'

export function FlashCardPage() {
    const [attachments, setAttachments] = useState<Attachment[]>([])
    const [longText, setLongText] = useState('')
    const [flashcards, setFlashcards] = useState<FlashcardCard[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Called when Dropzone successfully uploads files
    const handleUploadedFiles = async (files: Attachment[]) => {
        setAttachments((prev) => [...prev, ...files])
        // Optionally auto-generate flashcards on upload
        await generateFromFiles(files)
    }

    // Extract text from uploaded files via backend and generate flashcards
    const generateFromFiles = async (files: Attachment[]) => {
        setError(null)
        setLoading(true)
        setFlashcards([])

        try {
            let combinedText = longText

            // Fetch text from backend for each uploaded file
            const extractedTexts = await Promise.all(
                files.map(async (file) => {
                    if (!file.url) return ''

                    const formData = new FormData()
                    formData.append('fileUrl', file.url)

                    const res = await fetch(
                        `${process.env.NEXT_PUBLIC_API_BASE}/api/textextraction/from-url`,
                        {
                            method: 'POST',
                            body: formData,
                        },
                    )

                    if (!res.ok) return ''

                    const data = await res.json()
                    return data.text ?? ''
                }),
            )

            combinedText += '\n\n' + extractedTexts.join('\n\n')

            // Generate flashcards from combined text
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
        // Generate flashcards using existing attachments + textarea
        await generateFromFiles(attachments)
    }

    return (
        <div className="mt-40">
            <section className="mt-12 mb-10 text-center">
                <h1 className="text-4xl font-bold mb-5">Flash Card Generator</h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    Generate flash cards with AI using notes and uploaded files
                </p>
            </section>

            <section>
                <div className="flex justify-center">
                    <Tabs defaultValue="files" className="w-[800px]">
                        <TabsList>
                            <TabsTrigger value="files">Files</TabsTrigger>
                            <TabsTrigger value="long-text">Long Text</TabsTrigger>
                        </TabsList>

                        {/* FILE TAB */}
                        <TabsContent value="files">
                            <FileDropzone onUploadComplete={handleUploadedFiles} />

                            {attachments.length > 0 && (
                                <div className="mt-6 text-sm">
                                    <p className="font-medium mb-2">Uploaded Files:</p>
                                    <ul className="space-y-1 text-muted-foreground">
                                        {attachments.map((file, i) => (
                                            <li key={i}>{file.name}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </TabsContent>

                        {/* LONG TEXT TAB */}
                        <TabsContent value="long-text">
                            <Card className="relative mx-auto h-80 p-4">
                                <CardContent className="h-full pb-16">
                                    <textarea
                                        value={longText}
                                        onChange={(e) => setLongText(e.target.value)}
                                        className="w-full h-full resize-none outline-none focus:outline-none text-white"
                                        placeholder="Enter your text here..."
                                    />
                                </CardContent>

                                <div className="absolute bottom-4 right-4">
                                    <Button onClick={handleGenerate} disabled={loading}>
                                        {loading ? 'Generating...' : 'Generate'}
                                    </Button>
                                </div>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Flashcards display */}
                <div className="mt-10 flex flex-wrap gap-4 justify-center">
                    {error && <p className="text-red-500">{error}</p>}
                    {flashcards.map((card, i) => (
                        <FlashCard
                            key={i}
                            cardText={`Front: ${card.front}\nBack: ${card.back}`}
                        />
                    ))}
                </div>
            </section>
        </div>
    )
}
