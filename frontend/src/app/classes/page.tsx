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
import { DoorOpen } from "lucide-react";
import { AuthUser, getAuthUser } from "@/lib/auth";
import { MarkdownContent } from "@/components/web/markdown-content";
import { MarkdownEditor } from "@/components/web/markdown-editor";

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
    const [myClasses, publicClasses] = await Promise.all([
      fetch(`${API_BASE}/api/classes/user/${userId}`),
      fetch(`${API_BASE}/api/classes/public`),
    ]);

    if (myClasses.ok) {
      setClasses((await myClasses.json()) as ClassItem[]);
    }

    if (publicClasses.ok) {
      setPublicClasses((await publicClasses.json()) as ClassItem[]);
    }
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
    if (!userId) {
      return;
    }
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
    } else {
      const payload = (await res.json().catch(() => null)) as {
        message?: string;
      } | null;
    }

    await loadData();
  };

  const joinPublicClass = async (classId: string) => {
    if (!userId || !classId) return;
    const res = await fetch(`${API_BASE}/api/classes/${classId}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as {
        message?: string;
      } | null;
      return;
    }
    await loadData();
  };

  return (
    <main className="mx-auto max-w-6xl min-h-screen overflow-y-auto p-6 space-y-6 py-30">
      <section className="rounded-lg border p-4 space-y-3">
        <h1 className="text-3xl font-semibold">Colonies</h1>
        <div className="flex gap-2">
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
            disabled={!userId}
            onClick={() => {
              setDialogMode("join");
              setDialogOpen(true);
            }}
          >
            Join
          </Button>
        </div>
      </section>

      <section className="rounded-lg border p-4 space-y-3">
        <h2 className="text-xl font-medium">Colonies you are in</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {classes.map((clss) => (
            <Link
              key={clss.id}
              href={`/classes/${clss.id}`}
              className="rounded-lg border p-3 hover:bg-muted/60"
              style={{
                borderLeft: `6px solid ${clss.accentColor ?? "#3b82f6"}`,
              }}
            >
              <h3 className="font-medium">{clss.name ?? "Untitled class"}</h3>
              <MarkdownContent
                className="prose prose-sm max-w-none text-muted-foreground dark:prose-invert"
                content={clss.description ?? "No description"}
              />
              <p className="text-xs text-muted-foreground mt-2">
                {clss.isPublic ? "Public" : "Private"} | Code:{" "}
                {clss.code ?? "none"}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-lg border p-4 space-y-3">
        <h2 className="text-xl font-medium">Discover public colonies</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {(() => {
            const joinedIds = new Set(classes.map((x) => x.id).filter(Boolean));
            return publicClasses.map((clss) => {
              const alreadyJoined = !!clss.id && joinedIds.has(clss.id);
              return (
                <div key={clss.id} className="rounded-lg border p-3">
                  <h3 className="font-medium">
                    {clss.name ?? "Untitled class"}
                  </h3>
                  <MarkdownContent
                    className="prose prose-sm max-w-none text-muted-foreground dark:prose-invert"
                    content={clss.description ?? "No description"}
                  />
                  <div className="mt-2 flex gap-2">
                    {!alreadyJoined && (
                      <Button
                        size="sm"
                        onClick={() => void joinPublicClass(clss.id ?? "")}
                      >
                        Join
                      </Button>
                    )}
                    <Link
                      href={`/classes/${clss.id}`}
                      className="text-sm underline mt-2"
                    >
                      <DoorOpen className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogOverlay className="fixed inset-0 bg-black/30 backdrop-blur-md" />
        <DialogContent className="sm:max-w-md p-6 space-y-4">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "create" ? "Create class" : "Join class"}
            </DialogTitle>
          </DialogHeader>

          {dialogMode === "create" ? (
            <div className="space-y-3">
              <Input
                placeholder="Class name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <MarkdownEditor
                placeholder="Description"
                value={description}
                onChange={setDescription}
                minRows={5}
              />
              <div className="flex items-center gap-2">
                <label className="text-sm">Accent</label>
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                />
                <label className="text-sm ml-4">Public</label>
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
              </div>
              <Button onClick={createClass}>Create</Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Input
                placeholder="Signup Code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
              />
              <Button
                onClick={() => {
                  void joinClass();
                }}
              >
                Join
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
