const metrics = [
  { label: "Ideas in discovery", value: "4" },
  { label: "Active experiments", value: "7" },
  { label: "Interviews this week", value: "12" },
  { label: "Validated ideas", value: "2" }
];

const queuedExperiments = [
  {
    title: "Pricing page smoke test",
    hypothesis: "Users will join a waitlist at $29/month for analytics automation.",
    status: "Running"
  },
  {
    title: "Founder interviews (B2B agencies)",
    hypothesis: "Top pain is reporting turnaround time, not dashboard customization.",
    status: "Planned"
  },
  {
    title: "Landing page variant: ROI headline",
    hypothesis: "Outcome-driven headline outperforms feature-driven copy by 20% CTR.",
    status: "Completed"
  }
];

export default function DashboardPage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10 md:px-10">
      <header className="mb-10">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">Dashboard</p>
        <h1 className="text-3xl font-bold md:text-4xl">Validation command center</h1>
      </header>

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <article key={metric.label} className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-brand-700/80">{metric.label}</p>
            <p className="text-2xl font-semibold text-brand-900">{metric.value}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-brand-900">Current experiments</h2>
        <div className="space-y-4">
          {queuedExperiments.map((exp) => (
            <article key={exp.title} className="rounded-xl border border-[var(--line)] p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold text-brand-900">{exp.title}</h3>
                <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">{exp.status}</span>
              </div>
              <p className="text-sm text-brand-900/75">{exp.hypothesis}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
