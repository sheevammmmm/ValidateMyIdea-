"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CheckCircle2, CircleAlert, Lightbulb, Loader2 } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { saveIdeaAction } from "@/app/actions/saveIdea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { INDUSTRY_OPTIONS, STAGE_OPTIONS, ideaSchema, type IdeaFormValues } from "@/lib/validations/ideaSchema";

type SaveBanner = {
  tone: "neutral" | "success" | "error";
  text: string;
};

const EXAMPLE_IDEAS = [
  {
    title: "AI Sales Coach",
    body: "A browser extension that reviews sales calls and gives reps personalized coaching with objection-handling scripts for SMB SaaS teams."
  },
  {
    title: "Creator Finance Dashboard",
    body: "A finance tracker for YouTubers and newsletter creators that combines Stripe, Gumroad, and ad revenue to forecast monthly cash flow."
  },
  {
    title: "Clinic Waitlist Optimizer",
    body: "A lightweight scheduling layer for independent clinics that predicts no-shows and fills cancellations automatically via WhatsApp reminders."
  }
];

const MIN_IDEA_CHARS = 250;
const MAX_IDEA_CHARS = 1000;

function getSaveBanner(status: "idle" | "saving" | "saved" | "error", message: string): SaveBanner {
  if (status === "saving") {
    return { tone: "neutral", text: "Saving draft..." };
  }

  if (status === "saved") {
    return { tone: "success", text: message || "Draft saved." };
  }

  if (status === "error") {
    return { tone: "error", text: message || "Could not save draft." };
  }

  return { tone: "neutral", text: "Changes are saved automatically every 3 seconds." };
}

