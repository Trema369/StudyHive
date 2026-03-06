"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Plus,
  Hash,
  Globe,
  Lock,
  DoorOpen,
  Users,
  Compass,
  Sparkles,
  LogIn,
} from "lucide-react";
import { AuthUser, getAuthUser } from "@/lib/auth";
import { MarkdownContent } from "@/components/web/markdown-content";
import { MarkdownEditor } from "@/components/web/markdown-editor";
import { cn } from "@/lib/utils";

export type ClassItem = {
  id?: string;
  name?: string;
  description?: string;
  userIds?: string[];
  teacherIds?: string[];
  code?: string;
  isPublic?: boolean;
  accentColor?: string;
  pinnedLinks?: PinnedLink[];
};

export type PinnedLink = {
  title?: string;
  url?: string;
  code?: string;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5082";

function ColonyCard({ clss }: { clss: ClassItem }) {
  const accent = clss.accentColor ?? "#3b82f6";
  return (
    <Link
      href={`/classes/${clss.id}`}
      className="group relative flex flex-col gap-2 rounded-xl border border-border bg-card p-4 hover:bg-muted/40 transition-all duration-200 overflow-hidden"
    >
      {/* Accent bar */}
      <span
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
        style={{ background: accent }}
      />

      <div className="pl-2 flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm leading-tight group-hover:text-primary transition-colors">
            {clss.name ?? "Untitled Colony"}
          </h3>
          <Badge
            variant={clss.isPublic ? "secondary" : "outline"}
            className="text-[10px] flex-shrink-0 gap-1"
          >
            {clss.isPublic ? (
              <>
                <Globe className="h-2.5 w-2.5" /> Public
              </>
            ) : (
              <>
                <Lock className="h-2.5 w-2.5" /> Private
              </>
            )}
          </Badge>
        </div>

        <MarkdownContent
          className="prose prose-xs max-w-none text-muted-foreground dark:prose-invert line-clamp-2 text-xs"
          content={clss.description ?? "No description"}
        />

        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
          <Hash className="h-3 w-3" />
          <span>{clss.code ?? "no code"}</span>
        </div>
      </div>
    </Link>
  );
}

function PublicColonyCard({
  clss,
  alreadyJoined,
  onJoin,
}: {
  clss: ClassItem;
  alreadyJoined: boolean;
  onJoin: () => void;
}) {
  const accent = clss.accentColor ?? "#3b82f6";
  return (
    <div className="group relative flex flex-col gap-2 rounded-xl border border-border bg-card p-4 overflow-hidden transition-all duration-200 hover:bg-muted/40">
      <span
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
        style={{ background: accent }}
      />

      <div className="pl-2 flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm leading-tight">
            {clss.name ?? "Untitled Colony"}
          </h3>
          <Badge
            variant="secondary"
            className="text-[10px] flex-shrink-0 gap-1"
          >
            <Globe className="h-2.5 w-2.5" /> Public
          </Badge>
        </div>

        <MarkdownContent
          className="prose prose-xs max-w-none text-muted-foreground dark:prose-invert line-clamp-2 text-xs"
          content={clss.description ?? "No description"}
        />

        <div className="flex items-center gap-2 mt-2">
          {!alreadyJoined && (
            <Button size="sm" className="h-7 text-xs gap-1.5" onClick={onJoin}>
              <LogIn className="h-3.5 w-3.5" />
              Join
            </Button>
          )}
          {alreadyJoined && (
            <Badge variant="outline" className="text-[10px] gap-1">
              <Users className="h-2.5 w-2.5" /> Joined
            </Badge>
          )}
          <Link href={`/classes/${clss.id}`}>
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1.5">
              <DoorOpen className="h-3.5 w-3.5" />
              View
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ClassesPage() {
  const [userId, setUserId] = useState("");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [publicClasses, setPublicClasses] = useState<ClassItem[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [accentColor, setAccentColor] = useState("#3b82f6");
  const [joinCode, setJoinCode] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "join">("create");

  const loadData = async () => {
    if (!userId) return;
    const [myRes, pubRes] = await Promise.all([
      fetch(`${API_BASE}/api/classes/user/${userId}`),
      fetch(`${API_BASE}/api/classes/public`),
    ]);
    if (myRes.ok) setClasses((await myRes.json()) as ClassItem[]);
    if (pubRes.ok) setPublicClasses((await pubRes.json()) as ClassItem[]);
  };

  useEffect(() => {
    const setUser = () => {
      const authUser = getAuthUser();
      setAuthUser(authUser);
      setUserId(authUser?.id ?? "");
    };
    setUser();
    window.addEventListener("auth-changed", setUser);
    window.addEventListener("storage", setUser);
    return () => {
      window.removeEventListener("auth-changed", setUser);
      window.removeEventListener("storage", setUser);
    };
  }, []);

  useEffect(() => {
    if (!userId) return;
    loadData();
  }, [userId]);

  const createClass = async () => {
    await fetch(`${API_BASE}/api/classes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        teacherId: userId,
        teacherUsername: authUser?.username,
        teacherEmail: authUser?.email,
        isPublic,
        accentColor,
      }),
    });
    setName("");
    setDescription("");
    setDialogOpen(false);
    await loadData();
  };

  const joinClass = async (codeOverride?: string) => {
    const codeToUse = (codeOverride ?? joinCode).trim();
    const res = await fetch(`${API_BASE}/api/classes/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, code: codeToUse }),
    });
    if (res.ok) {
      setJoinCode("");
      setDialogOpen(false);
    }
    await loadData();
  };

  const joinPublicClass = async (classId: string) => {
    if (!userId || !classId) return;
    await fetch(`${API_BASE}/api/classes/${classId}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    await loadData();
  };

  const joinedIds = new Set(classes.map((x) => x.id).filter(Boolean));

  return (
    <main className="mx-auto max-w-5xl min-h-screen p-6 py-10 space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Colonies</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create or join learning colonies to collaborate with others.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={!userId}
            onClick={() => {
              setDialogMode("join");
              setDialogOpen(true);
            }}
            className="gap-2"
          >
            <LogIn className="h-4 w-4" />
            Join
          </Button>
          <Button
            disabled={!userId}
            onClick={() => {
              setDialogMode("create");
              setDialogOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Create
          </Button>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">Your Colonies</h2>
          <Badge variant="secondary" className="text-xs">
            {classes.length}
          </Badge>
        </div>

        {classes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 py-14 text-center space-y-2">
            <Sparkles className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm font-medium">No colonies yet</p>
            <p className="text-xs text-muted-foreground">
              Create one or join with a code to get started.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {classes.map((clss) => (
              <ColonyCard key={clss.id} clss={clss} />
            ))}
          </div>
        )}
      </section>

      <Separator />

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">Discover Public Colonies</h2>
          <Badge variant="secondary" className="text-xs">
            {publicClasses.length}
          </Badge>
        </div>

        {publicClasses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 py-14 text-center space-y-2">
            <Globe className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm font-medium">No public colonies yet</p>
            <p className="text-xs text-muted-foreground">
              Check back later or create your own public colony.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {publicClasses.map((clss) => (
              <PublicColonyCard
                key={clss.id}
                clss={clss}
                alreadyJoined={!!clss.id && joinedIds.has(clss.id)}
                onJoin={() => void joinPublicClass(clss.id ?? "")}
              />
            ))}
          </div>
        )}
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogOverlay className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        <DialogContent className="sm:max-w-md rounded-2xl p-6 space-y-5">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl",
                  dialogMode === "create"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground",
                )}
              >
                {dialogMode === "create" ? (
                  <Plus className="h-4 w-4" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
              </div>
              <div>
                <DialogTitle className="text-base font-bold leading-tight">
                  {dialogMode === "create"
                    ? "Create a Colony"
                    : "Join a Colony"}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {dialogMode === "create"
                    ? "Set up a new learning space for your group."
                    : "Enter a signup code to join an existing colony."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Separator />

          {dialogMode === "create" ? (
            <div className="space-y-4">
              <Input
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <MarkdownEditor
                placeholder="Description"
                value={description}
                onChange={setDescription}
                minRows={4}
              />
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Accent colour</label>
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent p-0.5"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="rounded"
                  />
                  <label
                    htmlFor="isPublic"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Public
                  </label>
                </div>
              </div>
              <Button
                onClick={createClass}
                disabled={!name.trim()}
                className="w-full gap-2"
              >
                <Plus className="h-4 w-4" />
                Create
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Input
                placeholder="Enter signup code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void joinClass();
                }}
              />
              <Button
                onClick={() => void joinClass()}
                disabled={!joinCode.trim()}
                className="w-full gap-2"
              >
                <LogIn className="h-4 w-4" />
                Join Colony
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
