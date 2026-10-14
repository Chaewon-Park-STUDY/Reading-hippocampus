"use client";

import { useState } from "react";
import type { Book, TocNode } from "@/lib/types";
import { btnCls, ghostBtnCls, inputCls } from "./ui";

type Props = {
  books: Book[];
  selectedBookId: string | null;
  toc: TocNode[];
  bubbleCount: Record<string, number>;
  onSelectBook: (id: string) => void;
  onAddBook: (title: string, author: string | null) => Promise<void>;
  onAddToc: (parentId: string | null, title: string) => Promise<void>;
  onFocus: (nodeId: string) => void;
  onNewBubble: (tocId: string | null) => void;
};

export function Sidebar(p: Props) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [query, setQuery] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const shown = p.books.filter((b) =>
    `${b.title} ${b.author ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const submitBook = async () => {
    if (!title.trim()) return;
    setErr(null);
    try {
      await p.onAddBook(title, author || null);
      setTitle("");
      setAuthor("");
      setAdding(false);
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <aside className="flex h-full w-[300px] shrink-0 flex-col border-r border-[var(--line)] bg-[var(--paper)]">
      <div className="border-b border-[var(--line)] px-5 pb-4 pt-5">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">서가</h2>
          <button className={ghostBtnCls + " -mr-2 py-1"} onClick={() => setAdding((v) => !v)}>
            {adding ? "취소" : "+ 책 추가"}
          </button>
        </div>
        {adding ? (
          <div className="space-y-2">
            <input className={inputCls} placeholder="책 제목" value={title} autoFocus
              onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && submitBook()} />
            <input className={inputCls} placeholder="저자 (선택)" value={author}
              onChange={(e) => setAuthor(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && submitBook()} />
            {err && <p className="text-xs text-[#B4483A]">{err}</p>}
            <button className={btnCls + " w-full"} disabled={!title.trim()} onClick={submitBook}>서가에 꽂기</button>
          </div>
        ) : (
          <input className={inputCls} placeholder="책 검색" value={query} onChange={(e) => setQuery(e.target.value)} />
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {shown.length === 0 && (
          <p className="px-2 py-6 text-center text-sm text-[var(--muted)]">
            {p.books.length ? "검색 결과가 없어요" : "아직 꽂힌 책이 없어요. 첫 책을 추가해 보세요."}
          </p>
        )}
        {shown.map((b) => {
          const open = b.id === p.selectedBookId;
          return (
            <div key={b.id} className="mb-1">
              <button
                onClick={() => p.onSelectBook(b.id)}
                className={`flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left transition-colors ${
                  open ? "bg-black/[0.05]" : "hover:bg-black/[0.03]"
                }`}
              >
                <span className={`mt-1 text-[10px] text-[var(--muted)] transition-transform ${open ? "rotate-90" : ""}`}>▶</span>
                <span className="min-w-0">
                  <span className="font-serif block truncate text-[15px] font-semibold leading-snug">{b.title}</span>
                  {b.author && <span className="block truncate text-xs text-[var(--muted)]">{b.author}</span>}
                </span>
              </button>
              {open && <TocTree {...p} />}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

function TocTree(p: Props) {
  const roots = p.toc.filter((n) => n.parent_id === null);
  return (
    <div className="ml-4 border-l border-[var(--line)] py-1 pl-2">
      <TocRow label="책 전체" muted count={p.bubbleCount["__book__"] ?? 0}
        onClick={() => p.selectedBookId && p.onFocus(p.selectedBookId)} onBubble={() => p.onNewBubble(null)} />
      {roots.map((n) => (
        <TocBranch key={n.id} node={n} depth={0} {...p} />
      ))}
      <AddInline placeholder="부 · 카테고리 추가" onAdd={(t) => p.onAddToc(null, t)} />
    </div>
  );
}

function TocBranch({ node, depth, ...p }: Props & { node: TocNode; depth: number }) {
  const kids = p.toc.filter((n) => n.parent_id === node.id);
  return (
    <div>
      <TocRow label={node.title} count={p.bubbleCount[node.id] ?? 0} strong={depth === 0}
        onClick={() => p.onFocus(node.id)} onBubble={() => p.onNewBubble(node.id)} />
      {(kids.length > 0 || depth === 0) && (
        <div className="ml-3 border-l border-[var(--line)] pl-2">
          {kids.map((k) => (
            <TocBranch key={k.id} node={k} depth={depth + 1} {...p} />
          ))}
          {depth === 0 && <AddInline placeholder="장 추가" onAdd={(t) => p.onAddToc(node.id, t)} />}
        </div>
      )}
    </div>
  );
}

function TocRow(props: { label: string; count: number; strong?: boolean; muted?: boolean; onClick: () => void; onBubble: () => void }) {
  return (
    <div className="group flex items-center gap-1 rounded-md pr-1 hover:bg-black/[0.03]">
      <button onClick={props.onClick}
        className={`min-w-0 flex-1 truncate px-2 py-1.5 text-left text-[13px] ${props.strong ? "font-semibold" : ""} ${props.muted ? "text-[var(--muted)]" : ""}`}>
        {props.label}
      </button>
      {props.count > 0 && (
        <span className="rounded-full bg-black/[0.06] px-1.5 text-[10px] tabular-nums text-[var(--muted)]">{props.count}</span>
      )}
      <button onClick={props.onBubble} title="말풍선 띄우기"
        className="rounded px-1.5 text-sm text-[var(--muted)] opacity-0 transition-opacity hover:text-[var(--ink)] group-hover:opacity-100 focus:opacity-100">
        💬
      </button>
    </div>
  );
}

function AddInline({ placeholder, onAdd }: { placeholder: string; onAdd: (t: string) => Promise<void> }) {
  const [v, setV] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!v.trim() || busy) return;
    setBusy(true);
    try {
      await onAdd(v);
      setV("");
    } finally {
      setBusy(false);
    }
  };
  return (
    <input
      value={v}
      onChange={(e) => setV(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && submit()}
      placeholder={`+ ${placeholder}`}
      className="my-0.5 w-full rounded-md bg-transparent px-2 py-1.5 text-[13px] outline-none placeholder:text-[var(--muted)]/70 focus:bg-white"
    />
  );
}
