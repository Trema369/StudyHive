"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
} from "@/components/ui/dialog";
import { getAuthUser } from "@/lib/auth";
import { MarkdownContent } from "@/components/web/markdown-content";
import { MarkdownEditor } from "@/components/web/markdown-editor";

export type FlashcardSet = {
  id?: string;
  userId?: string;
  name?: string;
  published?: boolean;
  description?: string;
  code?: string;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5082";

export default function FlashcardsPage() {
  const [userId, setUserId] = useState("");
  const [sets, setSets] = useState<FlashcardSet[]>([]);
  const [discoverSets, setDiscoverSets] = useState<FlashcardSet[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [published, setPublished] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [search, setSearch] = useState("");

  const syncAuth = () => setUserId(getAuthUser()?.id ?? "");

  const loadData = async () => {
    if (!userId) return;
    const [mineRes, discoverRes] = await Promise.all([
      fetch(`${API_BASE}/api/flashcards/user/${userId}`),
      fetch(
        `${API_BASE}/api/flashcards/search?query=${encodeURIComponent(search)}`,
      ),
    ]);
    if (mineRes.ok) setSets((await mineRes.json()) as FlashcardSet[]);
    if (discoverRes.ok) {
      const rows = (await discoverRes.json()) as FlashcardSet[];
      setDiscoverSets(rows.filter((x) => x.published || x.userId === userId));
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
    void loadData();
  }, [userId, search]);

  const createSet = async () => {
    if (!userId || !name.trim() || !description.trim()) return;
    await fetch(`${API_BASE}/api/flashcards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        name: name.trim(),
        description: description.trim(),
        published,
      }),
    });

    setName("");
    setDescription("");
    setPublished(false);
    setDialogOpen(false);

    await loadData();
  };

  const joinByCode = async () => {
    if (!joinCode.trim()) return;
    const res = await fetch(
      `${API_BASE}/api/flashcards/code/${encodeURIComponent(joinCode.trim())}`,
    );
    const set = (await res.json()) as FlashcardSet;
    window.location.href = `/flashcards/${set.id}`;
  };

  return (
    <main className="mx-auto max-w-6xl min-h-screen overflow-y-auto p-6 space-y-6 py-30">
      <section className="rounded-lg border p-4 space-y-3">
        <h1 className="text-3xl font-semibold">Flashcards</h1>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!userId}
            onClick={() => {
              setDialogMode("create");
              setDialogOpen(true);
            }}
          >
            Create set
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setDialogMode("join");
              setDialogOpen(true);
            }}
          >
            Share code
          </Button>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search flashcard sets"
            className="max-w-sm"
          />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border p-4 space-y-3">
          <h2 className="font-semibold">Your sets</h2>
          <div className="space-y-2">
            {sets.map((set) => (
              <Link
                key={set.id}
                href={`/flashcards/${set.id}`}
                className="block rounded-md border p-3 hover:bg-muted"
              >
                <div className="font-medium">{set.name}</div>
                <MarkdownContent
                  className="prose prose-sm max-w-none line-clamp-3 text-muted-foreground dark:prose-invert"
                  content={set.description ?? ""}
                />
                <div className="text-xs text-muted-foreground">
                  {set.published ? "Public" : "Private"} • Code: {set.code}
                </div>
              </Link>
            ))}
            {sets.length === 0 && (
              <p className="text-sm text-muted-foreground">No sets yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border p-4 space-y-3">
          <h2 className="font-semibold">Discover</h2>
          <div className="space-y-2">
            {discoverSets.map((set) => (
              <Link
                key={set.id}
                href={`/flashcards/${set.id}`}
                className="block rounded-md border p-3 hover:bg-muted"
              >
                <div className="font-medium">{set.name}</div>
                <MarkdownContent
                  className="prose prose-sm max-w-none line-clamp-3 text-muted-foreground dark:prose-invert"
                  content={set.description ?? ""}
                />
                <div className="text-xs text-muted-foreground">
                  {set.published ? "Public" : "Private"} • Code: {set.code}
                </div>
              </Link>
            ))}
            {discoverSets.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No discoverable sets.
              </p>
            )}
          </div>
        </div>
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogOverlay className="fixed inset-0 bg-black/30 backdrop-blur-md" />
        <DialogContent className="sm:max-w-xl w-[95vw]">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "create" ? "Create set" : "Open by code"}
            </DialogTitle>
          </DialogHeader>
          {dialogMode === "create" ? (
            <div className="space-y-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
              />
              <MarkdownEditor
                value={description}
                onChange={setDescription}
                placeholder="Description"
                minRows={8}
              />
              <label className="text-sm flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={published}
                  onChange={(e) => setPublished(e.target.checked)}
                />
                Public
              </label>
              <Button onClick={() => void createSet()}>Create</Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Enter Share code"
              />
              <Button onClick={() => void joinByCode()}>Open set</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
