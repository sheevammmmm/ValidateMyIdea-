"use client";

import { FormEvent, useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [useCase, setUseCase] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, useCase: useCase || undefined })
      });

      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        setStatus("error");
        setMessage(result.message ?? "Submission failed.");
        return;
      }

      setStatus("success");
      setMessage("You are on the waitlist.");
      setEmail("");
      setUseCase("");
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-lg font-semibold text-brand-900">Join early access</h2>
      <p className="mb-4 text-sm text-brand-900/75">Collect your first users while validating your core hypothesis.</p>
      <div className="mb-3">
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
          className="w-full rounded-xl border border-[var(--line)] px-4 py-3 text-sm outline-none ring-brand-300 transition focus:ring-2"
        />
      </div>
      <div className="mb-4">
        <textarea
          value={useCase}
          onChange={(event) => setUseCase(event.target.value)}
          placeholder="What idea are you validating?"
          rows={3}
          className="w-full rounded-xl border border-[var(--line)] px-4 py-3 text-sm outline-none ring-brand-300 transition focus:ring-2"
        />
      </div>
      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full rounded-xl bg-brand-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {status === "loading" ? "Submitting..." : "Get access"}
      </button>
      {message ? <p className="mt-3 text-sm text-brand-900">{message}</p> : null}
    </form>
  );
}
