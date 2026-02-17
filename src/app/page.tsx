import Link from "next/link";
import WaitlistForm from "@/components/waitlist-form";

const featureCards = [
  {
    title: "Evidence over guesses",
    body: "Track experiments and customer signals in one place so decisions are data-backed."
  },
  {
    title: "Fast validation loops",
    body: "Ship hypothesis tests weekly with clear status, outcomes, and next actions."
  },
  {
    title: "Founder-ready workflow",
    body: "Move from idea to validated problem-solution fit before writing full product code."
  }
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-10 md:px-10">
      <header className="mb-16 flex items-center justify-between">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">Validate My Idea</p>
        <Link
          href="/dashboard"
          className="rounded-full border border-brand-700/30 bg-white px-5 py-2 text-sm font-medium text-brand-900 transition hover:border-brand-700/60"
        >
          Open dashboard
        </Link>
      </header>

      <section className="mb-16 max-w-3xl">
        <h1 className="mb-6 text-4xl font-bold leading-tight md:text-6xl">
          Build the right SaaS before
          <span className="text-brand-700"> building all of it.</span>
        </h1>
        <p className="mb-8 text-lg leading-relaxed text-brand-900/85">
          This starter gives you the base to manage ideas, run validation experiments, capture feedback, and scale into a full SaaS product.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-full bg-brand-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-800"
          >
            Start validating
          </Link>
          <a
            href="#features"
            className="rounded-full border border-[var(--line)] bg-white px-6 py-3 text-sm font-semibold text-brand-900 transition hover:border-brand-500"
          >
            View features
          </a>
        </div>
      </section>

      <section id="features" className="mb-8 grid gap-4 md:grid-cols-3">
        {featureCards.map((card) => (
          <article key={card.title} className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-6 shadow-sm">
            <h2 className="mb-2 text-lg font-semibold text-brand-900">{card.title}</h2>
            <p className="text-sm leading-relaxed text-brand-900/75">{card.body}</p>
          </article>
        ))}
      </section>

      <section className="max-w-xl">
        <WaitlistForm />
      </section>
    </main>
  );
}
