"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { FileDropzone } from "./Dropzone";
import { saveQuizDraft } from "@/lib/ai-handoff";
import { generateAIQuizQuestions, type QuizQuestion } from "@/lib/quiz";
import { getAIModels } from "@/lib/ai-append";
import { Edit } from "lucide-react";

export function QuizCardPage() {
  const router = useRouter();
  const [fileTexts, setFileTexts] = useState<string[]>([]);
  const [longText, setLongText] = useState("");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState("ministral");

  useEffect(() => {
    void (async () => {
      const rows = await getAIModels();
      if (rows.length === 0) return;
      setModels(rows);
      if (!rows.includes(model)) setModel(rows[0]);
    })();
  }, []);

  const handleUploadedFiles = async (texts: string[]) => {
    const updatedTexts = [...fileTexts, ...texts];
    setFileTexts(updatedTexts);
    await generateFromTexts(updatedTexts);
  };

  const generateFromTexts = async (texts: string[]) => {
    setLoading(true);
    setQuestions([]);

    try {
      const combinedText = texts.join("\n\n") + "\n\n" + longText;
      if (!combinedText.trim()) throw new Error("Notes cannot be empty");
      const rows = await generateAIQuizQuestions({
        notes: combinedText,
        model,
      });
      setQuestions(rows);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    await generateFromTexts(fileTexts);
  };

  const sendToQuizEditor = () => {
    if (questions.length === 0) return;
    saveQuizDraft({
      name: "AI Quiz",
      description: longText.trim() || "Generated from uploaded documents.",
      questions,
    });
    router.push("/quiz");
  };

  return (
    <div className="mt-40">
      <section className="mt-12 mb-10 text-center">
        <h1 className="text-4xl font-bold mb-5">Quiz Generator</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Generate quiz questions with AI from notes and uploaded files
        </p>
      </section>

      <section>
        <div className="flex justify-center">
          <Tabs defaultValue="files" className="w-[800px]">
            <TabsList>
              <TabsTrigger value="files">Files</TabsTrigger>
              <TabsTrigger value="long-text">Long Text</TabsTrigger>
            </TabsList>

            <TabsContent value="files">
              <FileDropzone onUploadComplete={handleUploadedFiles} />
              {fileTexts.length > 0 && (
                <div className="mt-6 text-sm">
                  <p className="font-medium mb-2">
                    Files processed: {fileTexts.length}
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="long-text">
              <Card className="relative mx-auto h-80 p-4">
                <CardContent className="h-full pb-16">
                  <textarea
                    value={longText}
                    onChange={(e) => setLongText(e.target.value)}
                    className="w-full h-full resize-none outline-none focus:outline-none text-white"
                    placeholder="Enter your text here..."
                  />
                </CardContent>

                <div className="absolute bottom-4 right-4">
                  <div className="flex items-center gap-2">
                    <select
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="rounded-md border bg-background p-2 text-sm"
                    >
                      {models.length === 0 && (
                        <option value="ministral">ministral</option>
                      )}
                      {models.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <Button onClick={handleGenerate} disabled={loading}>
                      {loading ? "Generating..." : "Generate"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={sendToQuizEditor}
                      disabled={questions.length === 0}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="mt-10 flex flex-wrap gap-4 justify-center">
          {questions.length > 0 && (
            <div className="w-full max-w-[800px] space-y-2">
              <div className="flex justify-end">
                <Button variant="outline" onClick={sendToQuizEditor}>
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
              {questions.map((q, i) => (
                <Card key={i}>
                  <CardContent className="p-4 space-y-1">
                    <div className="text-sm font-medium">
                      Q{i + 1}. {q.text}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {q.type ?? "multiple_choice"}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
