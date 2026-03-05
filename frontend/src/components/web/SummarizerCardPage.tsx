"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { FileDropzone } from "./Dropzone";
import { generateAISummary } from "@/lib/summary";
import { MarkdownContent } from "./markdown-content";
import { saveNoteDraft } from "@/lib/ai-handoff";
import { Edit } from "lucide-react";

export function SummarizerCardPage() {
  const router = useRouter();
  const [fileTexts, setFileTexts] = useState<string[]>([]);
  const [longText, setLongText] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Called when Dropzone extracts text
  const handleUploadedFiles = async (texts: string[]) => {
    const updatedTexts = [...fileTexts, ...texts];
    setFileTexts(updatedTexts);

    await generateFromTexts(updatedTexts);
  };

  const generateFromTexts = async (texts: string[]) => {
    setError(null);
    setLoading(true);
    setSummary("");

    try {
      const combinedText = texts.join("\n\n") + "\n\n" + longText;

      if (!combinedText.trim()) {
        throw new Error("Notes cannot be empty");
      }

      const result = await generateAISummary(combinedText);
      setSummary(result);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    await generateFromTexts(fileTexts);
  };

  const sendToNotes = () => {
    if (!summary.trim()) return;
    saveNoteDraft({
      groupName: "AI Summaries",
      groupDescription: "Summaries generated from Hive AI.",
      noteTitle: `Summary ${new Date().toLocaleString()}`,
      noteContent: summary,
    });
    router.push("/notes");
  };

  return (
    <div className="mt-40">
      <section className="mt-12 mb-10 text-center">
        <h1 className="text-4xl font-bold mb-5">AI Summarizer</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Generate quick note summaries with AI using notes and uploaded files
        </p>
      </section>

      <section>
        <div className="flex justify-center">
          <Tabs defaultValue="files" className="w-[800px]">
            <TabsList>
              <TabsTrigger value="files">Files</TabsTrigger>
              <TabsTrigger value="long-text">Long Text</TabsTrigger>
            </TabsList>

            {/* FILE TAB */}
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

            {/* LONG TEXT TAB */}
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
                    <Button onClick={handleGenerate} disabled={loading}>
                      {loading ? "Summarizing..." : "Generate Summary"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={sendToNotes}
                      disabled={!summary.trim()}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        {/* Error */}
        {error && <p className="text-red-500 text-center mt-6">{error}</p>}
        {/* Summary output */}(
        <div className="flex justify-center mt-10">
          <Card className="w-[800px]">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-3">Summary</h2>
              <MarkdownContent content={summary} />
              {summary.trim() && (
                <div className="mt-4">
                  <Button variant="outline" onClick={sendToNotes}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        )
      </section>
    </div>
  );
}
