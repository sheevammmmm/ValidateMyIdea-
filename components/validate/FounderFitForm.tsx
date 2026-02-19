"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, Rocket } from "lucide-react";
import { useForm } from "react-hook-form";
import { runValidationAction } from "@/app/actions/runValidation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  founderFitSchema,
  YEARS_EXPERIENCE_OPTIONS,
  BUDGET_OPTIONS,
  TIME_COMMITMENT_OPTIONS,
  type FounderFitValues
} from "@/lib/validations/founderFitSchema";

type FounderFitFormProps = {
  validationId: string;
};

export function FounderFitForm({ validationId }: FounderFitFormProps) {
  const router = useRouter();
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [isSubmitting, startSubmitting] = useTransition();

  const form = useForm<FounderFitValues>({
    resolver: zodResolver(founderFitSchema),
    mode: "onChange",
    defaultValues: {
      validationId,
      domainExpertise: "",
      yearsExperience: undefined,
      keySkills: "",
      budget: undefined,
      timeCommitment: undefined
    }
  });

  function applyFieldErrors(fieldErrors?: Record<string, string[]>) {
    if (!fieldErrors) return;

    const keys: Array<keyof FounderFitValues> = [
      "validationId",
      "domainExpertise",
      "yearsExperience",
      "keySkills",
      "budget",
      "timeCommitment"
    ];

    for (const key of keys) {
      const first = fieldErrors[key]?.[0];
      if (first) {
        form.setError(key, { message: first, type: "server" });
      }
    }
  }

  function onSubmit(values: FounderFitValues) {
    setSubmitMessage(null);

    startSubmitting(async () => {
      const result = await runValidationAction(values);

      if (!result.ok) {
        applyFieldErrors(result.fieldErrors);
        setSubmitMessage(result.message);
        return;
      }

      router.push(`/validate/report/${result.validationId}`);
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-indigo-100 bg-white/80 p-4 shadow-sm backdrop-blur-sm md:p-5">
        <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
          <span className="font-semibold text-slate-900">Step 2 of 3</span>
          <span>Founder Fit</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-indigo-100">
          <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500" />
        </div>
      </div>

      <Card className="border-slate-200 bg-white/90 shadow-xl shadow-indigo-100/60">
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl">Founder fit profile</CardTitle>
          <p className="text-sm text-slate-600">This helps score execution readiness and generate realistic next steps.</p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name="domainExpertise"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Domain Expertise</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Comma-separated (e.g. fintech, payments, SMB ops)" />
                    </FormControl>
                    <FormDescription>Add the domains you deeply understand.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-5 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="yearsExperience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Years Experience</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select experience" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {YEARS_EXPERIENCE_OPTIONS.map((value) => (
                            <SelectItem key={value} value={value}>
                              {value} years
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
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budget</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select budget" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {BUDGET_OPTIONS.map((value) => (
                            <SelectItem key={value} value={value}>
                              {value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="keySkills"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Key Skills</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Comma-separated (e.g. growth, product design, enterprise sales)" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="timeCommitment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weekly Time Commitment</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select commitment" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TIME_COMMITMENT_OPTIONS.map((value) => (
                          <SelectItem key={value} value={value}>
                            {value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {submitMessage ? <p className="text-sm text-red-600">{submitMessage}</p> : null}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button asChild variant="outline" type="button" className="w-full sm:w-auto">
                  <Link href={`/validate?validationId=${validationId}`}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Link>
                </Button>
                <Button
                  type="submit"
                  className="w-full bg-[#6366f1] hover:bg-[#4f46e5] sm:w-auto"
                  disabled={!form.formState.isValid || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Running validation...
                    </>
                  ) : (
                    <>
                      <Rocket className="mr-2 h-4 w-4" /> Generate verdict report
                    </>
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
