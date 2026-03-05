"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarkdownEditor } from "@/components/web/markdown-editor";
import { MarkdownContent } from "@/components/web/markdown-content";
import { AttachmentPreview } from "@/components/web/attachment-preview";
import { Attachment, uploadFile } from "@/lib/uploads";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
} from "@/components/ui/dialog";
import { getAuthUser } from "@/lib/auth";
import {
  Plus,
  Download,
  Trash2,
  CheckSquare,
  Save,
  Eye,
  Pencil,
  Paperclip,
  Settings,
} from "lucide-react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5082";

type NoteGroup = {
  id?: string;
  userId?: string;
  name?: string;
  description?: string;
  labels?: string[];
  accentColor?: string;
  isPublic?: boolean;
  code?: string;
  sourceGroupId?: string;
  fetchedAt?: string;
};

type Note = {
  id?: string;
  groupId?: string;
  userId?: string;
  title?: string;
  content?: string;
  attachments?: Attachment[];
  updatedAt?: string;
};

type TodoChecklistItem = {
  id?: string;
  text?: string;
  done: boolean;
};

type TodoItem = {
  id?: string;
  userId?: string;
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  dueAt?: string;
  labels?: string[];
  checklist?: TodoChecklistItem[];
  linkedGroupId?: string;
  linkedNoteId?: string;
};

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function NotesPage() {
  const [userId, setUserId] = useState("");

  const [groups, setGroups] = useState<NoteGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState("");

  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupLabelsInput, setGroupLabelsInput] = useState("");
  const [groupAccent, setGroupAccent] = useState("#3b82f6");
  const [groupPublic, setGroupPublic] = useState(false);
  const [groupOptionsOpen, setGroupOptionsOpen] = useState(false);
  const [cloneCodeInput, setCloneCodeInput] = useState("");

  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteAttachments, setNoteAttachments] = useState<Attachment[]>([]);
  const [noteMode, setNoteMode] = useState<"view" | "edit">("view");
  const [uploadingNoteAttachments, setUploadingNoteAttachments] =
    useState(false);

  const [todoOpen, setTodoOpen] = useState(false);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [todoFilterStatus, setTodoFilterStatus] = useState("all");
  const [todoFilterPriority, setTodoFilterPriority] = useState("all");
  const [editingTodoId, setEditingTodoId] = useState("");
  const [todoTitle, setTodoTitle] = useState("");
  const [todoDescription, setTodoDescription] = useState("");
  const [todoStatus, setTodoStatus] = useState("todo");
  const [todoPriority, setTodoPriority] = useState("medium");
  const [todoDueAt, setTodoDueAt] = useState("");
  const [todoLabels, setTodoLabels] = useState("");
  const [todoChecklist, setTodoChecklist] = useState<TodoChecklistItem[]>([]);

  const selectedGroup = groups.find((x) => x.id === selectedGroupId) ?? null;
  const selectedNote = notes.find((x) => x.id === selectedNoteId) ?? null;

  const filteredTodos = useMemo(
    () =>
      todos.filter(
        (x) =>
          (todoFilterStatus === "all" || x.status === todoFilterStatus) &&
          (todoFilterPriority === "all" || x.priority === todoFilterPriority),
      ),
    [todos, todoFilterStatus, todoFilterPriority],
  );

  const syncAuth = () => setUserId(getAuthUser()?.id ?? "");

  const loadGroups = async () => {
    if (!userId) return;
    const res = await fetch(`${API_BASE}/api/notes/groups/${userId}`);
    if (!res.ok) return;
    const rows = (await res.json()) as NoteGroup[];
    setGroups(rows);
    if (!selectedGroupId || !rows.some((x) => x.id === selectedGroupId)) {
      setSelectedGroupId(rows[0]?.id ?? "");
    }
  };

  const loadNotes = async (groupId: string) => {
    if (!groupId) {
      setNotes([]);
      setSelectedNoteId("");
      return;
    }
    const res = await fetch(`${API_BASE}/api/notes/group/${groupId}/notes`);
    if (!res.ok) return;
    const rows = (await res.json()) as Note[];
    setNotes(rows);
    if (!selectedNoteId || !rows.some((x) => x.id === selectedNoteId)) {
      setSelectedNoteId(rows[0]?.id ?? "");
    }
  };

  const loadTodos = async () => {
    if (!userId) return;
    const res = await fetch(`${API_BASE}/api/notes/todos/${userId}`);
    if (!res.ok) return;
    setTodos((await res.json()) as TodoItem[]);
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
    void loadGroups();
    void loadTodos();
  }, [userId]);

  useEffect(() => {
    void loadNotes(selectedGroupId);
  }, [selectedGroupId]);

  useEffect(() => {
    if (!selectedGroup) {
      setGroupName("");
      setGroupDescription("");
      setGroupLabelsInput("");
      setGroupAccent("#3b82f6");
      return;
    }
    setGroupName(selectedGroup.name ?? "");
    setGroupDescription(selectedGroup.description ?? "");
    setGroupLabelsInput((selectedGroup.labels ?? []).join(", "));
    setGroupAccent(selectedGroup.accentColor ?? "#3b82f6");
    setGroupPublic(selectedGroup.isPublic ?? false);
  }, [selectedGroup?.id]);

  useEffect(() => {
    if (!selectedNote) {
      setNoteTitle("");
      setNoteContent("");
      setNoteMode("view");
      return;
    }
    setNoteTitle(selectedNote.title ?? "");
    setNoteContent(selectedNote.content ?? "");
    setNoteAttachments(selectedNote.attachments ?? []);
    setNoteMode("view");
  }, [selectedNote?.id]);

  const createGroup = async () => {
    if (!userId) return;
    const res = await fetch(`${API_BASE}/api/notes/groups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        name: "New group",
        description: "",
        labels: [],
        accentColor: "#3b82f6",
        isPublic: false,
      }),
    });
    if (!res.ok) return;
    await loadGroups();
  };

  const saveGroup = async () => {
    if (!selectedGroupId) return;
    const labels = groupLabelsInput
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    await fetch(`${API_BASE}/api/notes/groups/${selectedGroupId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: groupName.trim() || "Untitled group",
        description: groupDescription,
        labels,
        accentColor: groupAccent,
        isPublic: groupPublic,
      }),
    });
    await loadGroups();
  };

  const deleteGroup = async () => {
    if (!selectedGroupId) return;
    await fetch(`${API_BASE}/api/notes/groups/${selectedGroupId}`, {
      method: "DELETE",
    });
    await loadGroups();
  };

  const createNote = async () => {
    if (!selectedGroupId || !userId) return;
    await fetch(`${API_BASE}/api/notes/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groupId: selectedGroupId,
        userId,
        title: "Untitled note",
        content: "",
        attachments: [],
      }),
    });
    await loadNotes(selectedGroupId);
  };

  const cloneGroupByCode = async () => {
    if (!userId || !cloneCodeInput.trim()) return;
    await fetch(`${API_BASE}/api/notes/groups/clone`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, code: cloneCodeInput.trim() }),
    });
    setCloneCodeInput("");
    await loadGroups();
  };

  const fetchClonedGroup = async () => {
    if (!selectedGroupId || !userId) return;
    await fetch(`${API_BASE}/api/notes/groups/${selectedGroupId}/fetch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    await loadGroups();
    await loadNotes(selectedGroupId);
  };

  const saveNote = async () => {
    if (!selectedNoteId) return;
    await fetch(`${API_BASE}/api/notes/notes/${selectedNoteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: noteTitle,
        content: noteContent,
        attachments: noteAttachments,
      }),
    });
    await loadNotes(selectedGroupId);
    setNoteMode(() => "view");
  };

  const deleteNote = async () => {
    if (!selectedNoteId) return;
    await fetch(`${API_BASE}/api/notes/notes/${selectedNoteId}`, {
      method: "DELETE",
    });
    await loadNotes(selectedGroupId);
  };

  const resetTodoForm = () => {
    setEditingTodoId("");
    setTodoTitle("");
    setTodoDescription("");
    setTodoStatus("todo");
    setTodoPriority("medium");
    setTodoDueAt("");
    setTodoLabels("");
    setTodoChecklist([]);
  };

  const startEditTodo = (todo: TodoItem) => {
    setEditingTodoId(todo.id ?? "");
    setTodoTitle(todo.title ?? "");
    setTodoDescription(todo.description ?? "");
    setTodoStatus(todo.status ?? "todo");
    setTodoPriority(todo.priority ?? "medium");
    setTodoDueAt(
      todo.dueAt ? new Date(todo.dueAt).toISOString().slice(0, 16) : "",
    );
    setTodoLabels((todo.labels ?? []).join(", "));
    setTodoChecklist(todo.checklist ?? []);
  };

  const saveTodo = async () => {
    if (!userId || !todoTitle.trim()) return;
    const body = {
      userId,
      title: todoTitle.trim(),
      description: todoDescription,
      status: todoStatus,
      priority: todoPriority,
      dueAt: todoDueAt ? new Date(todoDueAt).toISOString() : null,
      labels: todoLabels
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      checklist: todoChecklist,
      linkedGroupId: selectedGroupId || null,
      linkedNoteId: selectedNoteId || null,
    };
    const url = editingTodoId
      ? `${API_BASE}/api/notes/todos/${editingTodoId}`
      : `${API_BASE}/api/notes/todos`;
    const method = editingTodoId ? "PATCH" : "POST";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await loadTodos();
    resetTodoForm();
  };

  const deleteTodo = async (todoId?: string) => {
    if (!todoId) return;
    await fetch(`${API_BASE}/api/notes/todos/${todoId}`, { method: "DELETE" });
    await loadTodos();
  };

  const toggleChecklistItem = async (
    todo: TodoItem,
    checklistIndex: number,
    done: boolean,
  ) => {
    const checklist = (todo.checklist ?? []).map((item, idx) =>
      idx === checklistIndex ? { ...item, done } : item,
    );

    setTodos((prev) =>
      prev.map((row) => (row.id === todo.id ? { ...row, checklist } : row)),
    );

    await fetch(`${API_BASE}/api/notes/todos/${todo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: todo.title ?? "",
        description: todo.description ?? "",
        status: todo.status ?? "todo",
        priority: todo.priority ?? "medium",
        dueAt: todo.dueAt ?? null,
        labels: todo.labels ?? [],
        checklist,
        linkedGroupId: todo.linkedGroupId ?? null,
        linkedNoteId: todo.linkedNoteId ?? null,
      }),
    });

    await loadTodos();
  };

  const absoluteUrl = (url?: string) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `${API_BASE}${url}`;
  };

  const sanitizeName = (value: string) => value.replace(/[^\w.\-]+/g, "_");

  const addNoteAttachments = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingNoteAttachments(true);
    try {
      const uploaded = await Promise.all(
        Array.from(files).map((f) => uploadFile(API_BASE, f)),
      );
      setNoteAttachments((prev) => [...prev, ...uploaded]);
    } finally {
      setUploadingNoteAttachments(false);
    }
  };

  const exportSelectedNote = async () => {
    if (!selectedNote) return;
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    const safeTitle = sanitizeName(selectedNote.title ?? "note");
    zip.file(`${safeTitle}.md`, selectedNote.content ?? "");

    const attachments = selectedNote.attachments ?? [];
    for (const att of attachments) {
      const href = absoluteUrl(att.url);
      if (!href) continue;
      try {
        const res = await fetch(href);
        if (!res.ok) continue;
        const blob = await res.blob();
        const filename = sanitizeName(att.name ?? "attachment");
        zip.file(`attachments/${filename}`, blob);
      } catch {
        // TODO create fallback method of downloading
      }
    }
    const blob = await zip.generateAsync({ type: "blob" });
    downloadBlob(`${safeTitle}.zip`, blob);
  };

  const exportSelectedGroup = async () => {
    if (!selectedGroup) return;
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    const groupedNotes = notes.filter((x) => x.groupId === selectedGroup.id);
    const folder = zip.folder(
      (selectedGroup.name ?? "group").replace(/[^\w\-]+/g, "_"),
    );

    folder?.file(
      "group.json",
      JSON.stringify(
        {
          group: selectedGroup,
          count: groupedNotes.length,
          exportedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
    );

    groupedNotes.forEach((note, idx) => {
      const title = sanitizeName(note.title ?? `note-${idx + 1}`);
      folder?.file(`${title}.md`, note.content ?? "");
    });
    for (const note of groupedNotes) {
      const title = sanitizeName(note.title ?? "note");
      for (const att of note.attachments ?? []) {
        const href = absoluteUrl(att.url);
        if (!href) continue;
        try {
          const res = await fetch(href);
          if (!res.ok) continue;
          const blob = await res.blob();
          const filename = sanitizeName(att.name ?? "attachment");
          folder?.file(`${title}/attachments/${filename}`, blob);
        } catch {}
      }
    }

    const safeName = sanitizeName(selectedGroup.name ?? "group");
    const blob = await zip.generateAsync({ type: "blob" });
    downloadBlob(`${safeName}.zip`, blob);
  };

  return (
    <main className="mx-auto max-w-7xl min-h-screen overflow-y-auto p-6 py-30 space-y-4">
      <section className="rounded-lg border p-4 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Notes</h1>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setTodoOpen(true)}>
            <CheckSquare className="h-4 w-4" />
          </Button>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[16rem_1fr]">
        <div className="rounded-lg border p-3 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Groups</h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void createGroup()}
              disabled={!userId}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="max-h-[30rem] overflow-y-auto space-y-2">
            {groups.map((g) => (
              <button
                key={g.id}
                onClick={() => setSelectedGroupId(g.id ?? "")}
                className={`w-full rounded-md border p-2 text-left ${
                  selectedGroupId === g.id ? "bg-muted" : ""
                }`}
                style={{
                  borderLeft: `6px solid ${g.accentColor ?? "#3b82f6"}`,
                }}
              >
                <div className="font-medium text-sm">{g.name}</div>
                <div className="text-xs text-muted-foreground line-clamp-1">
                  {(g.labels ?? []).join(", ")}
                </div>
              </button>
            ))}
          </div>
          <div className="space-y-2 border-t pt-2">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">Notes</h2>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void createNote()}
                disabled={!selectedGroupId}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="max-h-[30rem] overflow-y-auto space-y-2">
              {notes.map((n) => (
                <button
                  key={n.id}
                  onClick={() => setSelectedNoteId(n.id ?? "")}
                  className={`w-full rounded-md border p-2 text-left ${
                    selectedNoteId === n.id ? "bg-muted" : ""
                  }`}
                >
                  <div className="font-medium text-sm">{n.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {n.updatedAt ? new Date(n.updatedAt).toLocaleString() : ""}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-4 space-y-3 min-h-[74vh]">
          {!selectedGroup ? (
            <p className="text-sm text-muted-foreground">
              Select a group first.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 rounded-md border p-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setGroupOptionsOpen(true)}
                >
                  <Settings className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={exportSelectedGroup}
                >
                  <Download className="h-4 w-4" />
                </Button>
                {selectedGroup.sourceGroupId && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void fetchClonedGroup()}
                  >
                    Fetch latest
                  </Button>
                )}
              </div>

              {selectedNote ? (
                <div className="flex flex-col h-full gap-3">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Note title"
                      value={noteTitle}
                      onChange={(e) => setNoteTitle(e.target.value)}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setNoteMode((m) => (m === "edit" ? "view" : "edit"))
                      }
                      title={noteMode === "edit" ? "Viewer" : "Editor"}
                    >
                      {noteMode === "edit" ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <Pencil className="h-4 w-4" />
                      )}
                    </Button>
                    <Button size="sm" onClick={() => void saveNote()}>
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void exportSelectedNote()}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <label className="inline-flex">
                      <input
                        type="file"
                        className="hidden"
                        multiple
                        onChange={(e) =>
                          void addNoteAttachments(e.target.files)
                        }
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        type="button"
                        disabled={uploadingNoteAttachments}
                        title="Attach files"
                        asChild
                      >
                        <span>
                          <Paperclip className="h-4 w-4" />
                        </span>
                      </Button>
                    </label>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => void deleteNote()}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex-1 min-h-[60vh]">
                    {noteMode === "edit" ? (
                      <MarkdownEditor
                        value={noteContent}
                        onChange={setNoteContent}
                        placeholder="Write your note in markdown..."
                        minRows={28}
                        className="h-full"
                      />
                    ) : (
                      <div className="h-full min-h-[60vh] rounded-md border p-4 overflow-y-auto">
                        <MarkdownContent
                          className="prose prose-sm max-w-none dark:prose-invert"
                          content={noteContent || "_No content yet_"}
                        />
                      </div>
                    )}
                  </div>
                  <AttachmentPreview
                    attachments={noteAttachments}
                    onRemove={(idx) =>
                      setNoteAttachments((prev) =>
                        prev.filter((_, i) => i !== idx),
                      )
                    }
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Create/select a note to edit.
                </p>
              )}
            </>
          )}
        </div>
      </section>

      <Dialog open={todoOpen} onOpenChange={setTodoOpen}>
        <DialogOverlay className="fixed inset-0 bg-black/30 backdrop-blur-md" />
        <DialogContent className="sm:max-w-5xl w-[95vw] max-h-[92vh] overflow-y-auto p-6 space-y-4">
          <DialogHeader>
            <DialogTitle>Todos</DialogTitle>
          </DialogHeader>

          <div className="grid gap-2 md:grid-cols-2">
            <select
              value={todoFilterStatus}
              onChange={(e) => setTodoFilterStatus(e.target.value)}
              className="rounded-md border bg-background p-2 text-sm"
            >
              <option value="all">All statuses</option>
              <option value="todo">Todo</option>
              <option value="in_progress">In progress</option>
              <option value="blocked">Blocked</option>
              <option value="done">Done</option>
            </select>
            <select
              value={todoFilterPriority}
              onChange={(e) => setTodoFilterPriority(e.target.value)}
              className="rounded-md border bg-background p-2 text-sm"
            >
              <option value="all">All priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <details className="rounded-md border p-3">
            <summary className="cursor-pointer font-medium">
              {editingTodoId ? "Edit todo" : "Create todo"}
            </summary>
            <div className="mt-3 space-y-2">
              <Input
                placeholder="Todo title"
                value={todoTitle}
                onChange={(e) => setTodoTitle(e.target.value)}
              />
              <Input
                placeholder="Description"
                value={todoDescription}
                onChange={(e) => setTodoDescription(e.target.value)}
              />
              <div className="grid gap-2 md:grid-cols-2">
                <select
                  value={todoStatus}
                  onChange={(e) => setTodoStatus(e.target.value)}
                  className="rounded-md border bg-background p-2 text-sm"
                >
                  <option value="todo">Todo</option>
                  <option value="in_progress">In progress</option>
                  <option value="blocked">Blocked</option>
                  <option value="done">Done</option>
                </select>
                <select
                  value={todoPriority}
                  onChange={(e) => setTodoPriority(e.target.value)}
                  className="rounded-md border bg-background p-2 text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <Input
                type="datetime-local"
                value={todoDueAt}
                onChange={(e) => setTodoDueAt(e.target.value)}
              />
              <Input
                placeholder="Labels (comma separated)"
                value={todoLabels}
                onChange={(e) => setTodoLabels(e.target.value)}
              />
              <div className="space-y-1">
                <div className="text-sm font-medium">Checklist</div>
                {todoChecklist.map((item, idx) => (
                  <div key={item.id ?? `${idx}`} className="flex gap-2">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={(e) =>
                        setTodoChecklist((prev) =>
                          prev.map((x, i) =>
                            i === idx ? { ...x, done: e.target.checked } : x,
                          ),
                        )
                      }
                    />
                    <Input
                      value={item.text ?? ""}
                      onChange={(e) =>
                        setTodoChecklist((prev) =>
                          prev.map((x, i) =>
                            i === idx ? { ...x, text: e.target.value } : x,
                          ),
                        )
                      }
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        setTodoChecklist((prev) =>
                          prev.filter((_, i) => i !== idx),
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setTodoChecklist((prev) => [
                      ...prev,
                      { id: crypto.randomUUID(), text: "", done: false },
                    ])
                  }
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => void saveTodo()}>
                  {editingTodoId ? "Update todo" : "Create todo"}
                </Button>
                <Button variant="outline" onClick={resetTodoForm}>
                  Reset
                </Button>
              </div>
            </div>
          </details>

          <div className="space-y-2 max-h-[52vh] overflow-y-auto rounded-md border p-2">
            <div className="text-sm font-medium px-1">Todo list</div>
            {filteredTodos.map((t) => (
              <div key={t.id} className="rounded-md border p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{t.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.priority} • {t.status}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Due: {t.dueAt ? new Date(t.dueAt).toLocaleString() : "None"}
                </div>
                <div className="text-xs text-muted-foreground">
                  Labels: {(t.labels ?? []).join(", ") || "None"}
                </div>
                <details className="rounded border px-2 py-1">
                  <summary className="cursor-pointer text-xs font-medium">
                    Checklist ({t.checklist?.length ?? 0})
                  </summary>
                  <div className="mt-2 space-y-1">
                    {(t.checklist ?? []).length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No checklist items.
                      </p>
                    ) : (
                      (t.checklist ?? []).map((item, idx) => (
                        <div
                          key={item.id ?? `${t.id}-check-${idx}`}
                          className="flex items-center gap-2"
                        >
                          <input
                            type="checkbox"
                            checked={item.done}
                            onChange={(e) =>
                              void toggleChecklistItem(t, idx, e.target.checked)
                            }
                          />
                          <span
                            className={`text-xs ${item.done ? "line-through text-muted-foreground" : ""}`}
                          >
                            {item.text || "Untitled item"}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </details>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => startEditTodo(t)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => void deleteTodo(t.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
            {filteredTodos.length === 0 && (
              <p className="text-sm text-muted-foreground">No todos found.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={groupOptionsOpen} onOpenChange={setGroupOptionsOpen}>
        <DialogOverlay className="fixed inset-0 bg-black/30 backdrop-blur-md" />
        <DialogContent className="sm:max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto p-6 space-y-4">
          <DialogHeader>
            <DialogTitle>Options</DialogTitle>
          </DialogHeader>
          {!selectedGroup ? (
            <p className="text-sm text-muted-foreground">Select a group.</p>
          ) : (
            <>
              <Input
                placeholder="Group name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
              <Input
                placeholder="Group description"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
              />
              <Input
                placeholder="Labels (comma separated)"
                value={groupLabelsInput}
                onChange={(e) => setGroupLabelsInput(e.target.value)}
              />
              <div className="flex items-center gap-3">
                <label className="text-sm">Accent</label>
                <input
                  type="color"
                  value={groupAccent}
                  onChange={(e) => setGroupAccent(e.target.value)}
                />
                <label className="text-sm flex items-center gap-2 ml-auto">
                  <input
                    type="checkbox"
                    checked={groupPublic}
                    onChange={(e) => setGroupPublic(e.target.checked)}
                  />
                  Public group
                </label>
              </div>
              <div className="rounded-md border p-3 text-sm space-y-1">
                <div>
                  Share code:{" "}
                  <span className="font-mono">
                    {selectedGroup.code ?? "N/A"}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter code to clone a group"
                  value={cloneCodeInput}
                  onChange={(e) => setCloneCodeInput(e.target.value)}
                />
                <Button
                  variant="outline"
                  onClick={() => void cloneGroupByCode()}
                >
                  Clone
                </Button>
              </div>
              {selectedGroup.sourceGroupId && (
                <Button
                  variant="outline"
                  onClick={() => void fetchClonedGroup()}
                >
                  Fetch latest source version
                </Button>
              )}
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => void saveGroup()}>
                  Save
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => void deleteGroup()}
                >
                  Delete group
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
