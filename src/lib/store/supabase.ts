import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Book, Bubble, ChangeTopic, Notification, Profile, Reply, Store, TocNode } from "../types";

const AUTHOR = "author:profiles(nickname,color)";

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export class SupabaseStore implements Store {
  readonly mode = "supabase" as const;
  private sb: SupabaseClient;
  private userId = "";

  constructor(url: string, anonKey: string) {
    this.sb = createClient(url, anonKey);
  }

  async init() {
    let { data } = await this.sb.auth.getSession();
    if (!data.session) {
      const res = await this.sb.auth.signInAnonymously();
      if (res.error) throw new Error(`익명 로그인 실패: ${res.error.message} (Supabase에서 Anonymous Sign-ins를 켰는지 확인하세요)`);
      data = { session: res.data.session };
    }
    this.userId = data.session!.user.id;
    const profile = must(
      await this.sb.from("profiles").select("id,nickname,color").eq("id", this.userId).maybeSingle(),
    ) as Profile | null;
    return { userId: this.userId, profile };
  }

  async saveProfile(nickname: string, color: string) {
    return must(
      await this.sb
        .from("profiles")
        .upsert({ id: this.userId, nickname: nickname.trim(), color })
        .select("id,nickname,color")
        .single(),
    ) as Profile;
  }

  async listBooks() {
    return must(await this.sb.from("books").select("*").order("title")) as Book[];
  }

  async addBook(title: string, author: string | null) {
    const res = await this.sb
      .from("books")
      .insert({ title: title.trim(), author: author?.trim() || null })
      .select("*")
      .single();
    if (res.error?.code === "23505") throw new Error("이미 등록된 책이에요. 왼쪽 목록에서 찾아보세요.");
    return must(res) as Book;
  }

  async listToc(bookId: string) {
    return must(
      await this.sb.from("toc_nodes").select("*").eq("book_id", bookId).order("position").order("created_at"),
    ) as TocNode[];
  }

  async addToc(bookId: string, parentId: string | null, title: string) {
    const siblings = (await this.listToc(bookId)).filter((n) => n.parent_id === parentId);
    const position = siblings.reduce((m, n) => Math.max(m, n.position), -1) + 1;
    return must(
      await this.sb
        .from("toc_nodes")
        .insert({ book_id: bookId, parent_id: parentId, title: title.trim(), position })
        .select("*")
        .single(),
    ) as TocNode;
  }

  async listBubbles(bookId: string) {
    const rows = must(
      await this.sb
        .from("bubbles")
        .select(`*, ${AUTHOR}, replies(count)`)
        .eq("book_id", bookId)
        .order("created_at"),
    ) as (Bubble & { replies: { count: number }[] })[];
    return rows.map(({ replies, ...b }) => ({ ...b, reply_count: replies?.[0]?.count ?? 0 }));
  }

  async addBubble(bookId: string, tocNodeId: string | null, content: string, color: string) {
    return must(
      await this.sb
        .from("bubbles")
        .insert({ book_id: bookId, toc_node_id: tocNodeId, content: content.trim(), color })
        .select(`*, ${AUTHOR}`)
        .single(),
    ) as Bubble;
  }

  async deleteBubble(id: string) {
    must(await this.sb.from("bubbles").delete().eq("id", id));
  }

  async listReplies(bubbleId: string) {
    return must(
      await this.sb.from("replies").select(`*, ${AUTHOR}`).eq("bubble_id", bubbleId).order("created_at"),
    ) as Reply[];
  }

  async addReply(bubbleId: string, content: string) {
    return must(
      await this.sb
        .from("replies")
        .insert({ bubble_id: bubbleId, content: content.trim() })
        .select(`*, ${AUTHOR}`)
        .single(),
    ) as Reply;
  }

  async listNotifications() {
    return must(
      await this.sb
        .from("notifications")
        .select(`*, reply:replies(content, ${AUTHOR}), bubble:bubbles(content, book_id, color)`)
        .order("created_at", { ascending: false })
        .limit(50),
    ) as Notification[];
  }

  async markAllRead() {
    must(
      await this.sb
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .is("read_at", null),
    );
  }

  subscribe(cb: (topic: ChangeTopic) => void) {
    const map: [string, ChangeTopic][] = [
      ["books", "books"],
      ["toc_nodes", "toc"],
      ["bubbles", "bubbles"],
      ["replies", "replies"],
    ];
    const ch = this.sb.channel("hippocampus");
    for (const [table, topic] of map) {
      ch.on("postgres_changes", { event: "*", schema: "public", table }, () => cb(topic));
    }
    ch.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "notifications", filter: `recipient_id=eq.${this.userId}` },
      () => cb("notifications"),
    );
    ch.subscribe();
    return () => {
      this.sb.removeChannel(ch);
    };
  }
}
