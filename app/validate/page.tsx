import { IdeaInputForm } from "@/components/validate/IdeaInputForm";

export default function ValidatePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50/70 via-white to-emerald-50/50 py-8 md:py-12">
      <div className="container max-w-4xl">
        <IdeaInputForm />
      </div>
    </main>
  );
}