export function IdeaInputForm() {
  const router = useRouter();
  const [draftId, setDraftId] = useState<string | undefined>(undefined);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [isSavingTransition, startSavingTransition] = useTransition();
  const [isSubmitting, startSubmittingTransition] = useTransition();
  const saveRequestSeq = useRef(0);

  const form = useForm<IdeaFormValues>({
    resolver: zodResolver(ideaSchema),
    mode: "onChange",
    defaultValues: {
      ideaText: "",
      industry: undefined,
      targetCustomer: "",
      stage: "pre-idea"
    }
  });

  const formValues = useWatch({ control: form.control });
  const ideaText = useWatch({ control: form.control, name: "ideaText" }) ?? "";
  const ideaLength = ideaText.length;
  const remainingForMinimum = Math.max(0, MIN_IDEA_CHARS - ideaLength);

  const saveBanner = getSaveBanner(saveStatus, saveMessage);

  function applyFieldErrors(fieldErrors?: Record<string, string[]>) {
    if (!fieldErrors) return;

    const allowedFields: Array<keyof IdeaFormValues> = ["ideaText", "industry", "targetCustomer", "stage"];
    for (const fieldName of allowedFields) {
      const messages = fieldErrors[fieldName as string];
      if (messages?.[0]) {
        form.setError(fieldName, { type: "server", message: messages[0] });
      }
    }
  }

  useEffect(() => {
    if (!form.formState.isDirty) {
      return;
    }

    if (!form.formState.isValid) {
      setSaveStatus("idle");
      return;
    }

    setSaveStatus("saving");

    const timeoutId = setTimeout(() => {
      const currentSeq = ++saveRequestSeq.current;
      const payload = {
        ...form.getValues(),
        validationId: draftId,
        mode: "autosave" as const
      };

      startSavingTransition(async () => {
        const result = await saveIdeaAction(payload);

        if (currentSeq !== saveRequestSeq.current) {
          return;
        }

        if (!result.ok) {
          applyFieldErrors(result.fieldErrors);
          setSaveStatus("error");
          setSaveMessage(result.message);
          return;
        }

        setDraftId(result.validationId);
        setSaveStatus("saved");
        setSaveMessage(result.savedAt ? `Saved at ${new Date(result.savedAt).toLocaleTimeString()}` : "Draft saved.");
      });
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, [
    form,
    formValues.ideaText,
    formValues.industry,
    formValues.stage,
    formValues.targetCustomer,
    draftId,
    form.formState.isDirty,
    form.formState.isValid,
    startSavingTransition
  ]);

  function handleContinue(values: IdeaFormValues) {
    startSubmittingTransition(async () => {
      setSaveStatus("saving");

      const result = await saveIdeaAction({
        ...values,
        validationId: draftId,
        mode: "continue"
      });

      if (!result.ok) {
        applyFieldErrors(result.fieldErrors);
        setSaveStatus("error");
        setSaveMessage(result.message);
        return;
      }

      const validationId = result.validationId;
      setDraftId(validationId);
      setSaveStatus("saved");
      setSaveMessage(result.message);
      router.push(validationId ? `/validate/founder-fit?validationId=${validationId}` : "/validate/founder-fit");
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-indigo-100 bg-white/80 p-4 shadow-sm backdrop-blur-sm md:p-5">
        <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
          <span className="font-semibold text-slate-900">Step 1 of 3</span>
          <span>Idea Input</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-indigo-100">
          <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500" />
        </div>
      </div>

      <Card className="border-slate-200 bg-white/90 shadow-xl shadow-indigo-100/60">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button asChild variant="ghost" className="gap-2 px-0 text-slate-600 hover:bg-transparent hover:text-slate-950">
              <Link href="/">
                <ArrowLeft className="h-4 w-4" /> Back
              </Link>
            </Button>

            <Dialog>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" className="gap-2 border-indigo-200 text-indigo-700">
                  <Lightbulb className="h-4 w-4" /> Example ideas
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Great input examples</DialogTitle>
                  <DialogDescription>Use these as inspiration for clear, specific submissions.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  {EXAMPLE_IDEAS.map((example) => (
                    <div key={example.title} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="font-semibold text-slate-900">{example.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{example.body}</p>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div>
            <CardTitle className="text-2xl md:text-3xl">Describe your startup idea</CardTitle>
            <p className="mt-2 text-sm text-slate-600">
              Give enough detail so we can evaluate market demand, competition pressure, and founder-market fit.
            </p>
          </div>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form className="space-y-6" onSubmit={form.handleSubmit(handleContinue)}>
              <FormField
                control={form.control}
                name="ideaText"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between gap-3">
                      <FormLabel>Idea Description</FormLabel>
                      <span className={`text-xs ${ideaLength > MAX_IDEA_CHARS ? "text-red-600" : "text-slate-500"}`}>
                        {ideaLength}/{MAX_IDEA_CHARS}
                      </span>
                    </div>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={7}
                        placeholder="Describe your startup idea in 2-3 sentences. Be specific about the problem you're solving and who it's for."
                      />
                    </FormControl>
                    <FormDescription>
                      {remainingForMinimum > 0
                        ? `Add ${remainingForMinimum} more characters to reach the minimum requirement.`
                        : "Great detail. You can continue when all fields are valid."}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-5 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="industry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select industry" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {INDUSTRY_OPTIONS.map((industry) => (
                            <SelectItem key={industry} value={industry}>
                              {industry}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="targetCustomer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Customer (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Example: Solo founders running B2B SaaS businesses" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="stage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stage</FormLabel>
                    <FormControl>
                      <RadioGroup className="space-y-2" onValueChange={field.onChange} value={field.value}>
                        {STAGE_OPTIONS.map((option) => {
                          const id = `stage-${option.value}`;

                          return (
                            <div key={option.value} className="flex items-center space-x-3 rounded-md border border-slate-200 p-3">
                              <RadioGroupItem id={id} value={option.value} />
                              <Label htmlFor={id} className="cursor-pointer font-normal text-slate-700">
                                {option.label}
                              </Label>
                            </div>
                          );
                        })}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                  saveBanner.tone === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : saveBanner.tone === "error"
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-slate-200 bg-slate-50 text-slate-600"
                }`}
              >
                {saveStatus === "saving" || isSavingTransition ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : saveBanner.tone === "success" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : saveBanner.tone === "error" ? (
                  <CircleAlert className="h-4 w-4" />
                ) : (
                  <Lightbulb className="h-4 w-4" />
                )}
                <span>{saveBanner.text}</span>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button asChild type="button" variant="outline" className="w-full sm:w-auto">
                  <Link href="/">Back</Link>
                </Button>
                <Button
                  type="submit"
                  className="w-full bg-[#6366f1] hover:bg-[#4f46e5] sm:w-auto"
                  disabled={!form.formState.isValid || isSubmitting || saveStatus === "saving"}
                >
                  {isSubmitting ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                    </span>
                  ) : (
                    "Continue"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
