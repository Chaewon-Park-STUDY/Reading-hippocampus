"use client";

import { useEffect, type ReactNode } from "react";
import { PALETTE } from "@/lib/store";

export function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {PALETTE.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`색 ${c}`}
          onClick={() => onChange(c)}
          className="h-8 w-8 rounded-full border border-black/10 transition-transform hover:scale-110"
          style={{
            background: c,
            outline: value.toLowerCase() === c.toLowerCase() ? "2px solid var(--ink)" : "none",
            outlineOffset: 2,
          }}
        />
      ))}
      <label
        className="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-dashed border-black/30 text-xs text-[var(--muted)]"
        title="직접 고르기"
      >
        +
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
    </div>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose?: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!onClose) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(42,38,34,0.35)] p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="w-full max-w-md rounded-2xl bg-[var(--paper)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
        <h2 className="font-serif mb-4 text-lg font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function Dot({ color, size = 10 }: { color: string; size?: number }) {
  return (
    <span
      className="inline-block shrink-0 rounded-full border border-black/10"
      style={{ background: color, width: size, height: size }}
    />
  );
}

export const inputCls =
  "w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--ink)]";
export const btnCls =
  "rounded-lg bg-[var(--ink)] px-4 py-2 text-sm font-medium text-[var(--paper)] transition-opacity hover:opacity-85 disabled:opacity-40";
export const ghostBtnCls =
  "rounded-lg px-3 py-2 text-sm text-[var(--muted)] transition-colors hover:bg-black/5 hover:text-[var(--ink)]";
