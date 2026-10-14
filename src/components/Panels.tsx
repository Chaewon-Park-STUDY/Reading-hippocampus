"use client";

import { useEffect, useRef, useState } from "react";
import { inkFor } from "@/lib/layout";
import type { Bubble, Notification, Profile, Reply } from "@/lib/types";
import { btnCls, ColorPicker, Dot, ghostBtnCls, inputCls, Modal } from "./ui";

const ago = (iso: string) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "방금";
  if (s < 3600) return `${Math.floor(s / 60)}분 전`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
  return `${Math.floor(s / 86400)}일 전`;
};

/* ---------- 프로필 (닉네임 + 내 색) ---------- */
export function ProfileModal({ initial, onSave, onClose }: {
  initial: Profile | null;
  onSave: (nickname: string, color: string) => Promise<void>;
  onClose?: () => void;
}) {
  const [nick, setNick] = useState(initial?.nickname ?? "");
  const [color, setColor] = useState(initial?.color ?? "#A9C8F0");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!nick.trim()) return;
    setBusy(true);
    try {
      await onSave(nick, color);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title={initial ? "내 이름과 색" : "독서해마에 오신 걸 환영해요"} onClose={onClose}>
      {!initial && (
        <p className="mb-4 text-sm leading-relaxed text-[var(--muted)]">
          가입 없이 쓸 수 있어요. 다른 사람에게 보일 이름과 나만의 색을 골라 주세요.
        </p>
      )}
      <label className="mb-1 block text-xs font-medium text-[var(--muted)]">닉네임</label>
      <input className={inputCls + " mb-4"} maxLength={20} value={nick} autoFocus placeholder="예: 새벽독서가"
        onChange={(e) => setNick(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && submit()} />
      <label className="mb-2 block text-xs font-medium text-[var(--muted)]">내 색</label>
      <ColorPicker value={color} onChange={setColor} />
      <div className="mt-6 flex justify-end gap-2">
        {onClose && <button className={ghostBtnCls} onClick={onClose}>취소</button>}
        <button className={btnCls} disabled={!nick.trim() || busy} onClick={submit}>
          {initial ? "저장" : "시작하기"}
        </button>
      </div>
    </Modal>
  );
}

/* ---------- 말풍선 띄우기 ---------- */
export function BubbleComposer({ where, defaultColor, onSubmit, onClose }: {
  where: string;
  defaultColor: string;
  onSubmit: (content: string, color: string) => Promise<void>;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [color, setColor] = useState(defaultColor);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await onSubmit(text, color);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title="말풍선 띄우기" onClose={onClose}>
      <p className="mb-3 text-xs text-[var(--muted)]">📍 {where}</p>
      <div className="mb-4 rounded-[18px] p-1 transition-colors" style={{ background: color }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={1000}
          rows={4}
          autoFocus
          placeholder="읽다가 든 의문, 같이 이야기하고 싶은 것"
          className="w-full resize-none rounded-[14px] bg-transparent px-3 py-2 text-sm outline-none placeholder:opacity-60"
          style={{ color: inkFor(color) }}
          onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === "Enter" && submit()}
        />
      </div>
      <ColorPicker value={color} onChange={setColor} />
      <div className="mt-6 flex justify-end gap-2">
        <button className={ghostBtnCls} onClick={onClose}>취소</button>
        <button className={btnCls} disabled={!text.trim() || busy} onClick={submit}>띄우기</button>
      </div>
    </Modal>
  );
}

