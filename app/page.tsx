import Link from "next/link";
import { Sora } from "next/font/google";
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  Lightbulb,
  MessageSquareText,
  Radar,
  Rocket,
  ShieldCheck,
  Sparkles,
  Target,
  Timer
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const sora = Sora({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display"
});

const navigation = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Signals", href: "#signals" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" }
];

const heroMetrics = [
  { value: "90 sec", label: "first validation" },
  { value: "7", label: "live market signals" },
  { value: "3", label: "free validations monthly" }
];

const signalSnapshot = [
  {
    label: "Demand Momentum",
    score: 84,
    barTone: "from-emerald-500 to-teal-500",
    note: "Found repeat pain points across niche communities."
  },
  {
    label: "Willingness to Pay",
    score: 71,
    barTone: "from-sky-500 to-cyan-500",
    note: "Strong intent around workflow speed and automation."
  },
  {
    label: "Competitive Pressure",
    score: 58,
    barTone: "from-amber-500 to-orange-500",
    note: "Crowded category, but positioning gap still open."
  },
  {
    label: "Urgency",
    score: 79,
    barTone: "from-fuchsia-500 to-rose-500",
    note: "High-friction jobs users want solved immediately."
  }
];

const workflow = [
  {
    title: "Describe idea",
    description: "Add your startup idea, audience, and stage so the validation engine has clear context.",
    icon: Lightbulb
  },
  {
    title: "Collect 7 signals",
    description: "We scan Reddit, HN, Product Hunt, X, Trends, App Store, and G2 for demand and urgency patterns.",
    icon: Radar
  },
  {
    title: "Get verdict + roadmap",
    description: "Receive a BUILD, PIVOT, or PASS verdict with next actions to execute your highest-confidence move.",
    icon: Rocket
  }
];

const socialProofStats = [
  { value: "12,400+", label: "validations run" },
  { value: "1,870+", label: "pivots caught early" },
  { value: "430+", label: "founders launched" }
];

const signalPillars = [
  {
    title: "Live conversation mining",
    body: "Analyze fresh discussions from communities where real buyers describe urgent pain."
  },
  {
    title: "Intent and urgency scoring",
    body: "Weight language signals that indicate users are actively searching for solutions."
  },
  {
    title: "Competitor landscape scan",
    body: "Spot saturation, whitespace, and narrative opportunities before you build."
  },
  {
    title: "Founder-market fit check",
    body: "Prioritize ideas aligned with your execution strengths and distribution channels."
  }
];

const comparison = [
  {
    criterion: "Research speed",
    oldWay: "Days of fragmented tabs",
    newWay: "One report in under 2 minutes"
  },
  {
    criterion: "Evidence quality",
    oldWay: "Gut feeling and anecdotes",
    newWay: "Multi-source weighted signal model"
  },
  {
    criterion: "Decision clarity",
    oldWay: "Unclear next step",
    newWay: "Concrete go / pivot / pause guidance"
  },
  {
    criterion: "Execution support",
    oldWay: "Start from scratch",
    newWay: "Interview prompts and launch actions"
  }
];

const testimonials = [
  {
    quote:
      "We were about to build the wrong onboarding flow. The report flagged low urgency and saved us a full sprint.",
    author: "Nadia Park",
    role: "SaaS Founder"
  },
  {
    quote:
      "It gave us a better wedge in one pass than two weeks of scattered research. Our waitlist conversion doubled.",
    author: "Luis Moreno",
    role: "Indie Builder"
  },
  {
    quote:
      "The score wasn’t just a number. The why behind it made our roadmap sharper and much easier to defend.",
    author: "Priya Desai",
    role: "Product Lead"
  }
];

const plans = [
  {
    name: "Free",
    price: "$0",
    detail: "3 validations / month",
    features: ["Signal snapshot", "Founder-market fit score", "Starter action plan"],
    cta: "Start Free",
    featured: false
  },
  {
    name: "Pro",
    price: "$29",
    detail: "Unlimited validations",
    features: ["Everything in Free", "Deep competitor scan", "Interview scripts and pivot recommendations"],
    cta: "Start 7-Day Trial",
    featured: true
  }
];

