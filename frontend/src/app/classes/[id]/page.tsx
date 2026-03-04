"use client";

import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
} from "@/components/ui/dialog";
import { ClassItem, PinnedLink } from "@/app/classes/page";
import { getAuthUser } from "@/lib/auth";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5082";

type ClassTab = "chat" | "threads" | "people" | "work" | "settings";
type ChatMessage = {
  parentId?: string;
  date?: string;
  userId?: string;
  text?: string;
  id?: string;
};

type ClassPerson = {
  id?: string;
  username?: string;
  isTeacher: boolean;
};

type ResolvedUser = {
  id?: string;
  username?: string;
};

type ClassThread = {
  id?: string;
  classId?: string;
  userId?: string;
  title?: string;
  text?: string;
  date?: string;
};

type ClassThreadComment = {
  id?: string;
  threadId?: string;
  userId?: string;
  parentCommentId?: string;
  text?: string;
  date?: string;
};

type Assignment = {
  id?: string;
  classId?: string;
  name?: string;
  text?: string;
  due?: string;
  maxMark?: number;
};

type Submission = {
  id?: string;
  assignmentId?: string;
  userId?: string;
  text?: string;
  date?: string;
  mark?: number;
};

export default function ClassDetailPage() {
  const params = useParams<{ id: string }>();
  const classId = Array.isArray(params.id)
    ? (params.id[0] ?? "")
    : (params.id ?? "");
  const chatParentId = `class-chat-${classId}`;

  const [tab, setTab] = useState<ClassTab>("threads");
  const [userId, setUserId] = useState("");

  const [clss, setClass] = useState<ClassItem | null>(null);
  const [people, setPeople] = useState<ClassPerson[]>([]);
  const [userMap, setUserMap] = useState<Record<string, string>>({});

  const [threads, setThreads] = useState<ClassThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string>("");
  const [threadComments, setThreadComments] = useState<ClassThreadComment[]>(
    [],
  );
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [collapsedComments, setCollapsedComments] = useState<
    Record<string, boolean>
  >({});
  const [openReplyEditors, setOpenReplyEditors] = useState<
    Record<string, boolean>
  >({});
  const [threadDialogOpen, setThreadDialogOpen] = useState(false);
  const [threadTitle, setThreadTitle] = useState("");
  const [threadBody, setThreadBody] = useState("");

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [newAssignmentName, setNewAssignmentName] = useState("");
  const [newAssignmentText, setNewAssignmentText] = useState("");
  const [newAssignmentDue, setNewAssignmentDue] = useState("");
  const [newAssignmentMaxMark, setNewAssignmentMaxMark] = useState("100");
  const [editingAssignmentId, setEditingAssignmentId] = useState<string>("");
  const [editAssignmentName, setEditAssignmentName] = useState("");
  const [editAssignmentText, setEditAssignmentText] = useState("");
  const [editAssignmentDue, setEditAssignmentDue] = useState("");
  const [editAssignmentMaxMark, setEditAssignmentMaxMark] = useState("100");
  const [submissionsByAssignment, setSubmissionsByAssignment] = useState<
    Record<string, Submission[]>
  >({});
  const [markInput, setMarkInput] = useState<Record<string, string>>({});
  const [submissionText, setSubmissionText] = useState<Record<string, string>>(
    {},
  );
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");

  const [settingsName, setSettingsName] = useState("");
  const [settingsDescription, setSettingsDescription] = useState("");
  const [settingsAccent, setSettingsAccent] = useState("#3b82f6");
  const [settingsPublic, setSettingsPublic] = useState(false);
  const [settingsPinnedLinks, setSettingsPinnedLinks] = useState<PinnedLink[]>(
    [],
  );

  const isTeacher = useMemo(
    () => !!clss?.teacherIds?.includes(userId),
    [clss?.teacherIds, userId],
  );

  const displayName = (id?: string) => {
    if (!id) return "Unknown";
    return userMap[id] ?? id;
  };

  const resolveUsernames = async (ids: string[]) => {
    if (ids.length === 0) return;
    const res = await fetch(`${API_BASE}/api/classes/users/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    const users = (await res.json()) as ResolvedUser[];
    setUserMap((prev) => {
      const next = { ...prev };
      for (const u of users) {
        if (u.id) next[u.id] = u.username ?? u.id;
      }
      return next;
    });
  };

  const loadPeople = async () => {
    const res = await fetch(`${API_BASE}/api/classes/${classId}/people`);
    const ppl = (await res.json()) as ClassPerson[];
    setPeople(ppl);
    setUserMap((prev) => {
      const next = { ...prev };
      for (const p of ppl) {
        if (p.id) next[p.id] = p.username ?? p.id;
      }
      return next;
    });
  };

  const loadClass = async () => {
    const res = await fetch(`${API_BASE}/api/classes/${classId}`);
    const nextClass = (await res.json()) as ClassItem;
    setClass(nextClass);
    setSettingsName(nextClass.name ?? "");
    setSettingsDescription(nextClass.description ?? "");
    setSettingsAccent(nextClass.accentColor ?? "#3b82f6");
    setSettingsPublic(nextClass.isPublic ?? false);
    setSettingsPinnedLinks(nextClass.pinnedLinks ?? []);
  };

  const loadThreads = async () => {
    if (!classId) return;
    const res = await fetch(`${API_BASE}/api/classes/${classId}/threads`);
    const rows = (await res.json()) as ClassThread[];
    setThreads(rows);
    await resolveUsernames(rows.map((x) => x.userId ?? ""));
    if (rows.length === 0) {
      setSelectedThreadId("");
      return;
    }
    if (!selectedThreadId || !rows.some((x) => x.id === selectedThreadId)) {
      setSelectedThreadId(rows[0].id ?? "");
    }
  };

  const loadThreadComments = async (threadId: string) => {
    const res = await fetch(
      `${API_BASE}/api/classes/threads/${threadId}/comments`,
    );
    const rows = (await res.json()) as ClassThreadComment[];
    setThreadComments(rows);
    setCollapsedComments({});
    setOpenReplyEditors({});
    await resolveUsernames(rows.map((x) => x.userId ?? ""));
  };

  const loadAssignments = async () => {
    const assRes = await fetch(
      `${API_BASE}/api/classes/${classId}/assignments`,
    );
    const list = (await assRes.json()) as Assignment[];
    setAssignments(list);

    const subPairs = await Promise.all(
      list
        .filter((x) => x.id)
        .map(async (x) => {
          const res = await fetch(
            `${API_BASE}/api/classes/assignments/${x.id}/submissions`,
          );
          const items = res.ok ? ((await res.json()) as Submission[]) : [];
          return [x.id as string, items] as const;
        }),
    );
    const map = Object.fromEntries(subPairs);
    setSubmissionsByAssignment(map);
    await resolveUsernames(
      Object.values(map)
        .flat()
        .map((x) => x.userId ?? ""),
    );
  };

  const loadChat = async () => {
    const res = await fetch(`${API_BASE}/api/chat/${chatParentId}/messages`);
    if (!res.ok) return;
    const rows = (await res.json()) as ChatMessage[];
    setChatMessages(rows);
    await resolveUsernames(rows.map((x) => x.userId ?? ""));
  };

  useEffect(() => {
    const setUser = () => setUserId(getAuthUser()?.id ?? "");
    setUser();
    window.addEventListener("auth-changed", setUser);
    window.addEventListener("storage", setUser);
    return () => {
      window.removeEventListener("auth-changed", setUser);
      window.removeEventListener("storage", setUser);
    };
  }, []);

  useEffect(() => {
    if (!classId) return;
    void loadClass();
    void loadPeople();
    void loadThreads();
    void loadAssignments();
    void loadChat();
  }, [classId, userId]);

  useEffect(() => {
    void loadThreadComments(selectedThreadId);
  }, [selectedThreadId]);

  useEffect(() => {
    if (threads.length === 0) {
      if (selectedThreadId) setSelectedThreadId("");
      return;
    }
    if (!selectedThreadId || !threads.some((x) => x.id === selectedThreadId)) {
      setSelectedThreadId(threads[0]?.id ?? "");
    }
  }, [threads, selectedThreadId]);

  const createThread = async () => {
    if (!classId || !userId || !threadTitle.trim() || !threadBody.trim())
      return;
    const res = await fetch(`${API_BASE}/api/classes/${classId}/threads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        title: threadTitle.trim(),
        text: threadBody.trim(),
      }),
    });
    const created = (await res.json()) as ClassThread;
    setThreads((prev) => {
      if (created.id && prev.some((x) => x.id === created.id)) return prev;
      return [created, ...prev];
    });
    if (created.id) {
      setSelectedThreadId(created.id);
    }
    setThreadDialogOpen(false);
    setThreadTitle("");
    setThreadBody("");
    await loadThreads();
  };

  const createComment = async (parentCommentId?: string) => {
    if (!selectedThreadId || !userId) return;
    const text = replyText[parentCommentId ?? "__root__"] ?? "";
    await fetch(
      `${API_BASE}/api/classes/threads/${selectedThreadId}/comments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          text: text.trim(),
          parentCommentId: parentCommentId ?? null,
        }),
      },
    );
    const key = parentCommentId ?? "__root__";
    setReplyText((prev) => ({ ...prev, [key]: "" }));
    setOpenReplyEditors((prev) => ({ ...prev, [key]: false }));
    await loadThreadComments(selectedThreadId);
  };

  const sendClassMessage = async () => {
    if (!userId || !chatInput.trim()) return;
    await fetch(`${API_BASE}/api/chat/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parentId: chatParentId,
        userId,
        text: chatInput.trim(),
        date: new Date().toISOString(),
      }),
    });
    setChatInput("");
    await loadChat();
  };

  const createAssignment = async () => {
    if (!classId || !newAssignmentName.trim() || !newAssignmentText.trim()) {
      return;
    }
    await fetch(`${API_BASE}/api/classes/${classId}/assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newAssignmentName.trim(),
        text: newAssignmentText.trim(),
        due: newAssignmentDue
          ? new Date(newAssignmentDue).toISOString()
          : undefined,
        maxMark: Number(newAssignmentMaxMark),
      }),
    });
    setAssignmentDialogOpen(false);
    setNewAssignmentName("");
    setNewAssignmentText("");
    setNewAssignmentDue("");
    setNewAssignmentMaxMark("100");
    await loadAssignments();
  };

  const startEditAssignment = (a: Assignment) => {
    setEditingAssignmentId(a.id ?? "");
    setEditAssignmentName(a.name ?? "");
    setEditAssignmentText(a.text ?? "");
    setEditAssignmentDue(
      a.due ? new Date(a.due).toISOString().slice(0, 16) : "",
    );
    setEditAssignmentMaxMark(String(a.maxMark ?? 100));
  };

  const saveEditAssignment = async () => {
    if (!editingAssignmentId) return;
    await fetch(
      `${API_BASE}/api/classes/${classId}/assignments/${editingAssignmentId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editAssignmentName,
          text: editAssignmentText,
          due: editAssignmentDue
            ? new Date(editAssignmentDue).toISOString()
            : undefined,
          maxMark: Number(editAssignmentMaxMark),
        }),
      },
    );
    setEditingAssignmentId("");
    setEditAssignmentName("");
    setEditAssignmentText("");
    setEditAssignmentDue("");
    setEditAssignmentMaxMark("100");
    await loadAssignments();
  };

  const submitAssignment = async (assignmentId: string) => {
    if (!userId) return;
    const text = submissionText[assignmentId];
    if (!text?.trim()) return;
    await fetch(
      `${API_BASE}/api/classes/assignments/${assignmentId}/submissions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, text }),
      },
    );
    setSubmissionText((prev) => ({ ...prev, [assignmentId]: "" }));
    await loadAssignments();
  };

  const setMark = async (submissionId: string, mark: number) => {
    await fetch(`${API_BASE}/api/classes/submissions/${submissionId}/mark`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mark }),
    });
    await loadAssignments();
  };

  const promoteTeacher = async (targetUserId: string) => {
    await fetch(`${API_BASE}/api/classes/${classId}/teachers/${targetUserId}`, {
      method: "POST",
    });
    await loadPeople();
    await loadClass();
  };

  const removeUser = async (targetUserId: string) => {
    await fetch(`${API_BASE}/api/classes/${classId}/users/${targetUserId}`, {
      method: "DELETE",
    });
    await loadPeople();
    await loadClass();
  };

  const saveSettings = async () => {
    await fetch(`${API_BASE}/api/classes/${classId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: settingsName,
        description: settingsDescription,
        accentColor: settingsAccent,
        isPublic: settingsPublic,
        pinnedLinks: settingsPinnedLinks,
      }),
    });
    await loadClass();
  };

  const orderedChat = [...chatMessages].sort(
    (a, b) =>
      new Date(a.date ?? "").getTime() - new Date(b.date ?? "").getTime(),
  );

  const commentsByParent = useMemo(() => {
    const groups: Record<string, ClassThreadComment[]> = {};
    for (const c of threadComments) {
      const key = c.parentCommentId ?? "__root__";
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    }
    for (const k of Object.keys(groups)) {
      groups[k] = groups[k].sort(
        (a, b) =>
          new Date(a.date ?? "").getTime() - new Date(b.date ?? "").getTime(),
      );
    }
    return groups;
  }, [threadComments]);

  const selectedThread = threads.find((x) => x.id === selectedThreadId);
  const pinnedLinks = (clss?.pinnedLinks ?? []).filter(
    (x) => (x.title ?? "").trim() && (x.url ?? "").trim(),
  );

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-6 py-30">
      <section
        className="rounded-lg border p-4 space-y-2"
        style={{ borderTop: `6px solid ${clss?.accentColor ?? "#3b82f6"}` }}
      >
        <h1 className="text-3xl font-semibold">{clss?.name ?? "Colony"}</h1>
        <p className="text-muted-foreground">
          {clss?.description ?? "No description"}
        </p>
        {pinnedLinks.length > 0 && (
          <div className="space-y-1">
            {pinnedLinks.map((link) => (
              <a
                key={link.code ?? `${link.title}-${link.url}`}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="block text-sm underline text-blue-600 dark:text-blue-400"
              >
                {link.title}
              </a>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-wrap gap-2">
        <Button
          variant={tab === "threads" ? "default" : "outline"}
          onClick={() => setTab("threads")}
        >
          Threads
        </Button>
        <Button
          variant={tab === "chat" ? "default" : "outline"}
          onClick={() => setTab("chat")}
        >
          Stream 
        </Button>
        <Button
          variant={tab === "people" ? "default" : "outline"}
          onClick={() => setTab("people")}
        >
          People
        </Button>
        <Button
          variant={tab === "work" ? "default" : "outline"}
          onClick={() => setTab("work")}
        >
          {isTeacher ? "Assignments" : "Submissions"}
        </Button>
        {isTeacher && (
          <Button
            variant={tab === "settings" ? "default" : "outline"}
            onClick={() => setTab("settings")}
          >
            Settings
          </Button>
        )}
      </section>

      {tab === "threads" && (
        <section className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-medium">Threads</h2>
            <Button
              onClick={() => setThreadDialogOpen(true)}
              disabled={!userId}
            >
              New
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-md border p-2 space-y-2 max-h-[28rem] overflow-y-auto">
              {threads.length === 0 && (
                <p className="text-sm text-muted-foreground p-2">
                  No threads yet.
                </p>
              )}
              {threads.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedThreadId(t.id ?? "")}
                  className={`w-full rounded-md border p-3 text-left ${
                    selectedThreadId === t.id ? "bg-muted" : ""
                  }`}
                >
                  <div className="font-medium">{t.title}</div>
                  <div className="text-sm text-muted-foreground line-clamp-2">
                    {t.text}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {displayName(t.userId)} •{" "}
                    {t.date ? new Date(t.date).toLocaleString() : ""}
                  </div>
                </button>
              ))}
            </div>

            <div className="rounded-md border p-3 space-y-3">
              {selectedThread ? (
                <>
                  <h3 className="text-lg font-semibold">
                    {selectedThread.title}
                  </h3>
                  <div className="text-sm text-muted-foreground">
                    {displayName(selectedThread.userId)} •{" "}
                    {selectedThread.date
                      ? new Date(selectedThread.date).toLocaleString()
                      : ""}
                  </div>
                  <p className="text-sm whitespace-pre-wrap">
                    {selectedThread.text}
                  </p>

                  {!openReplyEditors.__root__ ? (
                    <Button
                      variant="outline"
                      onClick={() =>
                        setOpenReplyEditors((prev) => ({
                          ...prev,
                          __root__: true,
                        }))
                      }
                      disabled={!userId}
                    >
                      Add comment
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Write a comment..."
                        value={replyText["__root__"] ?? ""}
                        onChange={(e) =>
                          setReplyText((prev) => ({
                            ...prev,
                            __root__: e.target.value,
                          }))
                        }
                      />
                      <Button
                        onClick={() => void createComment()}
                        disabled={!userId}
                      >
                        Comment
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() =>
                          setOpenReplyEditors((prev) => ({
                            ...prev,
                            __root__: false,
                          }))
                        }
                      >
                        Cancel
                      </Button>
                    </div>
                  )}

                  <CommentTree
                    parentId={undefined}
                    commentsByParent={commentsByParent}
                    displayName={displayName}
                    collapsedComments={collapsedComments}
                    setCollapsedComments={setCollapsedComments}
                    openReplyEditors={openReplyEditors}
                    setOpenReplyEditors={setOpenReplyEditors}
                    replyText={replyText}
                    setReplyText={setReplyText}
                    onReply={(id) => void createComment(id)}
                    canReply={!!userId}
                  />
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select a thread to view comments.
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {tab === "chat" && (
        <section className="rounded-lg border p-4 space-y-3">
          <h2 className="text-xl font-medium">Stream</h2>
          <div className="h-80 overflow-y-auto rounded-md border p-3 space-y-2">
            {orderedChat.map((m, idx) => (
              <div
                key={m.id ?? `${idx}-${m.userId}-${m.date}`}
                className="rounded-md border p-2"
              >
                <div className="text-xs text-muted-foreground">
                  {displayName(m.userId)}
                </div>
                <div className="text-sm whitespace-pre-wrap">{m.text}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Send a message..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendClassMessage();
                }
              }}
            />
            <Button onClick={() => void sendClassMessage()} disabled={!userId}>
              Send
            </Button>
          </div>
        </section>
      )}

      {tab === "people" && (
        <section className="rounded-lg border p-4 space-y-3">
          <h2 className="text-xl font-medium">People</h2>
          <div className="rounded-md border divide-y">
            {people.map((p) => (
              <div
                key={p.id}
                className="group flex items-center justify-between p-3"
              >
                <div className="text-sm">
                  <span className="font-medium">{p.username}</span>
                  {p.isTeacher && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (Teacher)
                    </span>
                  )}
                </div>
                {isTeacher && p.id && p.id !== userId && (
                  <div className="hidden gap-2 group-hover:flex">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void promoteTeacher(p.id!)}
                    >
                      Promote
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => void removeUser(p.id!)}
                    >
                      Kick
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === "work" && (
        <section className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-medium">{isTeacher ? "Assignments" : "Submissions"}</h2>
            {isTeacher && (<Button
              onClick={() => setAssignmentDialogOpen(true)}
              disabled={!userId}
            >
              New
            </Button>)}
          </div>

          {isTeacher && editingAssignmentId && (
            <div className="space-y-2 rounded-md border p-3">
              <div className="font-medium">Edit assignment</div>
              <Input
                placeholder="Assignment title"
                value={editAssignmentName}
                onChange={(e) => setEditAssignmentName(e.target.value)}
              />
              <Input
                placeholder="Assignment details"
                value={editAssignmentText}
                onChange={(e) => setEditAssignmentText(e.target.value)}
              />
              <Input
                type="datetime-local"
                value={editAssignmentDue}
                onChange={(e) => setEditAssignmentDue(e.target.value)}
              />
              <Input
                type="number"
                value={editAssignmentMaxMark}
                onChange={(e) => setEditAssignmentMaxMark(e.target.value)}
              />
              <div className="flex gap-2">
                <Button onClick={saveEditAssignment}>Save</Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingAssignmentId("");
                    setEditAssignmentName("");
                    setEditAssignmentText("");
                    setEditAssignmentDue("");
                    setEditAssignmentMaxMark("100");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {assignments.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No assignments available yet.
              </p>
            )}
            {assignments.map((assignment) => {
              const submissions =
                submissionsByAssignment[assignment.id ?? ""] ?? [];
              const visibleSubs = isTeacher
                ? submissions
                : submissions.filter((s) => s.userId === userId);

              return (
                <div
                  key={assignment.id}
                  className="rounded-md border p-3 space-y-2"
                >
                  <h3 className="font-medium">{assignment.name}</h3>
                  <p className="text-sm">{assignment.text}</p>
                  <p className="text-xs text-muted-foreground">
                    Due:{" "}
                    {assignment.due
                      ? new Date(assignment.due).toLocaleString()
                      : "No due date"}{" "}
                    | Max: {assignment.maxMark ?? 0}
                  </p>
                  {isTeacher && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEditAssignment(assignment)}
                    >
                      Edit assignment
                    </Button>
                  )}

                  {!isTeacher && (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Your submission..."
                        value={submissionText[assignment.id ?? ""] ?? ""}
                        onChange={(e) =>
                          setSubmissionText((prev) => ({
                            ...prev,
                            [assignment.id ?? ""]: e.target.value,
                          }))
                        }
                      />
                      <Button
                        onClick={() =>
                          void submitAssignment(assignment.id ?? "")
                        }
                        disabled={!userId}
                      >
                        Submit
                      </Button>
                    </div>
                  )}

                  <div className="space-y-2">
                    {visibleSubs.map((sub) => (
                      <div key={sub.id} className="rounded-md border p-2">
                        <div className="text-sm">{sub.text}</div>
                        <div className="text-xs text-muted-foreground">
                          {displayName(sub.userId)} | Mark:{" "}
                          {sub.mark ?? "unmarked"}
                        </div>
                        {isTeacher && (
                          <div className="mt-2 flex gap-2">
                            <Input
                              type="number"
                              min={0}
                              placeholder="Mark"
                              value={
                                markInput[sub.id ?? ""] ??
                                sub.mark?.toString() ??
                                ""
                              }
                              onChange={(e) =>
                                setMarkInput((prev) => ({
                                  ...prev,
                                  [sub.id ?? ""]: e.target.value,
                                }))
                              }
                              className="w-28"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const raw = markInput[sub.id ?? ""] ?? "";
                                const parsed = Number(raw);
                                if (!sub.id || Number.isNaN(parsed)) return;
                                void setMark(sub.id, parsed);
                              }}
                            >
                              Save mark
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {tab === "settings" && isTeacher && (
        <section className="rounded-lg border p-4 space-y-3">
          <h2 className="text-xl font-medium">Settings</h2>
          <Input
            placeholder="Colony name"
            value={settingsName}
            onChange={(e) => setSettingsName(e.target.value)}
          />
          <Input
            placeholder="Colony description"
            value={settingsDescription}
            onChange={(e) => setSettingsDescription(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <label className="text-sm">Accent color</label>
            <input
              type="color"
              value={settingsAccent}
              onChange={(e) => setSettingsAccent(e.target.value)}
            />
            <label className="text-sm ml-4">Is Public</label>
            <input
              type="checkbox"
              checked={settingsPublic}
              onChange={(e) => setSettingsPublic(e.target.checked)}
            />
          </div>
          <div className="space-y-2 rounded-md border p-3">
            <h3 className="font-medium">Pinned links</h3>
            {settingsPinnedLinks.map((link, idx) => (
              <div key={link.code ?? `${idx}`} className="flex gap-2">
                <Input
                  placeholder="Title"
                  value={link.title ?? ""}
                  onChange={(e) =>
                    setSettingsPinnedLinks((prev) =>
                      prev.map((x, i) =>
                        i === idx ? { ...x, title: e.target.value } : x,
                      ),
                    )
                  }
                />
                <Input
                  placeholder="URL"
                  value={link.url ?? ""}
                  onChange={(e) =>
                    setSettingsPinnedLinks((prev) =>
                      prev.map((x, i) =>
                        i === idx ? { ...x, url: e.target.value } : x,
                      ),
                    )
                  }
                />
                <Button
                  variant="destructive"
                  onClick={() =>
                    setSettingsPinnedLinks((prev) =>
                      prev.filter((_, i) => i !== idx),
                    )
                  }
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() =>
                setSettingsPinnedLinks((prev) => [
                  ...prev,
                  { title: "", url: "" },
                ])
              }
            >
              Add link
            </Button>
          </div>
          <Button onClick={saveSettings}>Save settings</Button>
        </section>
      )}

      <Dialog open={threadDialogOpen} onOpenChange={setThreadDialogOpen}>
        <DialogOverlay className="fixed inset-0 bg-black/30 backdrop-blur-md" />
        <DialogContent className="sm:max-w-md p-6 space-y-4">
          <DialogHeader>
            <DialogTitle>Create thread</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Title"
            value={threadTitle}
            onChange={(e) => setThreadTitle(e.target.value)}
          />
          <Input
            placeholder="Body"
            value={threadBody}
            onChange={(e) => setThreadBody(e.target.value)}
          />
          <Button onClick={createThread}>Post thread</Button>
        </DialogContent>
      </Dialog>

      <Dialog
        open={assignmentDialogOpen}
        onOpenChange={setAssignmentDialogOpen}
      >
        <DialogOverlay className="fixed inset-0 bg-black/30 backdrop-blur-md" />
        <DialogContent className="sm:max-w-md p-6 space-y-4">
          <DialogHeader>
            <DialogTitle>Create assignment</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Title"
            value={newAssignmentName}
            onChange={(e) => setNewAssignmentName(e.target.value)}
          />
          <Input
            placeholder="Description"
            value={newAssignmentText}
            onChange={(e) => setNewAssignmentText(e.target.value)}
          />
          <Input
            type="datetime-local"
            value={newAssignmentDue}
            onChange={(e) => setNewAssignmentDue(e.target.value)}
          />
          <Input
            type="number"
            value={newAssignmentMaxMark}
            onChange={(e) => setNewAssignmentMaxMark(e.target.value)}
          />
          <Button onClick={createAssignment}>Create assignment</Button>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function CommentTree(props: {
  parentId?: string;
  commentsByParent: Record<string, ClassThreadComment[]>;
  displayName: (id?: string) => string;
  collapsedComments: Record<string, boolean>;
  setCollapsedComments: Dispatch<SetStateAction<Record<string, boolean>>>;
  openReplyEditors: Record<string, boolean>;
  setOpenReplyEditors: Dispatch<SetStateAction<Record<string, boolean>>>;
  replyText: Record<string, string>;
  setReplyText: Dispatch<SetStateAction<Record<string, string>>>;
  onReply: (id: string) => void;
  canReply: boolean;
}) {
  const {
    parentId,
    commentsByParent,
    displayName,
    collapsedComments,
    setCollapsedComments,
    openReplyEditors,
    setOpenReplyEditors,
    replyText,
    setReplyText,
    onReply,
    canReply,
  } = props;
  const key = parentId ?? "__root__";
  const rows = commentsByParent[key] ?? [];
  if (rows.length === 0) return null;

  return (
    <div
      className={parentId ? "ml-5 mt-2 border-l pl-3 space-y-2" : "space-y-2"}
    >
      {rows.map((c) => (
        <div key={c.id} className="rounded-md border p-2 space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <div>
              {displayName(c.userId)} •{" "}
              {c.date ? new Date(c.date).toLocaleString() : ""}
            </div>
            {c.id && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setCollapsedComments((prev) => ({
                    ...prev,
                    [c.id ?? ""]: !prev[c.id ?? ""],
                  }))
                }
              >
                {collapsedComments[c.id ?? ""] ? "Expand" : "Collapse"}
              </Button>
            )}
          </div>
          {!collapsedComments[c.id ?? ""] ? (
            <>
              <div className="text-sm whitespace-pre-wrap">{c.text}</div>
              {!openReplyEditors[c.id ?? ""] ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setOpenReplyEditors((prev) => ({
                      ...prev,
                      [c.id ?? ""]: true,
                    }))
                  }
                  disabled={!canReply}
                >
                  Reply
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="Reply..."
                    value={replyText[c.id ?? ""] ?? ""}
                    onChange={(e) =>
                      setReplyText((prev) => ({
                        ...prev,
                        [c.id ?? ""]: e.target.value,
                      }))
                    }
                  />
                  <Button
                    onClick={() => c.id && onReply(c.id)}
                    disabled={!canReply}
                  >
                    Post
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setOpenReplyEditors((prev) => ({
                        ...prev,
                        [c.id ?? ""]: false,
                      }))
                    }
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-muted-foreground italic">
              Comment collapsed
            </div>
          )}
          {!collapsedComments[c.id ?? ""] && (
            <CommentTree
              parentId={c.id}
              commentsByParent={commentsByParent}
              displayName={displayName}
              collapsedComments={collapsedComments}
              setCollapsedComments={setCollapsedComments}
              openReplyEditors={openReplyEditors}
              setOpenReplyEditors={setOpenReplyEditors}
              replyText={replyText}
              setReplyText={setReplyText}
              onReply={onReply}
              canReply={canReply}
            />
          )}
        </div>
      ))}
    </div>
  );
}
