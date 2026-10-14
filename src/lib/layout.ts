import type { Edge, Node } from "@xyflow/react";
import type { Book, Bubble, TocNode } from "./types";

const COL = 300; // horizontal distance per depth
const TOC_H = 64; // vertical slot for a TOC leaf without bubbles
const BUBBLE_H = 128; // vertical slot per bubble
const BUBBLE_GAP_X = 300; // bubble distance from its TOC node

type T = { kind: "root" | "toc"; id: string; children: T[]; bubbles: Bubble[] };

/** Left-to-right tidy tree: book → TOC (parts → chapters) → bubbles as leaves. */
export function layoutBook(book: Book, toc: TocNode[], bubbles: Bubble[]) {
  const byParent = new Map<string | null, TocNode[]>();
  for (const n of toc) {
    const k = n.parent_id;
    if (!byParent.has(k)) byParent.set(k, []);
    byParent.get(k)!.push(n);
  }
  const bubblesOf = (tocId: string | null) => bubbles.filter((b) => b.toc_node_id === tocId);

  const build = (id: string | null): T => ({
    kind: id ? "toc" : "root",
    id: id ?? book.id,
    children: (byParent.get(id) ?? []).map((c) => build(c.id)),
    bubbles: bubblesOf(id),
  });
  const tree = build(null);

  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let cursor = 0;

  // Returns the y of the node; places children first so parents center on them.
  const place = (t: T, depth: number): number => {
    const ys: number[] = [];
    for (const c of t.children) ys.push(place(c, depth + 1));

    const x = depth * COL;
    const bubbleYs = t.bubbles.map((b) => {
      const y = cursor;
      cursor += BUBBLE_H;
      nodes.push({ id: b.id, type: "bubble", position: { x: x + BUBBLE_GAP_X, y }, data: { bubble: b } });
      edges.push({ id: `e-${t.id}-${b.id}`, source: t.id, target: b.id, type: "default", className: "edge-bubble" });
      return y;
    });

    const all = [...ys, ...bubbleYs];
    let y: number;
    if (all.length) y = (Math.min(...all) + Math.max(...all)) / 2;
    else {
      y = cursor;
      cursor += TOC_H;
    }

    if (t.kind === "root") {
      nodes.push({ id: t.id, type: "root", position: { x, y }, data: { book } });
    } else {
      const n = toc.find((x) => x.id === t.id)!;
      nodes.push({ id: t.id, type: "toc", position: { x, y }, data: { toc: n, depth } });
    }
    for (const c of t.children) edges.push({ id: `e-${t.id}-${c.id}`, source: t.id, target: c.id, type: "default" });
    return y;
  };

  place(tree, 0);
  return { nodes, edges };
}

/** Readable text color on top of an arbitrary hex background. */
export function inkFor(hex: string) {
  const m = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.18 ? "#2A2622" : "#FFFDF9";
}