const faqs = [
  {
    question: "How is this different from asking a general AI model?",
    answer:
      "General AI can sound convincing without evidence. Validate My Idea runs a structured signal workflow and returns traceable reasoning for each score."
  },
  {
    question: "Can I use this before I have a full product concept?",
    answer:
      "Yes. You can validate at pre-idea stage with a lightweight concept and still get demand and risk direction."
  },
  {
    question: "Do I need customer interviews if I use this?",
    answer:
      "You still should run interviews. This tool helps you prioritize the right questions and audience before spending weeks on outreach."
  },
  {
    question: "Is the free plan enough for early testing?",
    answer:
      "For most early-stage founders, yes. Three validations are usually enough to compare initial concepts and choose one direction."
  }
];

export default function HomePage() {
  return (
    <main className={`${sora.variable} landing-revamp relative min-h-screen overflow-x-clip bg-[var(--lp-bg)] text-[var(--lp-ink)]`}>
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-[var(--lp-border)] bg-[color:var(--lp-surface-soft)]/90 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-black tracking-[0.18em] text-[var(--lp-ink)] md:text-base">
            <span className="inline-block h-2 w-2 rounded-full bg-[var(--lp-accent)]" aria-hidden />
            VALIDATEMYIDEA.APP
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-[var(--lp-muted)] md:flex" aria-label="Primary">
            {navigation.map((item) => (
              <Link key={item.href} href={item.href} className="transition-colors hover:text-[var(--lp-ink)]">
                {item.label}
              </Link>
            ))}
          </nav>

          <Button asChild className="h-9 rounded-full bg-[var(--lp-accent)] px-4 text-xs text-white hover:bg-[var(--lp-accent-strong)] md:text-sm">
            <Link href="/validate">Start Free</Link>
          </Button>
        </div>
      </header>

      <div className="lp-grid-bg relative">
        <div className="lp-blob lp-blob-left" aria-hidden />
        <div className="lp-blob lp-blob-right" aria-hidden />

        <section className="container relative grid gap-10 pb-16 pt-10 md:pb-24 md:pt-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-center" id="main-content">
          <div className="space-y-7 lp-rise">
            <Badge className="w-fit border-amber-200 bg-amber-100 text-amber-800 hover:bg-amber-100">Built for founders before they ship</Badge>

            <div className="space-y-4">
              <h1 className="max-w-3xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-[var(--lp-ink)] [font-family:var(--font-display)] sm:text-5xl lg:text-6xl">
                Stop guessing.
                <span className="block text-[var(--lp-accent)]">Launch ideas with evidence.</span>
              </h1>
              <p className="max-w-2xl text-base leading-relaxed text-[var(--lp-muted)] md:text-lg">
                Validate My Idea turns noisy internet chatter into a clear go, pivot, or pause decision. Get fast confidence before you burn
                runway building features nobody asked for.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="rounded-full bg-[var(--lp-accent)] px-7 text-white hover:bg-[var(--lp-accent-strong)]">
                <Link href="/validate" className="gap-2">
                  Validate My Idea (Free)
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full border-[var(--lp-border-strong)] bg-[var(--lp-surface)] text-[var(--lp-ink)] hover:bg-[var(--lp-surface-soft)]">
                <Link href="/sample-report">See Sample Report</Link>
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge className="border border-[var(--lp-border)] bg-[var(--lp-surface-soft)] text-[var(--lp-ink)] hover:bg-[var(--lp-surface-soft)]">
                Real Reddit/HN/PH data
              </Badge>
              <Badge className="border border-[var(--lp-border)] bg-[var(--lp-surface-soft)] text-[var(--lp-ink)] hover:bg-[var(--lp-surface-soft)]">
                No credit card
              </Badge>
              <Badge className="border border-[var(--lp-border)] bg-[var(--lp-surface-soft)] text-[var(--lp-ink)] hover:bg-[var(--lp-surface-soft)]">
                Report in &lt;2 min
              </Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {heroMetrics.map((metric, index) => (
                <Card key={metric.label} className={`border-[var(--lp-border)] bg-white/80 shadow-sm lp-rise lp-rise-delay-${index + 1}`}>
                  <CardContent className="space-y-1 p-4">
                    <p className="text-2xl font-bold tracking-tight text-[var(--lp-ink)]">{metric.value}</p>
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--lp-muted)]">{metric.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Card className="relative overflow-hidden border-[var(--lp-border-strong)] bg-[var(--lp-surface)] shadow-2xl shadow-cyan-900/10 lp-rise lp-rise-delay-2">
            <div className="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-gradient-to-br from-cyan-400/30 to-transparent lp-float" aria-hidden />
            <CardContent className="relative space-y-6 p-6 md:p-7">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--lp-muted)]">Validation Snapshot</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--lp-ink)]">AI onboarding copilot for remote sales teams</p>
                </div>
                <Badge className="border-transparent bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Viable angle</Badge>
              </div>

              <div className="rounded-2xl border border-[var(--lp-border)] bg-white p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--lp-muted)]">Overall confidence</p>
                <p className="mt-2 text-4xl font-bold text-[var(--lp-ink)]">82 / 100</p>
                <p className="mt-1 text-sm text-[var(--lp-muted)]">High demand with clear urgency from time-constrained operators.</p>
              </div>

              <div className="space-y-4">
                {signalSnapshot.map((signal, index) => (
                  <div key={signal.label} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-[var(--lp-ink)]">{signal.label}</span>
                      <span className="text-[var(--lp-muted)]">{signal.score}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200/70">
                      <div
                        className={`lp-meter h-full rounded-full bg-gradient-to-r ${signal.barTone}`}
                        style={{ width: `${signal.score}%`, animationDelay: `${0.2 + index * 0.1}s` }}
                      />
                    </div>
                    <p className="text-xs text-[var(--lp-muted)]">{signal.note}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-cyan-200 bg-cyan-50/90 p-4 text-sm text-cyan-900">
                <p className="font-semibold">Recommended wedge</p>
                <p className="mt-1">Lead with "faster onboarding QA" for teams handling high rep churn and inconsistent ramp quality.</p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      <section className="container pb-10">
        <div className="rounded-2xl border border-[var(--lp-border)] bg-[var(--lp-surface)] px-5 py-4 text-sm text-[var(--lp-muted)] md:px-6">
          <p className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="font-semibold text-[var(--lp-ink)]">Trusted by fast-moving founders</span>
            <span>Reddit signal mining</span>
            <span>HN trend analysis</span>
            <span>Product Hunt momentum</span>
            <span>Competitor saturation checks</span>
          </p>
        </div>
      </section>

      <section id="how-it-works" className="container scroll-mt-24 space-y-7 py-10 md:py-14">
        <div className="max-w-3xl space-y-3 lp-rise">
          <Badge variant="secondary" className="w-fit border border-[var(--lp-border)] bg-[var(--lp-surface-soft)] text-[var(--lp-ink)]">
            Decision Workflow
          </Badge>
          <h2 className="text-3xl font-semibold tracking-tight [font-family:var(--font-display)] md:text-4xl">From raw idea to confident next step</h2>
          <p className="text-base text-[var(--lp-muted)]">
            Every screen is designed around one founder job: decide what to build next with clear evidence and clear actions.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {workflow.map((item, index) => (
            <Card key={item.title} className={`border-[var(--lp-border)] bg-[var(--lp-surface)] shadow-sm lp-rise lp-rise-delay-${index + 1}`}>
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--lp-surface-soft)] text-sm font-bold text-[var(--lp-accent)]">
                    {index + 1}
                  </span>
                  <item.icon className="h-5 w-5 text-[var(--lp-accent)]" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--lp-ink)]">{item.title}</h3>
                <p className="text-sm leading-relaxed text-[var(--lp-muted)]">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="signals" className="container scroll-mt-24 py-10 md:py-14">
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:gap-8">
          <Card className="border-[var(--lp-border)] bg-[var(--lp-surface)] lp-rise">
            <CardContent className="space-y-5 p-6 md:p-7">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.13em] text-[var(--lp-muted)]">
                <Radar className="h-4 w-4" />
                What We Measure
              </div>

              <h3 className="text-2xl font-semibold leading-tight [font-family:var(--font-display)] md:text-3xl">
                Evidence designed for founder decisions, not vanity dashboards
              </h3>

              <div className="space-y-4">
                {signalPillars.map((item) => (
                  <div key={item.title} className="rounded-xl border border-[var(--lp-border)] bg-white p-4">
                    <p className="font-semibold text-[var(--lp-ink)]">{item.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-[var(--lp-muted)]">{item.body}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-[var(--lp-border)] bg-[var(--lp-surface)] lp-rise lp-rise-delay-1">
            <CardContent className="space-y-5 p-6 md:p-7">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.13em] text-[var(--lp-muted)]">
                <Target className="h-4 w-4" />
                Guesswork vs Signal-Led
              </div>

              <div className="space-y-3">
                {comparison.map((row) => (
                  <div key={row.criterion} className="grid gap-2 rounded-xl border border-[var(--lp-border)] bg-white p-4 md:grid-cols-[0.9fr_1fr_1fr] md:items-center md:gap-4">
                    <p className="text-sm font-semibold text-[var(--lp-ink)]">{row.criterion}</p>
                    <p className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">{row.oldWay}</p>
                    <p className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{row.newWay}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-[var(--lp-border)] bg-white p-4 text-center">
                  <Timer className="mx-auto h-4 w-4 text-[var(--lp-accent)]" />
                  <p className="mt-2 text-sm font-semibold text-[var(--lp-ink)]">Faster research</p>
                </div>
                <div className="rounded-xl border border-[var(--lp-border)] bg-white p-4 text-center">
                  <Compass className="mx-auto h-4 w-4 text-[var(--lp-accent)]" />
                  <p className="mt-2 text-sm font-semibold text-[var(--lp-ink)]">Clear direction</p>
                </div>
                <div className="rounded-xl border border-[var(--lp-border)] bg-white p-4 text-center">
                  <ShieldCheck className="mx-auto h-4 w-4 text-[var(--lp-accent)]" />
                  <p className="mt-2 text-sm font-semibold text-[var(--lp-ink)]">Lower risk</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="container py-10 md:py-14">
        <div className="max-w-3xl space-y-3 lp-rise">
          <Badge className="w-fit border-transparent bg-cyan-100 text-cyan-800 hover:bg-cyan-100">Social proof</Badge>
          <h2 className="text-3xl font-semibold tracking-tight [font-family:var(--font-display)] md:text-4xl">Founders use this before they commit engineering time</h2>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {socialProofStats.map((item) => (
            <Card key={item.label} className="border-[var(--lp-border)] bg-[var(--lp-surface)] shadow-sm">
              <CardContent className="space-y-1 p-6">
                <p className="text-3xl font-bold tracking-tight text-[var(--lp-ink)]">{item.value}</p>
                <p className="text-sm text-[var(--lp-muted)]">{item.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {testimonials.map((item, index) => (
            <Card key={item.author} className={`border-[var(--lp-border)] bg-[var(--lp-surface)] lp-rise lp-rise-delay-${index + 1}`}>
              <CardContent className="space-y-4 p-6">
                <p className="text-sm leading-relaxed text-[var(--lp-muted)]">“{item.quote}”</p>
                <div>
                  <p className="text-sm font-semibold text-[var(--lp-ink)]">{item.author}</p>
                  <p className="text-xs text-[var(--lp-muted)]">{item.role}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="pricing" className="container scroll-mt-24 py-10 md:py-14">
        <div className="max-w-2xl space-y-3 lp-rise">
          <Badge className="w-fit border-transparent bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Pricing</Badge>
          <h2 className="text-3xl font-semibold tracking-tight [font-family:var(--font-display)] md:text-4xl">Start free, upgrade when validation becomes weekly</h2>
          <p className="text-[var(--lp-muted)]">Simple pricing built for solo founders and lean product teams.</p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {plans.map((plan, index) => (
            <Card
              key={plan.name}
              className={`border ${
                plan.featured
                  ? "border-[var(--lp-accent)] bg-[var(--lp-surface)] shadow-lg shadow-cyan-900/10"
                  : "border-[var(--lp-border)] bg-[var(--lp-surface)]"
              } lp-rise lp-rise-delay-${index + 1}`}
            >
              <CardContent className="space-y-5 p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--lp-muted)]">{plan.name}</p>
                    <p className="mt-2 text-4xl font-bold text-[var(--lp-ink)]">{plan.price}</p>
                    <p className="mt-1 text-sm text-[var(--lp-muted)]">{plan.detail}</p>
                  </div>
                  {plan.featured ? <Badge className="bg-[var(--lp-accent)] text-white hover:bg-[var(--lp-accent)]">Most Popular</Badge> : null}
                </div>

                <ul className="space-y-2 text-sm text-[var(--lp-muted)]">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  className={
                    plan.featured
                      ? "w-full rounded-full bg-[var(--lp-accent)] text-white hover:bg-[var(--lp-accent-strong)]"
                      : "w-full rounded-full border-[var(--lp-border-strong)]"
                  }
                  variant={plan.featured ? "default" : "outline"}
                >
                  <Link href="/validate">{plan.cta}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="container py-8 md:py-12">
        <Card className="overflow-hidden border-[var(--lp-border-strong)] bg-gradient-to-br from-[#0e2a47] via-[#0f3458] to-[#0b3e53] text-slate-100 lp-rise">
          <CardContent className="relative space-y-5 p-8 md:p-10">
            <div className="absolute -left-10 top-4 h-24 w-24 rounded-full bg-cyan-300/20 blur-2xl" aria-hidden />
            <div className="absolute -right-12 bottom-0 h-24 w-24 rounded-full bg-amber-300/20 blur-2xl" aria-hidden />

            <Badge className="w-fit border border-cyan-200/60 bg-cyan-200/20 text-cyan-100 hover:bg-cyan-200/20">Ready to test your next bet?</Badge>
            <h2 className="max-w-3xl text-3xl font-semibold leading-tight [font-family:var(--font-display)] md:text-4xl">
              Build less. Validate smarter. Ship what buyers actually want.
            </h2>
            <p className="max-w-2xl text-sm text-cyan-50/80 md:text-base">
              Turn raw startup ideas into ranked opportunities with concrete next actions in one focused workflow.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="rounded-full bg-white text-slate-900 hover:bg-white/90">
                <Link href="/validate" className="gap-2">
                  Start Free Validation
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full border-cyan-100/60 bg-transparent text-cyan-50 hover:bg-cyan-100/10">
                <Link href="#signals">Review Signal Model</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section id="faq" className="container scroll-mt-24 py-10 md:py-14">
        <div className="max-w-3xl space-y-3 lp-rise">
          <Badge variant="secondary" className="w-fit border border-[var(--lp-border)] bg-[var(--lp-surface-soft)] text-[var(--lp-ink)]">
            FAQ
          </Badge>
          <h2 className="text-3xl font-semibold tracking-tight [font-family:var(--font-display)] md:text-4xl">Questions founders ask before they start</h2>
        </div>

        <div className="mt-6 space-y-3">
          {faqs.map((item, index) => (
            <details key={item.question} className={`group rounded-xl border border-[var(--lp-border)] bg-[var(--lp-surface)] p-5 lp-rise lp-rise-delay-${(index % 3) + 1}`}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-[var(--lp-ink)] md:text-base">
                {item.question}
                <Sparkles className="h-4 w-4 text-[var(--lp-accent)] transition-transform group-open:rotate-45" />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-[var(--lp-muted)]">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="border-t border-[var(--lp-border)] bg-[var(--lp-surface)]/85">
        <div className="container flex flex-col gap-4 py-8 text-sm text-[var(--lp-muted)] md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} ValidateMyIdea.app</p>
          <div className="flex items-center gap-4">
            <Link href="#pricing" className="hover:text-[var(--lp-ink)]">
              Pricing
            </Link>
            <Link href="#faq" className="hover:text-[var(--lp-ink)]">
              FAQ
            </Link>
            <Link href="/validate" className="inline-flex items-center gap-1 font-semibold text-[var(--lp-ink)] hover:text-[var(--lp-accent)]">
              Validate now <MessageSquareText className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
