"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarkdownContent } from "@/components/web/markdown-content";
import { MarkdownEditor } from "@/components/web/markdown-editor";
import { AttachmentPreview } from "@/components/web/attachment-preview";
import { Attachment, uploadFile } from "@/lib/uploads";
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
                <MarkdownEditor
                  value={editingBack}
                  onChange={setEditingBack}
                  placeholder="Back"
                  minRows={4}
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
                      <MarkdownEditor
                        value={editingBack}
                        onChange={setEditingBack}
                        placeholder="Back"
                        minRows={4}
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
