import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const metrics = [
  { label: "Ideas analyzed", value: "16" },
  { label: "High potential", value: "5" },
  { label: "Needs iteration", value: "8" },
  { label: "Discarded", value: "3" }
];

const queue = [
  {
    title: "AI legal co-pilot for SMBs",
    status: "In progress",
    source: "Reddit + Product Hunt"
  },
  {
    title: "Sales pipeline health agent",
    status: "Queued",
    source: "X + Google Trends"
  },
  {
    title: "Customer interview summarizer",
    status: "Completed",
    source: "HN + Search"
  }
];

export default function DashboardPage() {
  return (
    <main className="container py-8 md:py-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.15em] text-brand-700">Dashboard</p>
          <h1 className="text-3xl font-bold">Validation command center</h1>
        </div>
        <Button asChild>
          <Link href="/validate">Analyze a new idea</Link>
        </Button>
      </div>

      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{metric.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{metric.value}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4">
        {queue.map((item) => (
          <Card key={item.title}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-6">
              <div>
                <p className="font-semibold">{item.title}</p>
                <p className="text-sm text-muted-foreground">Source set: {item.source}</p>
              </div>
              <p className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">{item.status}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