/* ---------- 말풍선 스레드 (오른쪽 패널) ---------- */
export function ThreadPanel({ bubble, where, replies, meId, onReply, onDelete, onClose }: {
  bubble: Bubble;
  where: string;
  replies: Reply[];
  meId: string;
  onReply: (content: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [replies.length]);

  const send = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      await onReply(text);
      setText("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="flex h-full w-[360px] max-w-full shrink-0 flex-col border-l max-lg:absolute max-lg:right-0 max-lg:top-0 max-lg:z-30 max-lg:shadow-[-8px_0_24px_rgba(0,0,0,0.12)] border-[var(--line)] bg-[var(--paper)]">
      <header className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3">
        <span className="truncate text-xs text-[var(--muted)]">📍 {where}</span>
        <button className={ghostBtnCls + " -mr-2 py-1"} onClick={onClose} aria-label="닫기">✕</button>
      </header>
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="rounded-[18px] px-4 py-3" style={{ background: bubble.color, color: inkFor(bubble.color) }}>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{bubble.content}</p>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] opacity-75">
            <Dot color={bubble.author?.color ?? "#ccc"} size={8} />
            {bubble.author?.nickname ?? "익명"} · {ago(bubble.created_at)}
          </div>
        </div>
        {bubble.author_id === meId && (
          <button className="mt-1 text-[11px] text-[var(--muted)] hover:text-[#B4483A]"
            onClick={() => confirm("이 말풍선과 달린 의견을 모두 지울까요?") && onDelete()}>
            말풍선 지우기
          </button>
        )}

        <div className="mt-5 space-y-3">
          {replies.length === 0 && <p className="text-center text-sm text-[var(--muted)]">첫 의견을 남겨 보세요</p>}
          {replies.map((r) => (
            <div key={r.id} className="flex gap-3">
              <span className="mt-1 h-full w-1 shrink-0 self-stretch rounded-full" style={{ background: r.author?.color ?? "#ccc" }} />
              <div className="min-w-0">
                <div className="mb-0.5 text-[11px] text-[var(--muted)]">
                  <span className="font-semibold text-[var(--ink)]">{r.author?.nickname ?? "익명"}</span> · {ago(r.created_at)}
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{r.content}</p>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </div>
      <footer className="border-t border-[var(--line)] p-4">
        <textarea
          className={inputCls + " resize-none"}
          rows={3}
          maxLength={1000}
          placeholder="의견 남기기 (Ctrl/⌘ + Enter)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === "Enter" && send()}
        />
        <button className={btnCls + " mt-2 w-full"} disabled={!text.trim() || busy} onClick={send}>보내기</button>
      </footer>
    </aside>
  );
}

/* ---------- 우체통 ---------- */
export function Mailbox({ items, onOpen, onOpenItem }: {
  items: Notification[];
  onOpen: () => void;
  onOpenItem: (n: Notification) => void;
}) {
  const [open, setOpen] = useState(false);
  const unread = items.filter((n) => !n.read_at).length;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as globalThis.Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        className="relative rounded-lg px-3 py-2 text-sm transition-colors hover:bg-black/5"
        onClick={() => {
          setOpen((v) => !v);
          if (!open && unread) onOpen();
        }}
      >
        📮 우체통
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#E07A5F] px-1 text-[11px] font-semibold text-white tabular-nums">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-40 w-[340px] overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--paper)] shadow-[0_16px_40px_rgba(0,0,0,0.14)]">
          <div className="border-b border-[var(--line)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
            내 말풍선에 날아온 답장
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {items.length === 0 && <p className="px-4 py-8 text-center text-sm text-[var(--muted)]">아직 도착한 편지가 없어요</p>}
            {items.map((n) => (
              <button key={n.id} onClick={() => { setOpen(false); onOpenItem(n); }}
                className="flex w-full gap-3 border-b border-[var(--line)] px-4 py-3 text-left last:border-0 hover:bg-black/[0.03]">
                <Dot color={n.reply?.author?.color ?? "#ccc"} size={12} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px]">
                    <b>{n.reply?.author?.nickname ?? "익명"}</b>
                    <span className="text-[var(--muted)]"> · {ago(n.created_at)}</span>
                    {!n.read_at && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#E07A5F] align-middle" />}
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-[13px]">{n.reply?.content}</span>
                  <span className="mt-1 block truncate text-[11px] text-[var(--muted)]">↳ {n.bubble?.content}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
