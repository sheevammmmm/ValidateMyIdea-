"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ValidateResponse = {
  success: boolean;
  analysis: {
    verdict: string;
    confidence: number;
    summary: string;
    nextSteps: string[];
  };
};

export default function ValidatePage() {
  const [idea, setIdea] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ValidateResponse | null>(null);

  async function submitValidation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, targetAudience })
      });

      const payload = (await response.json()) as ValidateResponse & { error?: string };

      if (!response.ok || !payload.success) {
        setError(payload.error ?? "Validation failed. Please try again.");
        setResult(null);
        return;
      }

      setResult(payload);
    } catch {
      setError("Network error. Please retry.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container py-8 md:py-12">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Validate your idea</CardTitle>
            <CardDescription>Describe your business concept and target audience to generate a research-backed recommendation.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={submitValidation}>
              <div className="space-y-2">
                <label className="text-sm font-medium">Idea</label>
                <Textarea
                  required
                  value={idea}
                  onChange={(event) => setIdea(event.target.value)}
                  placeholder="Example: AI-powered onboarding coach for remote sales teams"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Target audience</label>
                <Input
                  value={targetAudience}
                  onChange={(event) => setTargetAudience(event.target.value)}
                  placeholder="Example: Seed to Series A B2B SaaS founders"
                />
              </div>

              <Button type="submit" disabled={loading}>
                {loading ? "Running validation..." : "Run validation"}
              </Button>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest report</CardTitle>
            <CardDescription>Your AI summary appears here after each run.</CardDescription>
          </CardHeader>
          <CardContent>
            {!result ? (
              <p className="text-sm text-muted-foreground">No report yet. Submit an idea to generate your first validation summary.</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Verdict</p>
                  <p className="font-semibold">{result.analysis.verdict}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Confidence</p>
                  <p className="font-semibold">{Math.round(result.analysis.confidence * 100)}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Summary</p>
                  <p>{result.analysis.summary}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Suggested next steps</p>
                  <ul className="list-disc space-y-1 pl-5 text-sm">
                    {result.analysis.nextSteps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
