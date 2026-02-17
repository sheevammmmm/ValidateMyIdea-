import Link from "next/link";
import { Features } from "@/components/landing/Features";
import { Hero } from "@/components/landing/Hero";
import { Pricing } from "@/components/landing/Pricing";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { SolutionSection } from "@/components/landing/SolutionSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const testimonials = [
  {
    quote:
      "I almost built the wrong product. ValidateMyIdea showed weak buyer urgency in under 2 minutes and saved us 3 months.",
    author: "Sarah K.",
    role: "B2B SaaS Founder"
  },
  {
    quote: "The pivot suggestions were scary accurate. We changed positioning and got our first 27 waitlist signups in one week.",
    author: "Daniel R.",
    role: "Indie Hacker"
  },
  {
    quote: "Best pre-build tool I have used. It gave us clear signals on demand and competitor saturation before we wrote code.",
    author: "Maya T.",
    role: "Product Studio Operator"
  }
];

const footerLinks = [
  { label: "About", href: "#" },
  { label: "Pricing", href: "#pricing" },
  { label: "Blog", href: "#" },
  { label: "Twitter", href: "https://twitter.com" },
  { label: "Email", href: "mailto:hello@validatemyidea.com" }
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50/70 via-white to-emerald-50/40">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/90 backdrop-blur">
        <div className="container flex items-center justify-between py-4">
          <Link href="/" className="text-base font-extrabold tracking-tight text-slate-950 md:text-lg">
            ValidateMyIdea.com
          </Link>

          <nav className="hidden items-center gap-5 text-sm text-slate-600 md:flex">
            <Link href="#problem" className="transition hover:text-slate-950">
              Problem
            </Link>
            <Link href="#solution" className="transition hover:text-slate-950">
              Solution
            </Link>
            <Link href="#features" className="transition hover:text-slate-950">
              Features
            </Link>
            <Link href="#pricing" className="transition hover:text-slate-950">
              Pricing
            </Link>
          </nav>

          <Button asChild className="h-9 bg-[#6366f1] px-4 text-xs hover:bg-[#4f46e5] md:text-sm">
            <Link href="/validate">Validate My Idea (Free)</Link>
          </Button>
        </div>
      </header>

      <div className="container space-y-16 py-8 md:space-y-20 md:py-12">
        <Hero />
        <ProblemSection />
        <SolutionSection />
        <Features />

        <section id="social-proof" className="space-y-5">
          <div className="space-y-3">
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Trusted by 1000+ founders</Badge>
            <h2 className="text-3xl font-bold text-slate-950 md:text-4xl">Founders use this before writing a single feature</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {testimonials.map((item) => (
              <Card key={item.author} className="border-slate-200 bg-white/95">
                <CardContent className="space-y-4 p-6">
                  <p className="text-sm leading-relaxed text-slate-700">“{item.quote}”</p>
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{item.author}</p>
                    <p className="text-xs text-slate-500">{item.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Pricing />
      </div>

      <footer className="border-t border-slate-200 bg-white/70">
        <div className="container flex flex-col items-start justify-between gap-4 py-8 md:flex-row md:items-center">
          <p className="text-sm text-slate-500">© {new Date().getFullYear()} ValidateMyIdea.com</p>
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
            {footerLinks.map((link) => (
              <Link key={link.label} href={link.href} className="transition hover:text-slate-950">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}
