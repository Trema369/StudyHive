"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AIAppendMode, generateAIAppend, getAIModels } from "@/lib/ai-append";

export function AIAppendControls({
  domain,
  content,
  onAppend,
}: {
  domain: string;
  content: string;
  onAppend: (text: string) => void;
}) {
  const [mode, setMode] = useState<AIAppendMode>("extrapolate");
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState("ministral");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const needsPrompt = mode !== "extrapolate";

  useEffect(() => {
    void (async () => {
      const rows = await getAIModels();
      if (rows.length === 0) return;
      setModels(rows);
      if (!rows.includes(model)) setModel(rows[0]);
    })();
  }, []);

  const run = async () => {
    setError("");
    setLoading(true);
    try {
      const text = await generateAIAppend(mode, content, prompt, domain, model);
      if (text.trim().length > 0) onAppend(text.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI generation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-md border p-2 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="rounded-md border bg-background p-2 text-sm"
        >
          {models.length === 0 && <option value="ministral">ministral</option>}
          {models.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as AIAppendMode)}
          className="rounded-md border bg-background p-2 text-sm"
        >
          <option value="extrapolate">Extrapolate</option>
          <option value="prompt_assisted">Prompt assisted</option>
          <option value="prompt">Prompt only</option>
        </select>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void run()}
          disabled={loading}
        >
          {loading ? "Generating..." : "AI Add"}
        </Button>
      </div>
      {needsPrompt && (
        <Input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Prompt"
        />
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
