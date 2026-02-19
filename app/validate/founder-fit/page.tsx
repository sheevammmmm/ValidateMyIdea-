import Link from "next/link";
import { FounderFitForm } from "@/components/validate/FounderFitForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type FounderFitPageProps = {
  searchParams?: {
    validationId?: string;
  };
};

export default function FounderFitPage({ searchParams }: FounderFitPageProps) {
  const validationId = searchParams?.validationId;

  if (!validationId) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-indigo-50/70 via-white to-emerald-50/50 py-8 md:py-12">
        <div className="container max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle>Missing validation draft</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">We could not find a validation ID. Please save your idea first.</p>
              <Button asChild>
                <Link href="/validate">Go to idea input</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50/70 via-white to-emerald-50/50 py-8 md:py-12">
      <div className="container max-w-4xl">
        <FounderFitForm validationId={validationId} />
      </div>
    </main>
  );
}
