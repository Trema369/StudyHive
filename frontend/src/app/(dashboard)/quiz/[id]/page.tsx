"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAuthUser } from "@/lib/auth";
import { MarkdownContent } from "@/components/web/markdown-content";
import { MarkdownEditor } from "@/components/web/markdown-editor";
import { AttachmentPreview } from "@/components/web/attachment-preview";
import { Attachment, uploadFile } from "@/lib/uploads";
import { AIAppendControls } from "@/components/web/ai-append-controls";
import { ArrowBigLeft, ArrowBigRight, SkipForward } from "lucide-react";

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

type Answer = {
  text?: string;
  isCorrect?: boolean;
  weight?: number;
  attachments?: Attachment[];
};

type Question = {
  id?: string;
  quizId?: string;
  text?: string;
  type?: "multiple_choice" | "fill_gap" | "short_answer";
  attachments?: Attachment[];
  answers?: Answer[];
};

type QuizSubmission = {
  id?: string;
  quizId?: string;
  userId?: string;
  answers?: (number | null)[];
  multiAnswers?: number[][];
  textAnswers?: (string | null)[];
  date?: string;
  score?: number;
};

type QuestionBank = {
  id?: string;
  userId?: string;
  name?: string;
  description?: string;
};

type QuestionBankItem = {
  id?: string;
  bankId?: string;
  userId?: string;
  text?: string;
  type?: "multiple_choice" | "fill_gap" | "short_answer";
  attachments?: Attachment[];
  answers?: Answer[];
};

type QuizTab = "answer" | "questions" | "settings" | "results";

