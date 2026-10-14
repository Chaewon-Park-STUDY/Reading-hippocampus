"use client";

import dynamic from "next/dynamic";

// The app talks to the browser (localStorage, Supabase session), so it renders client-only.
const App = dynamic(() => import("@/components/App"), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh items-center justify-center text-sm text-[var(--muted)]">서가를 펼치는 중…</div>
  ),
});

export default function Page() {
  return <App />;
}
