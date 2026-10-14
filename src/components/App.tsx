"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { getStore } from "@/lib/store";
import type { Book, Bubble, ChangeTopic, Notification, Profile, Reply, TocNode } from "@/lib/types";
import { MindMap } from "./MindMap";
import { BubbleComposer, Mailbox, ProfileModal, ThreadPanel } from "./Panels";
import { Sidebar } from "./Sidebar";
import { Dot, ghostBtnCls } from "./ui";

export default function App() {
  const store = useMemo(() => getStore(), []);

  const [boot, setBoot] = useState<"loading" | "ready" | "error">("loading");
  const [bootError, setBootError] = useState("");
  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);

  const [books, setBooks] = useState<Book[]>([]);
  const [bookId, setBookId] = useState<string | null>(null);
  const [tocAll, setToc] = useState<TocNode[]>([]);
  const [bubblesAll, setBubbles] = useState<Bubble[]>([]);
  const [bubbleId, setBubbleId] = useState<string | null>(null);
  const [repliesAll, setReplies] = useState<Reply[]>([]);
  const [notes, setNotes] = useState<Notification[]>([]);

  const [focus, setFocus] = useState<{ id: string; n: number } | null>(null);
  const [composer, setComposer] = useState<{ tocId: string | null } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // Sidebar starts open on wide screens, folded on tablets in portrait / phones.
  const [showSidebar, setShowSidebar] = useState(() => window.innerWidth >= 1024);

  const cur = useRef({ bookId, bubbleId });
  useEffect(() => {
    cur.current = { bookId, bubbleId };
  }, [bookId, bubbleId]);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };
  const guard = useCallback(async <T,>(p: Promise<T>) => {
    try {
      return await p;
    } catch (e) {
      flash((e as Error).message);
      throw e;
    }
  }, []);

  /* ---------- loaders ---------- */
  const loadBooks = useCallback(async () => setBooks(await store.listBooks()), [store]);
  const loadBook = useCallback(async (id: string) => {
    const [t, b] = await Promise.all([store.listToc(id), store.listBubbles(id)]);
    if (cur.current.bookId !== id) return;
    setToc(t);
    setBubbles(b);
  }, [store]);
  const loadReplies = useCallback(async (id: string) => {
    const r = await store.listReplies(id);
    if (cur.current.bubbleId === id) setReplies(r);
  }, [store]);
  const loadNotes = useCallback(async () => setNotes(await store.listNotifications()), [store]);

  /* ---------- boot ---------- */
  useEffect(() => {
    let off = () => {};
    (async () => {
      try {
        const { userId, profile } = await store.init();
        setUserId(userId);
        setProfile(profile);
        const list = await store.listBooks();
        setBooks(list);
        const params = new URLSearchParams(location.search);
        const qb = params.get("book");
        const start = list.find((b) => b.id === qb)?.id ?? list[0]?.id ?? null;
        setBookId(start);
        if (start && qb === start) setBubbleId(params.get("bubble"));
        await loadNotes();
        off = store.subscribe((t: ChangeTopic) => {
          const { bookId, bubbleId } = cur.current;
          if (t === "books") loadBooks();
          if ((t === "toc" || t === "bubbles" || t === "replies") && bookId) loadBook(bookId);
          if (t === "replies" && bubbleId) loadReplies(bubbleId);
          if (t === "notifications" || t === "replies") loadNotes();
        });
        setBoot("ready");
      } catch (e) {
        setBootError((e as Error).message);
        setBoot("error");
      }
    })();
    return () => off();
  }, [store, loadBooks, loadBook, loadReplies, loadNotes]);

  useEffect(() => {
    if (bookId) loadBook(bookId);
  }, [bookId, loadBook]);

  useEffect(() => {
    if (bubbleId) loadReplies(bubbleId);
  }, [bubbleId, loadReplies]);

  // Shareable URL: ?book=…&bubble=…
  useEffect(() => {
    if (boot !== "ready") return;
    const u = new URL(location.href);
    u.search = "";
    if (bookId) u.searchParams.set("book", bookId);
    if (bookId && bubbleId) u.searchParams.set("bubble", bubbleId);
    history.replaceState(null, "", u);
  }, [boot, bookId, bubbleId]);

  /* ---------- derived ---------- */
  const book = books.find((b) => b.id === bookId) ?? null;
  // Drop rows that belong to a previously selected book/bubble until the new ones load.
  const toc = tocAll.filter((t) => t.book_id === bookId);
  const bubbles = bubblesAll.filter((b) => b.book_id === bookId);
  const replies = repliesAll.filter((r) => r.bubble_id === bubbleId);
  const bubble = bubbles.find((b) => b.id === bubbleId) ?? null;
  const bubbleCount = useMemo(() => {
    const m: Record<string, number> = {};
    for (const b of bubbles) {
      const k = b.toc_node_id ?? "__book__";
      m[k] = (m[k] ?? 0) + 1;
    }
    return m;
  }, [bubbles]);
  const whereOf = (tocId: string | null) => {
    if (!book) return "";
    const path: string[] = [];
    let n = toc.find((t) => t.id === tocId);
    while (n) {
      path.unshift(n.title);
      n = toc.find((t) => t.id === n!.parent_id);
    }
    return [book.title, ...path].join(" › ");
  };

  /* ---------- actions ---------- */
  const selectBook = (id: string) => {
    if (id === bookId) return;
    setBubbleId(null);
    setBookId(id);
  };
  const focusOn = (id: string) => setFocus({ id, n: Date.now() });

  const openNotification = async (n: Notification) => {
    if (!n.bubble) return;
    if (n.bubble.book_id !== bookId) setBookId(n.bubble.book_id);
    setBubbleId(n.bubble_id);
    setTimeout(() => focusOn(n.bubble_id), 400);
  };

  /* ---------- render ---------- */
  if (boot === "loading") {
    return <div className="flex h-dvh items-center justify-center text-sm text-[var(--muted)]">서가를 펼치는 중…</div>;
  }
  if (boot === "error") {
    return (
      <div className="flex h-dvh items-center justify-center p-6">
        <div className="max-w-md rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-6 text-sm">
          <p className="mb-2 font-semibold">연결하지 못했어요</p>
          <p className="text-[var(--muted)]">{bootError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--line)] bg-[var(--paper)] px-5">
        <div className="flex items-center gap-3">
          <button className={ghostBtnCls + " touch-big -ml-2 px-2"} onClick={() => setShowSidebar((v) => !v)}
            aria-label={showSidebar ? "서가 접기" : "서가 펼치기"} title={showSidebar ? "서가 접기" : "서가 펼치기"}>
            ☰
          </button>
          <span className="font-serif text-lg font-bold tracking-tight">독서해마</span>
          {store.mode === "local" && (
            <span className="rounded-full bg-[#F3E19B] px-2 py-0.5 text-[11px] font-medium text-[#5B4A12]"
              title="Supabase 환경변수가 없어 이 브라우저에만 저장돼요">
              데모 모드
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {book && (
            <button className={ghostBtnCls}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(location.href);
                  flash("링크를 복사했어요. 뿌려 보세요!");
                } catch {
                  flash(location.href);
                }
              }}>
              🔗 링크 복사
            </button>
          )}
          <Mailbox items={notes} onOpen={() => store.markAllRead().then(loadNotes)} onOpenItem={openNotification} />
          {profile && (
            <button className={ghostBtnCls + " flex items-center gap-2 text-[var(--ink)]"} onClick={() => setEditingProfile(true)}>
              <Dot color={profile.color} size={12} />
              {profile.nickname}
            </button>
          )}
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {showSidebar && <Sidebar
          books={books}
          selectedBookId={bookId}
          toc={toc}
          bubbleCount={bubbleCount}
          onSelectBook={selectBook}
          onAddBook={async (t, a) => {
            const b = await store.addBook(t, a);
            await loadBooks();
            selectBook(b.id);
          }}
          meId={userId}
          onUpdateBook={async (id, t, a) => {
            await store.updateBook(id, t, a);
            await loadBooks();
          }}
          onAddToc={async (parent, title) => {
            if (!bookId) return;
            await guard(store.addToc(bookId, parent, title));
            await loadBook(bookId);
          }}
          onFocus={(id) => {
            // On tablets the sidebar overlays the map: fold it so the focused node is visible.
            if (window.innerWidth < 1024) setShowSidebar(false);
            focusOn(id);
          }}
          onNewBubble={(tocId) => setComposer({ tocId })}
        />}

        <main className="relative min-w-0 flex-1 bg-[var(--canvas)]">
          {book ? (
            <ReactFlowProvider>
              <MindMap
                book={book}
                toc={toc}
                bubbles={bubbles}
                focus={focus}
                selectedBubbleId={bubbleId}
                onOpenBubble={setBubbleId}
                onNewBubble={(tocId) => setComposer({ tocId })}
              />
            </ReactFlowProvider>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">
              왼쪽에서 책을 고르거나 새 책을 추가해 보세요
            </div>
          )}
          {book && toc.length === 0 && (
            <div className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 rounded-full bg-[var(--paper)] px-4 py-2 text-xs text-[var(--muted)] shadow-sm">
              왼쪽 책 아래에서 목차(부 · 장)를 채워 보세요. 누구나 함께 채울 수 있어요.
            </div>
          )}
        </main>

        {bubble && (
          <ThreadPanel
            bubble={bubble}
            where={whereOf(bubble.toc_node_id)}
            replies={replies}
            meId={userId}
            onReply={async (c) => {
              await guard(store.addReply(bubble.id, c));
              await Promise.all([loadReplies(bubble.id), bookId && loadBook(bookId)]);
            }}
            onDelete={async () => {
              await guard(store.deleteBubble(bubble.id));
              setBubbleId(null);
              if (bookId) await loadBook(bookId);
            }}
            onClose={() => setBubbleId(null)}
          />
        )}
      </div>

      {composer && book && (
        <BubbleComposer
          where={whereOf(composer.tocId)}
          defaultColor={profile?.color ?? "#F6C9A8"}
          onClose={() => setComposer(null)}
          onSubmit={async (content, color) => {
            const b = await guard(store.addBubble(book.id, composer.tocId, content, color));
            setComposer(null);
            await loadBook(book.id);
            setBubbleId(b.id);
            setTimeout(() => focusOn(b.id), 150);
          }}
        />
      )}

      {(!profile || editingProfile) && (
        <ProfileModal
          initial={profile}
          onClose={profile ? () => setEditingProfile(false) : undefined}
          onSave={async (nick, color) => {
            setProfile(await guard(store.saveProfile(nick, color)));
            setEditingProfile(false);
            if (bookId) loadBook(bookId);
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-[var(--ink)] px-4 py-2 text-sm text-[var(--paper)] shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
