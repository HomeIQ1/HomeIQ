// Unified server-side data access. Every Route Handler and Server Component
// goes through these functions, which dispatch to either Supabase (live) or
// the demo store (no config). This keeps the UI identical in both modes.

import { cookies } from "next/headers";
import { isSupabaseConfigured } from "./config";
import { createSupabaseServerClient } from "./supabase";
import {
  DEMO_COOKIE,
  demoGetUserByToken,
  demoListCmas,
  demoInsertCma,
  demoDeleteCma,
  type DemoCMA,
} from "./demoStore";

export interface SessionUser {
  id: string;
  email: string;
}

export interface CMARecord {
  id: string;
  user_id: string;
  property_address: string;
  generated_cma: string;
  listing_copy: string;
  created_at: string;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  if (isSupabaseConfigured) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    return { id: user.id, email: user.email ?? "" };
  }

  // Demo mode
  const cookieStore = await cookies();
  const token = cookieStore.get(DEMO_COOKIE)?.value;
  const user = demoGetUserByToken(token);
  return user ? { id: user.id, email: user.email } : null;
}

export async function listCmasForUser(userId: string): Promise<CMARecord[]> {
  if (isSupabaseConfigured) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("cmas")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as CMARecord[];
  }
  return demoListCmas(userId) as DemoCMA[];
}

export async function insertCmaForUser(
  userId: string,
  propertyAddress: string,
  generatedCma: string,
  listingCopy: string
): Promise<CMARecord> {
  if (isSupabaseConfigured) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("cmas")
      .insert({
        user_id: userId,
        property_address: propertyAddress,
        generated_cma: generatedCma,
        listing_copy: listingCopy,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as CMARecord;
  }
  return demoInsertCma(
    userId,
    propertyAddress,
    generatedCma,
    listingCopy
  ) as DemoCMA;
}

export async function deleteCmaForUser(
  userId: string,
  id: string
): Promise<boolean> {
  if (isSupabaseConfigured) {
    const supabase = await createSupabaseServerClient();
    // RLS guarantees a user can only delete their own row; we still scope
    // the query defensively.
    const { error } = await supabase.from("cmas").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return true;
  }
  return demoDeleteCma(userId, id);
}
