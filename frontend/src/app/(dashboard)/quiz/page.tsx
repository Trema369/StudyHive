"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { AIAppendControls } from "@/components/web/ai-append-controls";
import {
  clearQuizDraft,
  readQuizDraft,
  type QuizDraft,
} from "@/lib/ai-handoff";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5082";

type QuizSet = {
  id?: string;
  userId?: string;
  name?: string;
  published?: boolean;
  timerMinutes?: number | null;
  description?: string;
  code?: string;
};

export default function QuizPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [items, setItems] = useState<QuizSet[]>([]);
  const [discoverItems, setDiscoverItems] = useState<QuizSet[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [published, setPublished] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [search, setSearch] = useState("");
  const [incomingDraft, setIncomingDraft] = useState<QuizDraft | null>(null);

  const syncAuth = () => setUserId(getAuthUser()?.id ?? "");

  const loadData = async () => {
    if (!userId) return;
    const [mineRes, discoverRes] = await Promise.all([
      fetch(`${API_BASE}/api/quiz/user/${userId}`),
      fetch(`${API_BASE}/api/quiz/search?query=${encodeURIComponent(search)}`),
    ]);
    if (mineRes.ok) setItems((await mineRes.json()) as QuizSet[]);
    if (discoverRes.ok) {
      const rows = (await discoverRes.json()) as QuizSet[];
      setDiscoverItems(rows.filter((x) => x.published || x.userId === userId));
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
    const draft = readQuizDraft();
    if (!draft) return;
    setIncomingDraft(draft);
    setDialogMode("create");
    setDialogOpen(true);
    setName(draft.name || "AI Quiz");
    setDescription(draft.description || "");
  }, []);

  useEffect(() => {
    void loadData();
  }, [userId, search]);

  const createQuiz = async () => {
    if (!userId || !name.trim() || !description.trim()) return;
    const res = await fetch(`${API_BASE}/api/quiz`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        name: name.trim(),
        description: description.trim(),
        published,
        timerMinutes: timerMinutes.trim()
          ? Number.parseInt(timerMinutes, 10)
          : null,
      }),
    });
    const created = (await res.json()) as QuizSet;

    if (incomingDraft?.questions?.length && created.id) {
      for (const q of incomingDraft.questions) {
        if (!q.text?.trim()) continue;
        await fetch(`${API_BASE}/api/quiz/${created.id}/questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: q.text.trim(),
            type: q.type ?? "multiple_choice",
            attachments: q.attachments ?? [],
            answers: q.answers ?? [],
          }),
        });
      }
      clearQuizDraft();
      setIncomingDraft(null);
      setDialogOpen(false);
      router.push(`/quiz/${created.id}`);
      return;
    }

    setName("");
    setDescription("");
    setPublished(false);
    setTimerMinutes("");
    setDialogOpen(false);
    await loadData();
  };

  const joinByCode = async () => {
    if (!joinCode.trim()) return;
    const res = await fetch(
      `${API_BASE}/api/quiz/code/${encodeURIComponent(joinCode.trim())}`,
    );
    const set = (await res.json()) as QuizSet;
    window.location.href = `/quiz/${set.id}`;
  };

  return (
    <main className="mx-auto max-w-6xl min-h-screen overflow-y-auto p-6 space-y-6 py-30">
      <section className="rounded-lg border p-4 space-y-3">
        <h1 className="text-3xl font-semibold">Quizzes</h1>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!userId}
            onClick={() => {
              setDialogMode("create");
              setDialogOpen(true);
            }}
          >
            Create
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setDialogMode("join");
              setDialogOpen(true);
            }}
          >
            Add
          </Button>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search quizzes"
            className="max-w-sm"
          />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border p-4 space-y-3">
          <h2 className="font-semibold">Your quizzes</h2>
          <div className="space-y-2">
            {items.map((set) => (
              <Link
                key={set.id}
                href={`/quiz/${set.id}`}
                className="block rounded-md border p-3 hover:bg-muted"
              >
                <div className="font-medium">{set.name}</div>
                <MarkdownContent
                  className="prose prose-sm max-w-none line-clamp-3 text-muted-foreground dark:prose-invert"
                  content={set.description ?? ""}
                />
                <div className="text-xs text-muted-foreground">
                  {set.published ? "Public" : "Private"} • Code: {set.code}
                  {set.timerMinutes && set.timerMinutes > 0
                    ? ` • ${set.timerMinutes} min`
                    : ""}
                </div>
              </Link>
            ))}
            {items.length === 0 && (
              <p className="text-sm text-muted-foreground">No quizzes yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border p-4 space-y-3">
          <h2 className="font-semibold">Discover</h2>
          <div className="space-y-2">
            {discoverItems.map((set) => (
              <Link
                key={set.id}
                href={`/quiz/${set.id}`}
                className="block rounded-md border p-3 hover:bg-muted"
              >
                <div className="font-medium">{set.name}</div>
                <MarkdownContent
                  className="prose prose-sm max-w-none line-clamp-3 text-muted-foreground dark:prose-invert"
                  content={set.description ?? ""}
                />
                <div className="text-xs text-muted-foreground">
                  {set.published ? "Public" : "Private"} • Code: {set.code}
                  {set.timerMinutes && set.timerMinutes > 0
                    ? ` • ${set.timerMinutes} min`
                    : ""}
                </div>
              </Link>
            ))}
            {discoverItems.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No discoverable quizzes.
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
              {dialogMode === "create" ? "Create" : "Add"}
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
              <AIAppendControls
                domain="quiz description"
                content={description}
                onAppend={(text) =>
                  setDescription((prev) => (prev ? `${prev}\n\n${text}` : text))
                }
              />
              <label className="text-sm flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={published}
                  onChange={(e) => setPublished(e.target.checked)}
                />
                Public
              </label>
              <Input
                type="number"
                min={1}
                value={timerMinutes}
                onChange={(e) => setTimerMinutes(e.target.value)}
                placeholder="Timer (mins)"
              />
              <Button onClick={() => void createQuiz()}>Create</Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Enter share code"
              />
              <Button onClick={() => void joinByCode()}>Open quiz</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
