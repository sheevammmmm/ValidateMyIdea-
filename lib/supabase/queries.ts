import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import type { Database, TableInsert, TableRow, TableUpdate } from "@/lib/supabase/database.types";

export type DbClient = SupabaseClient<Database>;

type QueryResult<T> = {
  data: T | null;
  error: PostgrestError | null;
};

type QueryListResult<T> = {
  data: T[] | null;
  error: PostgrestError | null;
};

export async function getUserById(client: DbClient, userId: string): Promise<QueryResult<TableRow<"users">>> {
  return client.from("users").select("*").eq("id", userId).maybeSingle();
}

export async function upsertUserProfile(
  client: DbClient,
  user: TableInsert<"users">
): Promise<QueryResult<TableRow<"users">>> {
  return client.from("users").upsert(user, { onConflict: "id" }).select("*").single();
}

export async function updateUserTier(
  client: DbClient,
  userId: string,
  tier: TableRow<"users">["tier"]
): Promise<QueryResult<TableRow<"users">>> {
  return client.from("users").update({ tier }).eq("id", userId).select("*").single();
}

export async function incrementMonthlyValidationUsage(
  client: DbClient,
  userId: string,
  by = 1
): Promise<QueryResult<TableRow<"users">>> {
  const current = await client
    .from("users")
    .select("validations_used_this_month")
    .eq("id", userId)
    .single();

  if (current.error || !current.data) {
    return {
      data: null,
      error: current.error
    };
  }

  const nextCount = current.data.validations_used_this_month + by;
  return client
    .from("users")
    .update({ validations_used_this_month: nextCount })
    .eq("id", userId)
    .select("*")
    .single();
}

export async function createValidation(
  client: DbClient,
  validation: TableInsert<"validations">
): Promise<QueryResult<TableRow<"validations">>> {
  return client.from("validations").insert(validation).select("*").single();
}

export async function updateValidation(
  client: DbClient,
  validationId: string,
  updates: TableUpdate<"validations">
): Promise<QueryResult<TableRow<"validations">>> {
  return client.from("validations").update(updates).eq("id", validationId).select("*").single();
}

export async function getValidationById(
  client: DbClient,
  validationId: string
): Promise<QueryResult<TableRow<"validations">>> {
  return client.from("validations").select("*").eq("id", validationId).maybeSingle();
}

export async function listValidationsByUser(
  client: DbClient,
  userId: string,
  limit = 20
): Promise<QueryListResult<TableRow<"validations">>> {
  return client
    .from("validations")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
}

export async function insertSignals(
  client: DbClient,
  signalRows: TableInsert<"signals">[]
): Promise<QueryListResult<TableRow<"signals">>> {
  return client.from("signals").insert(signalRows).select("*");
}

export async function listSignalsForValidation(
  client: DbClient,
  validationId: string
): Promise<QueryListResult<TableRow<"signals">>> {
  return client
    .from("signals")
    .select("*")
    .eq("validation_id", validationId)
    .order("created_at", { ascending: true });
}

export async function getValidationWithSignals(client: DbClient, validationId: string) {
  return client
    .from("validations")
    .select(
      `
      *,
      signals (*)
    `
    )
    .eq("id", validationId)
    .maybeSingle();
}

export async function upsertFounderProfile(
  client: DbClient,
  profile: TableInsert<"founder_profiles">
): Promise<QueryResult<TableRow<"founder_profiles">>> {
  return client.from("founder_profiles").upsert(profile, { onConflict: "user_id" }).select("*").single();
}

export async function getFounderProfileByUser(
  client: DbClient,
  userId: string
): Promise<QueryResult<TableRow<"founder_profiles">>> {
  return client.from("founder_profiles").select("*").eq("user_id", userId).maybeSingle();
}
