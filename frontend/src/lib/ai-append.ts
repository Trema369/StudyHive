const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5082";

export type AIAppendMode = "extrapolate" | "prompt_assisted" | "prompt";

export async function generateAIAppend(
  mode: AIAppendMode,
  content: string,
  prompt: string,
  domain: string,
  model?: string,
) {
  const res = await fetch(`${API_BASE}/api/ai/append`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode, content, prompt, domain, model }),
  });
  const data = (await res.json()) as { text?: string };
  return data.text ?? "";
}

export async function getAIModels() {
  const res = await fetch(`${API_BASE}/api/ai/models`);
  if (!res.ok) return [];
  return ((await res.json()) as string[]) ?? [];
}
