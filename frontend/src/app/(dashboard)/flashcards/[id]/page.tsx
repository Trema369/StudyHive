"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarkdownContent } from "@/components/web/markdown-content";
import { MarkdownEditor } from "@/components/web/markdown-editor";
import { AttachmentPreview } from "@/components/web/attachment-preview";
import { AIAppendControls } from "@/components/web/ai-append-controls";
import { Attachment, uploadFile } from "@/lib/uploads";
import { generateAIAppend, getAIModels, type AIAppendMode } from "@/lib/ai-append";
import { getAuthUser } from "@/lib/auth";
import { FlashcardSet } from "../page";

type FlashCard = {
  id?: string;
  front?: string;
  back?: string;
  flashcardId?: string;
  frontAttachments?: Attachment[];
  backAttachments?: Attachment[];
};

type ParsedAICard = { front: string; back: string };

function normalizeCard(front?: string, back?: string): ParsedAICard | null {
  const f = (front ?? "").trim();
  const b = (back ?? "").trim();
  if (!f || !b) return null;
  return { front: f, back: b };
}

function parseCardsFromJsonLike(raw: string): ParsedAICard[] {
  const tryParse = (text: string): unknown => {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  };

  const mapped: ParsedAICard[] = [];
  const pushFromNode = (node: any) => {
    if (!node || typeof node !== "object") return;
    const n = normalizeCard(
      node.front ?? node.question ?? node.prompt,
      node.back ?? node.answer ?? node.response,
    );
    if (n) mapped.push(n);
  };

  const direct = tryParse(raw);
  if (Array.isArray(direct)) {
    direct.forEach(pushFromNode);
    return mapped;
  }
  if (direct && typeof direct === "object") {
    const cards = (direct as any).cards;
    if (Array.isArray(cards)) {
      cards.forEach(pushFromNode);
      return mapped;
    }
    pushFromNode(direct);
    if (mapped.length > 0) return mapped;
  }

  const codeBlocks = raw.match(/```(?:json)?\s*([\s\S]*?)```/gi) ?? [];
  for (const block of codeBlocks) {
    const stripped = block.replace(/```(?:json)?/i, "").replace(/```$/, "").trim();
    const parsed = tryParse(stripped);
    if (Array.isArray(parsed)) parsed.forEach(pushFromNode);
    else if (parsed && typeof parsed === "object") {
      const cards = (parsed as any).cards;
      if (Array.isArray(cards)) cards.forEach(pushFromNode);
      else pushFromNode(parsed);
    }
  }
  return mapped;
}

function parseCardsFromLabeledText(raw: string): ParsedAICard[] {
  const cards: ParsedAICard[] = [];

  const frontBackRegex =
    /(?:^|\n)\s*(?:card\s*\d+\s*[:.-]?\s*)?(?:front|q(?:uestion)?)\s*:\s*([\s\S]*?)\n\s*(?:back|a(?:nswer)?)\s*:\s*([\s\S]*?)(?=\n\s*(?:card\s*\d+\s*[:.-]?\s*)?(?:front|q(?:uestion)?)\s*:|\n{2,}|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = frontBackRegex.exec(raw)) !== null) {
    const n = normalizeCard(m[1], m[2]);
    if (n) cards.push(n);
  }
  if (cards.length > 0) return cards;

  const qaRegex =
    /(?:^|\n)\s*(?:\d+[.)-]?\s*)?(?:q(?:uestion)?)\s*[:.-]?\s*([\s\S]*?)\n\s*(?:a(?:nswer)?)\s*[:.-]?\s*([\s\S]*?)(?=\n\s*(?:\d+[.)-]?\s*)?(?:q(?:uestion)?)\s*[:.-]?|\n{2,}|$)/gi;
  while ((m = qaRegex.exec(raw)) !== null) {
    const n = normalizeCard(m[1], m[2]);
    if (n) cards.push(n);
  }
  return cards;
}