export default function QuizDetailPage() {
  const params = useParams<{ id: string }>();
  const quizId = params?.id ?? "";

  const [userId, setUserId] = useState("");

  const [quiz, setQuiz] = useState<QuizSet | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
  const [tab, setTab] = useState<QuizTab>("answer");

  const [settingsName, setSettingsName] = useState("");
  const [settingsDescription, setSettingsDescription] = useState("");
  const [settingsPublished, setSettingsPublished] = useState(false);
  const [settingsTimerMinutes, setSettingsTimerMinutes] = useState("");

  const [editingQuestionId, setEditingQuestionId] = useState("");
  const [editingQuestionText, setEditingQuestionText] = useState("");
  const [editingQuestionType, setEditingQuestionType] = useState<
    "multiple_choice" | "fill_gap" | "short_answer"
  >("multiple_choice");
  const [editingAnswers, setEditingAnswers] = useState<Answer[]>([
    { text: "", isCorrect: true, weight: 1, attachments: [] },
    { text: "", isCorrect: false, weight: 0, attachments: [] },
  ]);
  const [editingQuestionAttachments, setEditingQuestionAttachments] = useState<
    Attachment[]
  >([]);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [bankName, setBankName] = useState("");
  const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([]);
  const [selectedBankId, setSelectedBankId] = useState("");
  const [bankItems, setBankItems] = useState<QuestionBankItem[]>([]);
  const [bankPracticeMode, setBankPracticeMode] = useState(false);
  const [bankPracticeQuestions, setBankPracticeQuestions] = useState<
    Question[]
  >([]);
  const [bankPracticeName, setBankPracticeName] = useState("");
  const [bankTargetQuestionIndex, setBankTargetQuestionIndex] = useState<
    number | null
  >(null);

  const [selectedAnswerIndexes, setSelectedAnswerIndexes] = useState<
    Record<number, number[]>
  >({});
  const [typedAnswers, setTypedAnswers] = useState<Record<number, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [skippedQuestions, setSkippedQuestions] = useState<
    Record<number, boolean>
  >({});
  const [latestSubmission, setLatestSubmission] =
    useState<QuizSubmission | null>(null);
  const [customTimerMinutes, setCustomTimerMinutes] = useState("");
  const [activeTimerSeconds, setActiveTimerSeconds] = useState<number | null>(
    null,
  );
  const [timerStarted, setTimerStarted] = useState(false);

  const canEdit = !!userId && quiz?.userId === userId;
  const activeQuestions = useMemo(
    () => (bankPracticeMode ? bankPracticeQuestions : questions),
    [bankPracticeMode, bankPracticeQuestions, questions],
  );
  const currentQuestion = activeQuestions[currentQuestionIndex] ?? null;

  const isQuestionAnswered = (index: number) => {
    const q = activeQuestions[index];
    if (!q) return false;
    if (q.type === "multiple_choice")
      return (selectedAnswerIndexes[index]?.length ?? 0) > 0;
    return (typedAnswers[index] ?? "").trim().length > 0;
  };

  const questionState = (index: number) => {
    if (isQuestionAnswered(index)) return "answered";
    if (skippedQuestions[index]) return "skipped";
    return "unanswered";
  };

  const myLatestSubmission = useMemo(() => {
    const mine = submissions.filter((x) => x.userId === userId);
    if (mine.length === 0) return null;
    return mine[mine.length - 1];
  }, [submissions, userId]);

  const loadAll = async () => {
    if (!quizId) return;
    const [quizRes, qRes, subRes] = await Promise.all([
      fetch(`${API_BASE}/api/quiz/${quizId}`),
      fetch(`${API_BASE}/api/quiz/${quizId}/questions`),
      fetch(`${API_BASE}/api/quiz/${quizId}/submissions`),
    ]);

    const qz = (await quizRes.json()) as QuizSet;
    setQuiz(qz);
    setSettingsName(qz.name ?? "");
    setSettingsDescription(qz.description ?? "");
    setSettingsPublished(!!qz.published);
    setSettingsTimerMinutes(
      qz.timerMinutes && qz.timerMinutes > 0 ? String(qz.timerMinutes) : "",
    );

    setQuestions((await qRes.json()) as Question[]);
    setSubmissions((await subRes.json()) as QuizSubmission[]);
  };

  const loadBanks = async () => {
    if (!userId) return;
    const res = await fetch(`${API_BASE}/api/quiz/banks/user/${userId}`);
    const rows = (await res.json()) as QuestionBank[];
    setQuestionBanks(rows);
    if (!selectedBankId || !rows.some((x) => x.id === selectedBankId)) {
      setSelectedBankId(rows[0]?.id ?? "");
    }
  };

  const loadBankItems = async (bankId: string) => {
    if (!bankId) {
      setBankItems([]);
      return;
    }
    const res = await fetch(`${API_BASE}/api/quiz/banks/${bankId}/questions`);
    setBankItems((await res.json()) as QuestionBankItem[]);
  };

  useEffect(() => {
    const syncAuth = () => setUserId(getAuthUser()?.id ?? "");
    syncAuth();
    window.addEventListener("auth-changed", syncAuth);
    window.addEventListener("storage", syncAuth);
    return () => {
      window.removeEventListener("auth-changed", syncAuth);
      window.removeEventListener("storage", syncAuth);
    };
  }, []);

  useEffect(() => {
    void loadAll();
  }, [quizId]);

  useEffect(() => {
    void loadBanks();
  }, [userId]);

  useEffect(() => {
    void loadBankItems(selectedBankId);
  }, [selectedBankId]);

  useEffect(() => {
    if (!timerStarted || activeTimerSeconds === null) return;
    if (activeTimerSeconds <= 0) {
      void submitQuiz();
      return;
    }
    const t = setTimeout(() => {
      setActiveTimerSeconds((prev) => (prev === null ? null : prev - 1));
    }, 1000);
    return () => clearTimeout(t);
  }, [timerStarted, activeTimerSeconds]);

  const startCreateQuestion = () => {
    setEditingQuestionId("new");
    setEditingQuestionText("");
    setEditingQuestionType("multiple_choice");
    setEditingQuestionAttachments([]);
    setEditingAnswers([
      { text: "", isCorrect: true, weight: 1, attachments: [] },
      { text: "", isCorrect: false, weight: 0, attachments: [] },
    ]);
  };

  const startEditQuestion = (q: Question) => {
    setEditingQuestionId(q.id ?? "");
    setEditingQuestionText(q.text ?? "");
    setEditingQuestionType((q.type as any) ?? "multiple_choice");
    setEditingQuestionAttachments(q.attachments ?? []);
    const next = (q.answers ?? []).map((a) => ({
      text: a.text ?? "",
      isCorrect: !!a.isCorrect,
      weight: a.weight ?? (a.isCorrect ? 1 : 0),
      attachments: a.attachments ?? [],
    }));
    if (next.length === 0)
      next.push({ text: "", isCorrect: true, weight: 1, attachments: [] });
    setEditingAnswers(next);
  };

  const cancelQuestionEdit = () => {
    setEditingQuestionId("");
    setEditingQuestionText("");
    setEditingQuestionType("multiple_choice");
    setEditingQuestionAttachments([]);
    setEditingAnswers([
      { text: "", isCorrect: true, weight: 1, attachments: [] },
      { text: "", isCorrect: false, weight: 0, attachments: [] },
    ]);
  };

  const addQuestionAttachments = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingAttachments(true);
    try {
      const uploaded = await Promise.all(
        Array.from(files).map((f) => uploadFile(API_BASE, f)),
      );
      setEditingQuestionAttachments((prev) => [...prev, ...uploaded]);
    } finally {
      setUploadingAttachments(false);
    }
  };

  const addAnswerAttachments = async (
    answerIndex: number,
    files: FileList | null,
  ) => {
    if (!files || files.length === 0) return;
    setUploadingAttachments(true);
    try {
      const uploaded = await Promise.all(
        Array.from(files).map((f) => uploadFile(API_BASE, f)),
      );
      setEditingAnswers((prev) =>
        prev.map((row, idx) =>
          idx === answerIndex
            ? { ...row, attachments: [...(row.attachments ?? []), ...uploaded] }
            : row,
        ),
      );
    } finally {
      setUploadingAttachments(false);
    }
  };

  const saveQuestion = async () => {
    if (!canEdit || !quizId || !editingQuestionText.trim()) return;
    const payload = {
      text: editingQuestionText.trim(),
      type: editingQuestionType,
      attachments: editingQuestionAttachments,
      answers: editingAnswers,
    };
    const url =
      editingQuestionId === "new"
        ? `${API_BASE}/api/quiz/${quizId}/questions`
        : `${API_BASE}/api/quiz/${quizId}/questions/${editingQuestionId}`;
    const method = editingQuestionId === "new" ? "POST" : "PATCH";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    cancelQuestionEdit();
    await loadAll();
  };

  const deleteQuestion = async (questionId?: string) => {
    if (!canEdit || !quizId || !questionId) return;
    await fetch(`${API_BASE}/api/quiz/${quizId}/questions/${questionId}`, {
      method: "DELETE",
    });
    await loadAll();
  };

  const submitQuiz = async () => {
    if (!userId || activeQuestions.length === 0) return;
    const answers = activeQuestions.map((q, idx) =>
      q.type === "multiple_choice"
        ? (selectedAnswerIndexes[idx]?.[0] ?? -1)
        : -1,
    );
    const multiAnswers = activeQuestions.map((q, idx) =>
      q.type === "multiple_choice" ? (selectedAnswerIndexes[idx] ?? []) : [],
    );
    const textAnswers = activeQuestions.map((q, idx) =>
      q.type === "multiple_choice" ? "" : (typedAnswers[idx] ?? "").trim(),
    );
    if (bankPracticeMode) {
      let score = 0;
      for (let i = 0; i < activeQuestions.length; i++) {
        const q = activeQuestions[i];
        const t = q.type ?? "multiple_choice";
        if (t === "multiple_choice") {
          const all = q.answers ?? [];
          const selected = new Set<number>(multiAnswers[i] ?? []);
          let pos = 0;
          let earned = 0;
          for (let ai = 0; ai < all.length; ai++) {
            const a = all[ai];
            const w = Math.max(0, a.weight ?? (a.isCorrect ? 1 : 0));
            if (a.isCorrect) pos += w;
            if (selected.has(ai)) earned += a.isCorrect ? w : -w;
          }
          if (pos > 0) score += Math.max(0, Math.min(earned / pos, 1)) * pos;
          continue;
        }
        const expected = (q.answers ?? [])[0]?.text?.trim().toLowerCase() ?? "";
        const given = (textAnswers[i] ?? "").trim().toLowerCase();
        if (expected && expected === given) score += 1;
      }

      setLatestSubmission({
        userId,
        score,
        date: new Date().toISOString(),
        answers,
        multiAnswers,
        textAnswers,
      });
      return;
    }
    if (!quizId) return;
    const res = await fetch(`${API_BASE}/api/quiz/${quizId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, answers, multiAnswers, textAnswers }),
    });

    const sub = (await res.json()) as QuizSubmission;
    setLatestSubmission(sub);

    await loadAll();
  };

  const markCurrentSkipped = () => {
    setSkippedQuestions((prev) => ({ ...prev, [currentQuestionIndex]: true }));
    setCurrentQuestionIndex((idx) =>
      Math.min(activeQuestions.length - 1, idx + 1),
    );
  };

  const saveQuiz = async () => {
    if (!canEdit || !quizId) return;
    const timerVal = settingsTimerMinutes.trim();
    const parsedTimer = timerVal ? Number.parseInt(timerVal, 10) : null;
    await fetch(`${API_BASE}/api/quiz/${quizId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: settingsName,
        description: settingsDescription,
        published: settingsPublished,
        timerMinutes:
          parsedTimer && Number.isFinite(parsedTimer) && parsedTimer > 0
            ? parsedTimer
            : null,
      }),
    });

    await loadAll();
  };

  const startAttemptTimer = () => {
    const base = quiz?.timerMinutes ?? null;
    const custom = customTimerMinutes.trim()
      ? Number.parseInt(customTimerMinutes, 10)
      : null;
    let minutes: number | null = null;
    if (base && base > 0) {
      minutes = custom && custom > 0 ? Math.min(base, custom) : base;
    } else if (custom && custom > 0) {
      minutes = custom;
    }
    if (!minutes) {
      setTimerStarted(false);
      setActiveTimerSeconds(null);
      return;
    }
    setActiveTimerSeconds(minutes * 60);
    setTimerStarted(true);
  };

  const createBank = async () => {
    if (!userId || !bankName.trim()) return;
    const res = await fetch(`${API_BASE}/api/quiz/banks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        name: bankName.trim(),
        description: "",
      }),
    });
    if (!res.ok) return "";
    const created = (await res.json()) as QuestionBank;
    setBankName("");
    await loadBanks();
    if (created.id) setSelectedBankId(created.id);
    return created.id ?? "";
  };

  const addCurrentQuestionToBank = async (q: Question, bankId?: string) => {
    const targetBankId = bankId ?? selectedBankId;
    if (!targetBankId) return;
    await fetch(`${API_BASE}/api/quiz/banks/${targetBankId}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        text: q.text,
        type: q.type,
        attachments: q.attachments ?? [],
        answers: q.answers ?? [],
      }),
    });
    await loadBankItems(targetBankId);
  };

  const addQuestionFromBank = async (itemId?: string) => {
    if (!quizId || !itemId) return;
    await fetch(
      `${API_BASE}/api/quiz/${quizId}/questions/from-bank/${itemId}`,
      {
        method: "POST",
      },
    );
    await loadAll();
  };

  const startBankPractice = () => {
    const source = selectedBankId ? bankItems : [];
    if (source.length === 0) return;
    setBankPracticeQuestions(
      source.map((x, idx) => ({
        id: x.id ?? `bank-${idx}`,
        quizId: "bank-practice",
        text: x.text ?? "",
        type: x.type ?? "multiple_choice",
        attachments: x.attachments ?? [],
        answers: x.answers ?? [],
      })),
    );
    const selected = questionBanks.find((b) => b.id === selectedBankId);
    setBankPracticeName(selected?.name ?? "Question Bank");
    setBankPracticeMode(true);
    setCurrentQuestionIndex(0);
    setSelectedAnswerIndexes({});
    setTypedAnswers({});
    setSkippedQuestions({});
    setTab("answer");
  };

  const createQuizFromBank = async () => {
    if (!userId || !selectedBankId || bankItems.length === 0) return;
    const selected = questionBanks.find((b) => b.id === selectedBankId);
    const name = selected?.name?.trim() || "Question Bank Quiz";
    const createdRes = await fetch(`${API_BASE}/api/quiz`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        name,
        description: selected?.description ?? "Generated from question bank",
        published: false,
      }),
    });

    const created = (await createdRes.json()) as QuizSet;
    if (!created.id) return;
    for (const item of bankItems) {
      await fetch(`${API_BASE}/api/quiz/${created.id}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: item.text ?? "",
          type: item.type ?? "multiple_choice",
          attachments: item.attachments ?? [],
          answers: item.answers ?? [],
        }),
      });
    }
    window.location.href = `/quiz/${created.id}`;
  };

  const createStudyLoopFlashcards = async () => {
    if (!quiz || !userId || questions.length === 0) return;
    const last = latestSubmission ?? myLatestSubmission;
    if (!last) return;

    const missed: { front: string; back: string }[] = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const type = q.type ?? "multiple_choice";
      if (type === "multiple_choice") {
        const givenSet = new Set<number>(last.multiAnswers?.[i] ?? []);
        const correctSet = new Set<number>(
          (q.answers ?? [])
            .map((a, idx) => ({ a, idx }))
            .filter(({ a }) => a.isCorrect)
            .map(({ idx }) => idx),
        );
        const exact =
          givenSet.size === correctSet.size &&
          Array.from(givenSet).every((x) => correctSet.has(x));
        if (!exact) {
          missed.push({
            front: q.text ?? `Question ${i + 1}`,
            back:
              (q.answers ?? []).find((a) => a.isCorrect)?.text ??
              "Review this concept",
          });
        }
      } else {
        const expected = (q.answers ?? [])[0]?.text?.trim().toLowerCase() ?? "";
        const given = (last.textAnswers?.[i] ?? "").trim().toLowerCase();
        if (!expected || expected !== given) {
          missed.push({
            front: q.text ?? `Question ${i + 1}`,
            back: (q.answers ?? [])[0]?.text ?? "Review expected answer",
          });
        }
      }
    }

    const setRes = await fetch(`${API_BASE}/api/flashcards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        name: `${quiz.name ?? "Quiz"} - Study Loop`,
        description: "Generated from missed quiz questions",
        published: false,
      }),
    });

    const set = (await setRes.json()) as { id?: string };
    if (!set.id) return;
    for (const card of missed) {
      await fetch(`${API_BASE}/api/flashcards/${set.id}/cards`, {
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
  };

  return (
    <main className="mx-auto max-w-7xl min-h-screen overflow-y-auto p-6 py-30 space-y-6">
      <section className="rounded-lg border p-4 space-y-3">
        <h1 className="text-3xl font-semibold">
          {bankPracticeMode
            ? `${bankPracticeName || "Question Bank"} Practice`
            : (quiz?.name ?? "Quiz")}
        </h1>
        <MarkdownContent
          className="prose prose-sm max-w-none text-muted-foreground dark:prose-invert"
          content={quiz?.description ?? ""}
        />
        <p className="text-xs text-muted-foreground">
          Code: <span className="font-mono">{quiz?.code ?? "—"}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={tab === "answer" ? "default" : "outline"}
            onClick={() => setTab("answer")}
          >
            Answer
          </Button>
          <Button
            variant={tab === "questions" ? "default" : "outline"}
            onClick={() => setTab("questions")}
          >
            Questions
          </Button>
          <Button
            variant={tab === "settings" ? "default" : "outline"}
            onClick={() => setTab("settings")}
            disabled={!canEdit}
          >
            Settings
          </Button>
          <Button
            variant={tab === "results" ? "default" : "outline"}
            onClick={() => setTab("results")}
          >
            Results
          </Button>
        </div>
        {bankPracticeMode && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setBankPracticeMode(false);
                setCurrentQuestionIndex(0);
                setSelectedAnswerIndexes({});
                setTypedAnswers({});
                setSkippedQuestions({});
              }}
            >
              Exit bank practice
            </Button>
          </div>
        )}
      </section>

      {tab === "answer" && (
        <section className="rounded-lg border p-4 space-y-4">
          <div className="rounded-md border p-3 space-y-2">
            <div className="text-sm">
              Forced max timer:{" "}
              <span className="font-medium">
                {quiz?.timerMinutes && quiz.timerMinutes > 0
                  ? `${quiz.timerMinutes} min`
                  : "None"}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                className="max-w-48"
                type="number"
                min={1}
                max={
                  quiz?.timerMinutes && quiz.timerMinutes > 0
                    ? quiz.timerMinutes
                    : undefined
                }
                value={customTimerMinutes}
                onChange={(e) => setCustomTimerMinutes(e.target.value)}
                placeholder={
                  quiz?.timerMinutes && quiz.timerMinutes > 0
                    ? `Timer <= ${quiz.timerMinutes} mins`
                    : "Timer (mins)"
                }
              />
              <Button variant="outline" onClick={startAttemptTimer}>
                Start
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setTimerStarted(false);
                  setActiveTimerSeconds(null);
                }}
              >
                Clear
              </Button>
              {activeTimerSeconds !== null && (
                <span className="text-sm font-medium">
                  Left: {Math.floor(activeTimerSeconds / 60)}:
                  {String(activeTimerSeconds % 60).padStart(2, "0")}
                </span>
              )}
            </div>
          </div>
          {activeQuestions.length > 0 && (
            <div className="flex flex-wrap gap-2 rounded-md border p-2">
              {activeQuestions.map((q, idx) => {
                const state = questionState(idx);
                const style =
                  state === "answered"
                    ? "border-green-500 bg-green-500/15 text-green-700 dark:text-green-300"
                    : state === "skipped"
                      ? "border-red-500 bg-red-500/15 text-red-700 dark:text-red-300"
                      : "border-border bg-transparent";
                return (
                  <button
                    key={q.id ?? idx}
                    type="button"
                    className={`h-8 min-w-8 rounded border px-2 text-xs ${style} ${
                      currentQuestionIndex === idx
                        ? "ring-2 ring-primary/40"
                        : ""
                    }`}
                    onClick={() => setCurrentQuestionIndex(idx)}
                    title={`Question ${idx + 1}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          )}

          {currentQuestion && (
            <div className="rounded-md border p-3 space-y-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Question {currentQuestionIndex + 1} of {activeQuestions.length}{" "}
                •{" "}
                {currentQuestion.type === "fill_gap"
                  ? "Fill in the gap"
                  : currentQuestion.type === "short_answer"
                    ? "Short answer"
                    : "Multiple choice"}
              </p>
              <MarkdownContent
                className="prose prose-sm max-w-none dark:prose-invert"
                content={currentQuestion.text ?? ""}
              />
              <AttachmentPreview attachments={currentQuestion.attachments} />

              {currentQuestion.type === "multiple_choice" ? (
                <div className="space-y-2">
                  {(currentQuestion.answers ?? []).map((a, ai) => (
                    <div
                      key={`${currentQuestion.id}-a-${ai}`}
                      className="rounded border p-2 space-y-2"
                    >
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={(
                            selectedAnswerIndexes[currentQuestionIndex] ?? []
                          ).includes(ai)}
                          onChange={() => {
                            setSelectedAnswerIndexes((prev) => ({
                              ...prev,
                              [currentQuestionIndex]: (
                                prev[currentQuestionIndex] ?? []
                              ).includes(ai)
                                ? (prev[currentQuestionIndex] ?? []).filter(
                                    (x) => x !== ai,
                                  )
                                : [...(prev[currentQuestionIndex] ?? []), ai],
                            }));
                            setSkippedQuestions((prev) => ({
                              ...prev,
                              [currentQuestionIndex]: false,
                            }));
                          }}
                        />
                        <span>{a.text}</span>
                      </label>
                      <AttachmentPreview attachments={a.attachments} />
                    </div>
                  ))}
                </div>
              ) : (
                <Input
                  placeholder={
                    currentQuestion.type === "fill_gap"
                      ? "Type the missing phrase"
                      : "Type your answer"
                  }
                  value={typedAnswers[currentQuestionIndex] ?? ""}
                  onChange={(e) => {
                    setTypedAnswers((prev) => ({
                      ...prev,
                      [currentQuestionIndex]: e.target.value,
                    }));
                    if (e.target.value.trim().length > 0) {
                      setSkippedQuestions((prev) => ({
                        ...prev,
                        [currentQuestionIndex]: false,
                      }));
                    }
                  }}
                />
              )}

              <div className="flex flex-wrap gap-2">
                {!!userId && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      setBankTargetQuestionIndex(currentQuestionIndex)
                    }
                  >
                    Save to bank
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() =>
                    setCurrentQuestionIndex((idx) => Math.max(0, idx - 1))
                  }
                  disabled={currentQuestionIndex === 0}
                >
                  <ArrowBigLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    setCurrentQuestionIndex((idx) =>
                      Math.min(activeQuestions.length - 1, idx + 1),
                    )
                  }
                  disabled={currentQuestionIndex >= activeQuestions.length - 1}
                >
                  <ArrowBigRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={markCurrentSkipped}>
                  <SkipForward className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          {activeQuestions.length > 0 ? (
            <Button onClick={() => void submitQuiz()} disabled={!userId}>
              Submit
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              No questions in this quiz yet.
            </p>
          )}
          {bankTargetQuestionIndex !== null && (
            <div className="rounded-md border p-3 space-y-2">
              <p className="text-sm font-medium">
                Save Question {bankTargetQuestionIndex + 1} to a bank
              </p>
              <div className="flex gap-2">
                <select
                  value={selectedBankId}
                  onChange={(e) => setSelectedBankId(e.target.value)}
                  className="rounded-md border bg-background p-2 text-sm"
                >
                  <option value="">Select bank</option>
                  {questionBanks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  disabled={!selectedBankId}
                  onClick={() => {
                    const q = activeQuestions[bankTargetQuestionIndex];
                    if (!q) return;
                    void addCurrentQuestionToBank(q, selectedBankId);
                    setBankTargetQuestionIndex(null);
                  }}
                >
                  Add to bank
                </Button>
              </div>
              <div className="flex gap-2">
                <Input
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="New bank name"
                />
                <Button
                  variant="outline"
                  onClick={async () => {
                    const q = activeQuestions[bankTargetQuestionIndex];
                    if (!q) return;
                    const createdId = await createBank();
                    const targetId = createdId || selectedBankId;
                    if (!targetId) return;
                    await addCurrentQuestionToBank(q, targetId);
                    setBankTargetQuestionIndex(null);
                  }}
                >
                  Add
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setBankTargetQuestionIndex(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </section>
      )}

      {tab === "questions" && (
        <section className="rounded-lg border p-4 space-y-4">
          {canEdit && (
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={startCreateQuestion}
                disabled={editingQuestionId === "new"}
              >
                Add question
              </Button>
            </div>
          )}

          {editingQuestionId && canEdit && (
            <div className="rounded-md border p-3 space-y-3">
              <MarkdownEditor
                value={editingQuestionText}
                onChange={setEditingQuestionText}
                placeholder="Question text"
                minRows={6}
              />
              <AIAppendControls
                domain="quiz question"
                content={editingQuestionText}
                onAppend={(text) =>
                  setEditingQuestionText((prev) =>
                    prev ? `${prev}\n${text}` : text,
                  )
                }
              />
              <label className="inline-flex">
                <input
                  type="file"
                  className="hidden"
                  multiple
                  onChange={(e) => void addQuestionAttachments(e.target.files)}
                />
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  disabled={uploadingAttachments}
                  asChild
                >
                  <span>
                    {uploadingAttachments ? "Uploading..." : "Attach"}
                  </span>
                </Button>
              </label>
              <AttachmentPreview
                attachments={editingQuestionAttachments}
                onRemove={(idx) =>
                  setEditingQuestionAttachments((prev) =>
                    prev.filter((_, i) => i !== idx),
                  )
                }
              />
              <select
                value={editingQuestionType}
                onChange={(e) => setEditingQuestionType(e.target.value as any)}
                className="rounded-md border bg-background p-2 text-sm"
              >
                <option value="multiple_choice">Multiple choice</option>
                <option value="fill_gap">Fill in the gap</option>
                <option value="short_answer">Short answer</option>
              </select>

              {editingQuestionType === "multiple_choice" ? (
                <div className="space-y-2">
                  {editingAnswers.map((a, i) => (
                    <div key={i} className="rounded border p-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={a.isCorrect === true}
                          onChange={() =>
                            setEditingAnswers((prev) =>
                              prev.map((row, idx) =>
                                idx === i
                                  ? { ...row, isCorrect: !row.isCorrect }
                                  : row,
                              ),
                            )
                          }
                        />
                        <Input
                          value={a.text ?? ""}
                          onChange={(e) =>
                            setEditingAnswers((prev) =>
                              prev.map((row, idx) =>
                                idx === i
                                  ? { ...row, text: e.target.value }
                                  : row,
                              ),
                            )
                          }
                          placeholder={`Option ${i + 1}`}
                        />
                        <Input
                          type="number"
                          min={0}
                          step={0.1}
                          className="max-w-28"
                          value={String(a.weight ?? (a.isCorrect ? 1 : 0))}
                          onChange={(e) =>
                            setEditingAnswers((prev) =>
                              prev.map((row, idx) =>
                                idx === i
                                  ? {
                                      ...row,
                                      weight:
                                        Number.parseFloat(e.target.value) || 0,
                                    }
                                  : row,
                              ),
                            )
                          }
                          placeholder="Weight"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setEditingAnswers((prev) =>
                              prev.length <= 2
                                ? prev
                                : prev.filter((_, idx) => idx !== i),
                            )
                          }
                        >
                          Remove
                        </Button>
                      </div>
                      <label className="inline-flex">
                        <input
                          type="file"
                          className="hidden"
                          multiple
                          onChange={(e) =>
                            void addAnswerAttachments(i, e.target.files)
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
                            {uploadingAttachments ? "Uploading..." : "Attach"}
                          </span>
                        </Button>
                      </label>
                      <AttachmentPreview
                        attachments={a.attachments}
                        onRemove={(attIdx) =>
                          setEditingAnswers((prev) =>
                            prev.map((row, idx) =>
                              idx === i
                                ? {
                                    ...row,
                                    attachments: (row.attachments ?? []).filter(
                                      (_, j) => j !== attIdx,
                                    ),
                                  }
                                : row,
                            ),
                          )
                        }
                      />
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setEditingAnswers((prev) => [
                        ...prev,
                        {
                          text: "",
                          isCorrect: false,
                          weight: 0,
                          attachments: [],
                        },
                      ])
                    }
                  >
                    Add
                  </Button>
                </div>
              ) : (
                <Input
                  value={editingAnswers[0]?.text ?? ""}
                  onChange={(e) =>
                    setEditingAnswers([
                      { text: e.target.value, isCorrect: true, weight: 1 },
                    ])
                  }
                  placeholder="Correct answer"
                />
              )}

              <div className="flex gap-2">
                <Button size="sm" onClick={() => void saveQuestion()}>
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={cancelQuestionEdit}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {canEdit && (
              <div className="rounded-md border p-3 space-y-2">
                <h3 className="text-sm font-medium">Question banks</h3>
                <div className="flex gap-2">
                  <Input
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="New bank name"
                  />
                  <Button size="sm" onClick={() => void createBank()}>
                    Create bank
                  </Button>
                </div>
                <div className="flex gap-2">
                  <select
                    value={selectedBankId}
                    onChange={(e) => setSelectedBankId(e.target.value)}
                    className="rounded-md border bg-background p-2 text-sm"
                  >
                    <option value="">Select bank</option>
                    {questionBanks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                {!!selectedBankId && !!userId && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={startBankPractice}
                    >
                      Practice bank as quiz
                    </Button>
                    <Button size="sm" onClick={() => void createQuizFromBank()}>
                      Create quiz from bank
                    </Button>
                  </div>
                )}
                {selectedBankId && (
                  <div className="space-y-2 rounded border p-2">
                    <p className="text-xs text-muted-foreground">
                      Bank questions
                    </p>
                    {bankItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="text-sm line-clamp-1">
                          {item.text}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void addQuestionFromBank(item.id)}
                        >
                          Add to quiz
                        </Button>
                      </div>
                    ))}
                    {bankItems.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        No items in bank
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
            {questions.map((q, idx) => (
              <div
                key={q.id ?? idx}
                className="rounded-md border p-3 space-y-2"
              >
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {q.type === "fill_gap"
                    ? "Fill in the gap"
                    : q.type === "short_answer"
                      ? "Short answer"
                      : "Multiple choice"}
                </p>
                <MarkdownContent
                  className="prose prose-sm max-w-none dark:prose-invert"
                  content={q.text ?? ""}
                />
                <AttachmentPreview attachments={q.attachments} />
                {q.type === "multiple_choice" ? (
                  <ol className="list-decimal pl-5 text-sm text-muted-foreground space-y-2">
                    {(q.answers ?? []).map((a, i) => (
                      <li key={i}>
                        <div>
                          {a.text}
                          {a.isCorrect ? " (correct)" : ""}
                        </div>
                        <AttachmentPreview attachments={a.attachments} />
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Expected answer: {(q.answers ?? [])[0]?.text || "—"}
                  </p>
                )}

                {canEdit && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void addCurrentQuestionToBank(q)}
                      disabled={!selectedBankId}
                    >
                      Save to bank
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEditQuestion(q)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => void deleteQuestion(q.id)}
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === "settings" && canEdit && (
        <section className="rounded-lg border p-4 space-y-3 max-w-3xl">
          <h2 className="font-semibold">Quiz settings</h2>
          <Input
            value={settingsName}
            onChange={(e) => setSettingsName(e.target.value)}
            placeholder="Name"
          />
          <MarkdownEditor
            value={settingsDescription}
            onChange={setSettingsDescription}
            placeholder="Description"
            minRows={10}
          />
          <AIAppendControls
            domain="quiz description"
            content={settingsDescription}
            onAppend={(text) =>
              setSettingsDescription((prev) =>
                prev ? `${prev}\n\n${text}` : text,
              )
            }
          />
          <Input
            type="number"
            min={1}
            value={settingsTimerMinutes}
            onChange={(e) => setSettingsTimerMinutes(e.target.value)}
            placeholder="Timer (mins)"
          />

          <div className="rounded-md border p-3 text-sm space-y-1">
            <div>
              Share code:{" "}
              <span className="font-mono">{quiz?.code ?? "N/A"}</span>
            </div>
          </div>
          <label className="text-sm flex items-center gap-2">
            <input
              type="checkbox"
              checked={settingsPublished}
              onChange={(e) => setSettingsPublished(e.target.checked)}
            />
            Public
          </label>
          <Button onClick={() => void saveQuiz()}>Save quiz</Button>
        </section>
      )}

      {tab === "results" && (
        <section className="rounded-lg border p-4 space-y-3">
          <h2 className="font-semibold">Results</h2>
          {(latestSubmission ?? myLatestSubmission) && (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm">
                Your latest score:{" "}
                <span className="font-medium">
                  {(latestSubmission ?? myLatestSubmission)?.score ?? 0} /{" "}
                  {questions.length}
                </span>
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void createStudyLoopFlashcards()}
              >
                Create Study Loop Flashcards
              </Button>
            </div>
          )}
          <div className="space-y-2">
            {(canEdit
              ? submissions
              : submissions.filter((x) => x.userId === userId)
            ).map((s) => (
              <div key={s.id} className="rounded border p-2 text-sm">
                <div className="font-medium">
                  Score: {s.score ?? 0} / {questions.length}
                </div>
                <div className="text-xs text-muted-foreground">
                  User: {s.userId} •{" "}
                  {s.date ? new Date(s.date).toLocaleString() : "Unknown date"}
                </div>
              </div>
            ))}
            {submissions.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No submissions yet.
              </p>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
