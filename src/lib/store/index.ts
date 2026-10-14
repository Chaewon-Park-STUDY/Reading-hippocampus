import type { Store } from "../types";
import { LocalStore } from "./local";
import { SupabaseStore } from "./supabase";

let store: Store | null = null;

/** Supabase when env vars are set, otherwise browser-only demo mode. Client-side only. */
export function getStore(): Store {
  if (store) return store;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  store = url && key ? new SupabaseStore(url, key) : new LocalStore();
  return store;
}

/** Pinterest-style swatches for bubbles and people. */
export const PALETTE = [
  "#F6C9A8", "#F4A7B9", "#E8B4D8", "#C9B6E4", "#A9C8F0", "#9FC5B8",
  "#B8D8A0", "#F3E19B", "#E9C46A", "#E07A5F", "#81B29A", "#3D405B",
];