function parseAIBulkCards(raw: string): ParsedAICard[] {
  const fromJson = parseCardsFromJsonLike(raw);
  const fromLabeled = parseCardsFromLabeledText(raw);
  const combined = [...fromJson, ...fromLabeled];
  const unique = new Map<string, ParsedAICard>();
  for (const c of combined) {
    unique.set(`${c.front}\u0000${c.back}`, c);
  }
  return Array.from(unique.values());
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5082";

export default function FlashcardSetPage() {
  const params = useParams<{ id: string }>();
  const setId = params?.id ?? "";

  const [userId, setUserId] = useState("");
  const [setInfo, setSetInfo] = useState<FlashcardSet | null>(null);
  const [cards, setCards] = useState<FlashCard[]>([]);
  const [tab, setTab] = useState<"study" | "cards" | "settings">("study");

  const [setName, setSetName] = useState("");
  const [setDescription, setSetDescription] = useState("");
  const [setPublished, setSetPublished] = useState(false);

  const [editingCardId, setEditingCardId] = useState("");
  const [editingFront, setEditingFront] = useState("");
  const [editingBack, setEditingBack] = useState("");
  const [editingFrontAttachments, setEditingFrontAttachments] = useState<
    Attachment[]
  >([]);
  const [editingBackAttachments, setEditingBackAttachments] = useState<
    Attachment[]
  >([]);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [bulkAIMode, setBulkAIMode] = useState<AIAppendMode>("extrapolate");
  const [bulkAIModels, setBulkAIModels] = useState<string[]>([]);
  const [bulkAIModel, setBulkAIModel] = useState("ministral");
  const [bulkAIPrompt, setBulkAIPrompt] = useState("");
  const [bulkAILoading, setBulkAILoading] = useState(false);
  const [bulkAIStatus, setBulkAIStatus] = useState("");

  const [studyIndex, setStudyIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);

  const canEdit = !!userId && setInfo?.userId === userId;
  const activeCard = useMemo(
    () => cards[studyIndex] ?? null,
    [cards, studyIndex],
  );

  const syncAuth = () => setUserId(getAuthUser()?.id ?? "");

  const loadSet = async () => {
    if (!setId) return;
    const [setRes, cardsRes] = await Promise.all([
      fetch(`${API_BASE}/api/flashcards/${setId}`),
      fetch(`${API_BASE}/api/flashcards/${setId}/cards`),
    ]);
    const set = (await setRes.json()) as FlashcardSet;
    setSetInfo(set);
    setSetName(set.name ?? "");
    setSetDescription(set.description ?? "");
    setSetPublished(!!set.published);

    if (cardsRes.ok) {
      const rows = (await cardsRes.json()) as FlashCard[];
      setCards(rows);
      setStudyIndex((idx) =>
        rows.length === 0 ? 0 : Math.min(idx, rows.length - 1),
      );
      setShowBack(false);
    }
  };

  useEffect(() => {
    syncAuth();
    window.addEventListener("auth-changed", syncAuth);
    window.addEventListener("storage", syncAuth);
    return () => {
      window.removeEventListener("auth-changed", syncAuth);
      window.removeEventListener("storage", syncAuth);
    };
  }, []);

  useEffect(() => {
    void loadSet();
  }, [setId]);

  useEffect(() => {
    void (async () => {
      const rows = await getAIModels();
      if (rows.length === 0) return;
      setBulkAIModels(rows);
      if (!rows.includes(bulkAIModel)) setBulkAIModel(rows[0]);
    })();
  }, []);

  const saveSet = async () => {
    if (!canEdit || !setId) return;
    await fetch(`${API_BASE}/api/flashcards/${setId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: setName,
        description: setDescription,
        published: setPublished,
      }),
    });
    await loadSet();
  };

  const addCardAttachments = async (
    files: FileList | null,
    side: "front" | "back",
  ) => {
    if (!files || files.length === 0) return;
    setUploadingAttachments(true);
    try {
      const uploaded = await Promise.all(
        Array.from(files).map((f) => uploadFile(API_BASE, f)),
      );
      if (side === "front") {
        setEditingFrontAttachments((prev) => [...prev, ...uploaded]);
      } else {
        setEditingBackAttachments((prev) => [...prev, ...uploaded]);
      }
    } finally {
      setUploadingAttachments(false);
    }
  };

  const createCard = async () => {
    if (!canEdit || !setId || !editingFront.trim() || !editingBack.trim())
      return;
    await fetch(`${API_BASE}/api/flashcards/${setId}/cards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        front: editingFront.trim(),
        back: editingBack.trim(),
        frontAttachments: editingFrontAttachments,
        backAttachments: editingBackAttachments,
      }),
    });
    setEditingCardId("");
    setEditingFront("");
    setEditingBack("");
    setEditingFrontAttachments([]);
    setEditingBackAttachments([]);
    await loadSet();
  };

  const startCardEdit = (card: FlashCard) => {
    setEditingCardId(card.id ?? "");
    setEditingFront(card.front ?? "");
    setEditingBack(card.back ?? "");
    setEditingFrontAttachments(card.frontAttachments ?? []);
    setEditingBackAttachments(card.backAttachments ?? []);
  };

  const cancelCardEdit = () => {
    setEditingCardId("");
    setEditingFront("");
    setEditingBack("");
    setEditingFrontAttachments([]);
    setEditingBackAttachments([]);
  };

  const startCreateCard = () => {
    setEditingCardId("new");
    setEditingFront("");
    setEditingBack("");
    setEditingFrontAttachments([]);
    setEditingBackAttachments([]);
  };

  const saveCard = async () => {
    if (
      !canEdit ||
      !setId ||
      !editingCardId ||
      !editingFront.trim() ||
      !editingBack.trim()
    )
      return;
    await fetch(`${API_BASE}/api/flashcards/${setId}/cards/${editingCardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        front: editingFront.trim(),
        back: editingBack.trim(),
        frontAttachments: editingFrontAttachments,
        backAttachments: editingBackAttachments,
      }),
    });
    cancelCardEdit();
    await loadSet();
  };

  const deleteCard = async (cardId?: string) => {
    if (!canEdit || !setId || !cardId) return;
    await fetch(`${API_BASE}/api/flashcards/${setId}/cards/${cardId}`, {
      method: "DELETE",
    });
    if (editingCardId === cardId) cancelCardEdit();
    await loadSet();
  };

  const shuffleCards = () => {
    if (cards.length < 2) return;
    const shuffled = [...cards];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setCards(shuffled);
    setStudyIndex(0);
    setShowBack(false);
  };

  const createAIBulkCards = async () => {
    if (!canEdit || !setId) return;
    if (bulkAIMode !== "extrapolate" && !bulkAIPrompt.trim()) {
      setBulkAIStatus("Prompt is required for this mode");
      return;
    }
    setBulkAILoading(true);
    setBulkAIStatus("");
    try {
      const existingCardData = cards
        .map(
          (c, i) =>
            `Card ${i + 1}\nFront: ${c.front ?? ""}\nBack: ${c.back ?? ""}`,
        )
        .join("\n\n");
      const content = existingCardData || "No existing cards yet.";
      const prompt =
        bulkAIMode === "prompt"
          ? `${bulkAIPrompt.trim()}\n\nReturn multiple flashcards as JSON array: [{\"front\":\"...\",\"back\":\"...\"}]. You may also include Front:/Back: blocks as fallback.`
          : bulkAIMode === "prompt_assisted"
            ? `${bulkAIPrompt.trim()}\n\nGenerate additional flashcards based on existing cards. Prefer JSON array [{\"front\":\"...\",\"back\":\"...\"}], fallback Front:/Back:.`
            : "Generate additional flashcards from the existing cards. Prefer JSON array [{\"front\":\"...\",\"back\":\"...\"}], fallback Front:/Back:.";
      const raw = await generateAIAppend(
        bulkAIMode,
        content,
        prompt,
        "flashcards",
        bulkAIModel,
      );
      const parsed = parseAIBulkCards(raw);
      if (parsed.length === 0) {
        setBulkAIStatus("No parseable flashcards returned by AI (JSON or Front/Back)");
        return;
      }
      for (const card of parsed) {
        await fetch(`${API_BASE}/api/flashcards/${setId}/cards`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            front: card.front,
            back: card.back,
            frontAttachments: [],
            backAttachments: [],
          }),
        });
      }
      setBulkAIStatus(`Added ${parsed.length} AI cards`);
      await loadSet();
    } catch (e) {
      setBulkAIStatus(e instanceof Error ? e.message : "Failed to generate cards");
    } finally {
      setBulkAILoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-7xl min-h-screen overflow-y-auto p-6 space-y-6 py-30">
      <section className="rounded-lg border p-4 space-y-3">
        <h1 className="text-3xl font-semibold">
          {setInfo?.name ?? "Flashcard set"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {setInfo?.description ?? "Loading..."} • Code:{" "}
          <span className="font-mono">{setInfo?.code ?? "—"}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={tab === "study" ? "default" : "outline"}
            onClick={() => setTab("study")}
          >
            Study
          </Button>
          <Button
            variant={tab === "cards" ? "default" : "outline"}
            onClick={() => setTab("cards")}
            disabled={!canEdit}
          >
            Cards
          </Button>
          <Button
            variant={tab === "settings" ? "default" : "outline"}
            onClick={() => setTab("settings")}
            disabled={!canEdit}
          >
            Settings
          </Button>
        </div>
      </section>

      {tab === "study" ? (
        <section className="rounded-lg border p-4 space-y-4">
          {activeCard ? (
            <>
              <button
                type="button"
                onClick={() => setShowBack((v) => !v)}
                className="w-full rounded-lg border p-6 min-h-72 text-left"
              >
                <div className="text-xs text-muted-foreground mb-2">
                  Card {studyIndex + 1} / {cards.length}
                </div>
                <MarkdownContent
                  className="prose prose-sm dark:prose-invert max-w-none"
                  content={
                    (showBack ? activeCard.back : activeCard.front) ?? ""
                  }
                />
                <AttachmentPreview
                  attachments={
                    showBack
                      ? activeCard.backAttachments
                      : activeCard.frontAttachments
                  }
                />
              </button>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setShowBack((v) => !v)}>
                  {showBack ? "Show front" : "Show back"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setStudyIndex(
                      (idx) => (idx - 1 + cards.length) % cards.length,
                    );
                    setShowBack(false);
                  }}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setStudyIndex((idx) => (idx + 1) % cards.length);
                    setShowBack(false);
                  }}
                >
                  Next
                </Button>
                <Button variant="outline" onClick={shuffleCards}>
                  Shuffle
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No cards yet.</p>
          )}
        </section>
      ) : tab === "cards" ? (
        <section className="rounded-lg border p-4 space-y-3">
          <div className="rounded-md border p-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={bulkAIModel}
                onChange={(e) => setBulkAIModel(e.target.value)}
                className="rounded-md border bg-background p-2 text-sm"
              >
                {bulkAIModels.length === 0 && (
                  <option value="ministral">ministral</option>
                )}
                {bulkAIModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={bulkAIMode}
                onChange={(e) => setBulkAIMode(e.target.value as AIAppendMode)}
                className="rounded-md border bg-background p-2 text-sm"
              >
                <option value="extrapolate">Extrapolate</option>
                <option value="prompt_assisted">Prompt assisted</option>
                <option value="prompt">Prompt only</option>
              </select>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void createAIBulkCards()}
                disabled={bulkAILoading}
              >
                {bulkAILoading ? "Generating..." : "AI Add Multiple Cards"}
              </Button>
            </div>
            {bulkAIMode !== "extrapolate" && (
              <Input
                value={bulkAIPrompt}
                onChange={(e) => setBulkAIPrompt(e.target.value)}
                placeholder="Prompt"
              />
            )}
            {!!bulkAIStatus && (
              <p className="text-xs text-muted-foreground">{bulkAIStatus}</p>
            )}
          </div>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Cards ({cards.length})</h2>
            <Button
              size="sm"
              onClick={startCreateCard}
              disabled={editingCardId === "new"}
            >
              Add card
            </Button>
          </div>
          <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
            {editingCardId === "new" && (
              <div className="rounded border p-2 space-y-2">
                <MarkdownEditor
                  value={editingFront}
                  onChange={setEditingFront}
                  placeholder="Front"
                  minRows={4}
                />
                <AIAppendControls
                  domain="flashcard front"
                  content={editingFront}
                  onAppend={(text) =>
                    setEditingFront((prev) => (prev ? `${prev}\n${text}` : text))
                  }
                />
                <MarkdownEditor
                  value={editingBack}
                  onChange={setEditingBack}
                  placeholder="Back"
                  minRows={4}
                />
                <AIAppendControls
                  domain="flashcard back"
                  content={editingBack}
                  onAppend={(text) =>
                    setEditingBack((prev) => (prev ? `${prev}\n${text}` : text))
                  }
                />
                <label className="inline-flex">
                  <input
                    type="file"
                    className="hidden"
                    multiple
                    onChange={(e) =>
                      void addCardAttachments(e.target.files, "front")
                    }
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    disabled={uploadingAttachments}
                    asChild
                  >
                    <span>
                      {uploadingAttachments
                        ? "Uploading..."
                        : "Attach front files"}
                    </span>
                  </Button>
                </label>
                <AttachmentPreview
                  attachments={editingFrontAttachments}
                  onRemove={(idx) =>
                    setEditingFrontAttachments((prev) =>
                      prev.filter((_, i) => i !== idx),
                    )
                  }
                />
                <label className="inline-flex">
                  <input
                    type="file"
                    className="hidden"
                    multiple
                    onChange={(e) =>
                      void addCardAttachments(e.target.files, "back")
                    }
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    disabled={uploadingAttachments}
                    asChild
                  >
                    <span>
                      {uploadingAttachments
                        ? "Uploading..."
                        : "Attach back files"}
                    </span>
                  </Button>
                </label>
                <AttachmentPreview
                  attachments={editingBackAttachments}
                  onRemove={(idx) =>
                    setEditingBackAttachments((prev) =>
                      prev.filter((_, i) => i !== idx),
                    )
                  }
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => void createCard()}>
                    Create
                  </Button>
                  <Button size="sm" variant="outline" onClick={cancelCardEdit}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            {cards.map((card) => {
              const isEditing = editingCardId === card.id;
              return (
                <div key={card.id} className="rounded border p-2 space-y-2">
                  {isEditing ? (
                    <>
                      <MarkdownEditor
                        value={editingFront}
                        onChange={setEditingFront}
                        placeholder="Front"
                        minRows={4}
                      />
                      <AIAppendControls
                        domain="flashcard front"
                        content={editingFront}
                        onAppend={(text) =>
                          setEditingFront((prev) =>
                            prev ? `${prev}\n${text}` : text,
                          )
                        }
                      />
                      <MarkdownEditor
                        value={editingBack}
                        onChange={setEditingBack}
                        placeholder="Back"
                        minRows={4}
                      />
                      <AIAppendControls
                        domain="flashcard back"
                        content={editingBack}
                        onAppend={(text) =>
                          setEditingBack((prev) =>
                            prev ? `${prev}\n${text}` : text,
                          )
                        }
                      />
                      <label className="inline-flex">
                        <input
                          type="file"
                          className="hidden"
                          multiple
                          onChange={(e) =>
                            void addCardAttachments(e.target.files, "front")
                          }
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          type="button"
                          disabled={uploadingAttachments}
                          asChild
                        >
                          <span>
                            {uploadingAttachments
                              ? "Uploading..."
                              : "Attach front files"}
                          </span>
                        </Button>
                      </label>
                      <AttachmentPreview
                        attachments={editingFrontAttachments}
                        onRemove={(idx) =>
                          setEditingFrontAttachments((prev) =>
                            prev.filter((_, i) => i !== idx),
                          )
                        }
                      />
                      <label className="inline-flex">
                        <input
                          type="file"
                          className="hidden"
                          multiple
                          onChange={(e) =>
                            void addCardAttachments(e.target.files, "back")
                          }
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          type="button"
                          disabled={uploadingAttachments}
                          asChild
                        >
                          <span>
                            {uploadingAttachments
                              ? "Uploading..."
                              : "Attach back files"}
                          </span>
                        </Button>
                      </label>
                      <AttachmentPreview
                        attachments={editingBackAttachments}
                        onRemove={(idx) =>
                          setEditingBackAttachments((prev) =>
                            prev.filter((_, i) => i !== idx),
                          )
                        }
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => void saveCard()}>
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelCardEdit}
                        >
                          Cancel
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-sm font-medium line-clamp-2">
                        {card.front}
                      </div>
                      <div className="text-xs text-muted-foreground line-clamp-2">
                        {card.back}
                      </div>
                      <AttachmentPreview attachments={card.frontAttachments} />
                      <AttachmentPreview attachments={card.backAttachments} />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startCardEdit(card)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => void deleteCard(card.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
            {cards.length === 0 && editingCardId !== "new" && (
              <p className="text-sm text-muted-foreground">
                No cards in this set yet.
              </p>
            )}
          </div>
        </section>
      ) : (
        <section className="rounded-lg border p-4 space-y-3 max-w-3xl">
          <h2 className="font-semibold">Set settings</h2>
          <Input
            value={setName}
            onChange={(e) => setSetName(e.target.value)}
            placeholder="Set name"
          />
          <MarkdownEditor
            value={setDescription}
            onChange={setSetDescription}
            placeholder="Set description"
            minRows={10}
          />
          <AIAppendControls
            domain="flashcard set description"
            content={setDescription}
            onAppend={(text) =>
              setSetDescription((prev) => (prev ? `${prev}\n\n${text}` : text))
            }
          />
          <div className="rounded-md border p-3 text-sm space-y-1">
            <div>
              Share code:{" "}
              <span className="font-mono">
                {setInfo?.code ?? "N/A"}
              </span>
            </div>
          </div>
          <label className="text-sm flex items-center gap-2">
            <input
              type="checkbox"
              checked={setPublished}
              onChange={(e) => setSetPublished(e.target.checked)}
            />
            Public
          </label>
          <Button onClick={() => void saveSet()}>Save set</Button>
        </section>
      )}
    </main>
  );
}
