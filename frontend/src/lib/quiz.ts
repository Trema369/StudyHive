import { Attachment } from "@/lib/uploads";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5082";

export type QuizAnswer = {
  text?: string;
  isCorrect?: boolean;
  weight?: number;
  attachments?: Attachment[];
};

export type QuizQuestion = {
  text?: string;
  type?: "multiple_choice" | "fill_gap" | "short_answer";
  attachments?: Attachment[];
  answers?: QuizAnswer[];
};

export type AIQuizRequest = {
  notes: string;
  model?: string;
};

export async function generateAIQuizQuestions(req: AIQuizRequest) {
  const res = await fetch(`${API_BASE}/api/quiz/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new Error(payload?.message ?? "Failed to generate quiz questions");
  }
  return ((await res.json()) as QuizQuestion[]) ?? [];
}
