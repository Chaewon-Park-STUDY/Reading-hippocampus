import type { Book, Bubble, ChangeTopic, Notification, Profile, Reply, Store, TocNode } from "../types";

/**
 * Demo mode: runs entirely in this browser (localStorage) when Supabase isn't configured.
 * Seeds a sample book plus a "visitor" reply so every feature — including the mailbox — can be tried.
 */

type DB = {
  me: string;
  profiles: Profile[];
  books: Book[];
  toc: TocNode[];
  bubbles: Bubble[];
  replies: Reply[];
  notifications: Notification[];
};

const KEY = "hippocampus-demo-v1";
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
const now = () => new Date().toISOString();

function seed(): DB {
  const me = uid();
  const visitor = uid();
  const bookId = uid();
  const t = (title: string, parent: string | null, position: number): TocNode => ({
    id: uid(), book_id: bookId, parent_id: parent, title, position, created_by: me, created_at: now(),
  });
  const p1 = t("1부 · 역사", null, 0);
  const p2 = t("2부 · 경제", null, 1);
  const c1 = t("1장 · 고대", p1.id, 0);
  const c2 = t("2장 · 중세", p1.id, 1);
  const c3 = t("1장 · 시장과 가격", p2.id, 0);
  const bubble: Bubble = {
    id: uid(), book_id: bookId, toc_node_id: c1.id, color: "#F6C9A8", author_id: me, created_at: now(),
    content: "고대 국가가 생겨난 결정적 계기는 잉여 생산일까, 전쟁일까?",
  };
  const reply: Reply = {
    id: uid(), bubble_id: bubble.id, author_id: visitor, created_at: now(),
    content: "저는 잉여 생산 쪽이라고 봐요. 지킬 게 생겨야 조직이 필요해지니까요.",
  };
  return {
    me,
    profiles: [{ id: visitor, nickname: "지나가는 독자", color: "#9FC5B8" }],
    books: [{ id: bookId, title: "샘플 책 (데모)", author: "독서해마", created_by: me, created_at: now() }],
    toc: [p1, p2, c1, c2, c3],
    bubbles: [bubble],
    replies: [reply],
    notifications: [{ id: uid(), bubble_id: bubble.id, reply_id: reply.id, read_at: null, created_at: now() }],
  };
}

export class LocalStore implements Store {
  readonly mode = "local" as const;
  private db: DB;
  private listeners = new Set<(t: ChangeTopic) => void>();

  constructor() {
    let loaded: DB | null = null;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) loaded = JSON.parse(raw);
    } catch {}
    this.db = loaded ?? seed();
    this.persist();
  }

  private persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.db));
    } catch {}
  }

  private emit(...topics: ChangeTopic[]) {
    this.persist();
    for (const t of topics) this.listeners.forEach((l) => l(t));
  }

  private author(id: string) {
    const p = this.db.profiles.find((x) => x.id === id);
    return p ? { nickname: p.nickname, color: p.color } : null;
  }

  async init() {
    const profile = this.db.profiles.find((p) => p.id === this.db.me) ?? null;
    return { userId: this.db.me, profile };
  }

  async saveProfile(nickname: string, color: string) {
    const p: Profile = { id: this.db.me, nickname: nickname.trim(), color };
    this.db.profiles = [...this.db.profiles.filter((x) => x.id !== p.id), p];
    this.emit("bubbles", "replies");
    return p;
  }

  async listBooks() {
    return [...this.db.books].sort((a, b) => a.title.localeCompare(b.title, "ko"));
  }

  async addBook(title: string, author: string | null) {
    const norm = (s: string | null) => (s ?? "").trim().toLowerCase();
    if (this.db.books.some((b) => norm(b.title) === norm(title) && norm(b.author) === norm(author)))
      throw new Error("이미 등록된 책이에요. 왼쪽 목록에서 찾아보세요.");
    const b: Book = { id: uid(), title: title.trim(), author: author?.trim() || null, created_by: this.db.me, created_at: now() };
    this.db.books.push(b);
    this.emit("books");
    return b;
  }

  async listToc(bookId: string) {
    return this.db.toc
      .filter((n) => n.book_id === bookId)
      .sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at));
  }

  async addToc(bookId: string, parentId: string | null, title: string) {
    const siblings = this.db.toc.filter((n) => n.book_id === bookId && n.parent_id === parentId);
    const n: TocNode = {
      id: uid(), book_id: bookId, parent_id: parentId, title: title.trim(),
      position: siblings.reduce((m, s) => Math.max(m, s.position), -1) + 1,
      created_by: this.db.me, created_at: now(),
    };
    this.db.toc.push(n);
    this.emit("toc");
    return n;
  }

  async listBubbles(bookId: string) {
    return this.db.bubbles
      .filter((b) => b.book_id === bookId)
      .map((b) => ({
        ...b,
        author: this.author(b.author_id),
        reply_count: this.db.replies.filter((r) => r.bubble_id === b.id).length,
      }));
  }

  async addBubble(bookId: string, tocNodeId: string | null, content: string, color: string) {
    const b: Bubble = { id: uid(), book_id: bookId, toc_node_id: tocNodeId, content: content.trim(), color, author_id: this.db.me, created_at: now() };
    this.db.bubbles.push(b);
    this.emit("bubbles");
    return { ...b, author: this.author(b.author_id) };
  }

  async deleteBubble(id: string) {
    this.db.bubbles = this.db.bubbles.filter((b) => b.id !== id);
    this.db.replies = this.db.replies.filter((r) => r.bubble_id !== id);
    this.db.notifications = this.db.notifications.filter((n) => n.bubble_id !== id);
    this.emit("bubbles", "replies", "notifications");
  }

  async listReplies(bubbleId: string) {
    return this.db.replies
      .filter((r) => r.bubble_id === bubbleId)
      .map((r) => ({ ...r, author: this.author(r.author_id) }));
  }

  async addReply(bubbleId: string, content: string) {
    const r: Reply = { id: uid(), bubble_id: bubbleId, content: content.trim(), author_id: this.db.me, created_at: now() };
    this.db.replies.push(r);
    // In demo mode you are the only real user, so replies on your own bubbles don't notify (same rule as the DB trigger).
    this.emit("replies", "bubbles");
    return { ...r, author: this.author(r.author_id) };
  }

  async listNotifications() {
    return this.db.notifications
      .map((n) => {
        const r = this.db.replies.find((x) => x.id === n.reply_id);
        const b = this.db.bubbles.find((x) => x.id === n.bubble_id);
        return {
          ...n,
          reply: r ? { content: r.content, author: this.author(r.author_id) } : undefined,
          bubble: b ? { content: b.content, book_id: b.book_id, color: b.color } : undefined,
        };
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async markAllRead() {
    this.db.notifications = this.db.notifications.map((n) => (n.read_at ? n : { ...n, read_at: now() }));
    this.emit("notifications");
  }

  subscribe(cb: (topic: ChangeTopic) => void) {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }
}
