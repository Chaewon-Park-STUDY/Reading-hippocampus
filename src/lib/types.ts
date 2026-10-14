export type Profile = {
  id: string;
  nickname: string;
  color: string;
};

export type Book = {
  id: string;
  title: string;
  author: string | null;
  created_by: string;
  created_at: string;
};

export type TocNode = {
  id: string;
  book_id: string;
  parent_id: string | null;
  title: string;
  position: number;
  created_by: string;
  created_at: string;
};

export type Bubble = {
  id: string;
  book_id: string;
  toc_node_id: string | null;
  content: string;
  color: string;
  author_id: string;
  created_at: string;
  author?: Pick<Profile, "nickname" | "color"> | null;
  reply_count?: number;
};

export type Reply = {
  id: string;
  bubble_id: string;
  content: string;
  author_id: string;
  created_at: string;
  author?: Pick<Profile, "nickname" | "color"> | null;
};

export type Notification = {
  id: string;
  bubble_id: string;
  reply_id: string;
  read_at: string | null;
  created_at: string;
  reply?: Pick<Reply, "content"> & { author?: Pick<Profile, "nickname" | "color"> | null };
  bubble?: Pick<Bubble, "content" | "book_id" | "color">;
};

/** What changed, so the UI only reloads what it needs. */
export type ChangeTopic = "books" | "toc" | "bubbles" | "replies" | "notifications";

/**
 * Data access used by the UI. Two implementations:
 *  - SupabaseStore: real backend (shared, realtime)
 *  - LocalStore:    browser-only demo mode when Supabase env vars are missing
 */
export interface Store {
  readonly mode: "supabase" | "local";
  /** Ensures a session exists (anonymous sign-in) and returns the user's profile if set. */
  init(): Promise<{ userId: string; profile: Profile | null }>;
  saveProfile(nickname: string, color: string): Promise<Profile>;

  listBooks(): Promise<Book[]>;
  addBook(title: string, author: string | null): Promise<Book>;

  listToc(bookId: string): Promise<TocNode[]>;
  addToc(bookId: string, parentId: string | null, title: string): Promise<TocNode>;

  listBubbles(bookId: string): Promise<Bubble[]>;
  addBubble(bookId: string, tocNodeId: string | null, content: string, color: string): Promise<Bubble>;
  deleteBubble(id: string): Promise<void>;

  listReplies(bubbleId: string): Promise<Reply[]>;
  addReply(bubbleId: string, content: string): Promise<Reply>;

  listNotifications(): Promise<Notification[]>;
  markAllRead(): Promise<void>;

  /** Subscribe to data changes (realtime in Supabase, same-tab events locally). */
  subscribe(cb: (topic: ChangeTopic) => void): () => void;
}
