"use client";

import { useEffect, useMemo } from "react";
import {
  Background, Controls, Handle, MiniMap, Position, ReactFlow, useReactFlow,
  type Node, type NodeProps,
} from "@xyflow/react";
import { inkFor, layoutBook } from "@/lib/layout";
import type { Book, Bubble, TocNode } from "@/lib/types";

type Props = {
  book: Book;
  toc: TocNode[];
  bubbles: Bubble[];
  focus: { id: string; n: number } | null;
  selectedBubbleId: string | null;
  onOpenBubble: (id: string) => void;
  onNewBubble: (tocId: string | null) => void;
};

const hidden = { opacity: 0, width: 1, height: 1, border: 0, minWidth: 0, minHeight: 0 };

function RootNode({ data }: NodeProps<Node<{ book: Book; onNew: () => void }>>) {
  return (
    <div className="group relative max-w-[240px] rounded-2xl border-2 border-[var(--ink)] bg-[var(--paper)] px-5 py-4 shadow-sm">
      <div className="font-serif text-lg font-bold leading-snug">{data.book.title}</div>
      {data.book.author && <div className="mt-1 text-xs text-[var(--muted)]">{data.book.author}</div>}
      <AddBtn onClick={data.onNew} />
      <Handle type="source" position={Position.Right} style={hidden} />
    </div>
  );
}

function TocNodeView({ data }: NodeProps<Node<{ toc: TocNode; depth: number; onNew: () => void }>>) {
  const top = data.depth === 1;
  return (
    <div
      className={`group relative max-w-[230px] rounded-xl border px-4 py-2.5 ${
        top ? "border-[var(--ink)]/40 bg-white font-semibold" : "border-[var(--line)] bg-white/80"
      }`}
    >
      <Handle type="target" position={Position.Left} style={hidden} />
      <div className="text-[13px] leading-snug">{data.toc.title}</div>
      <AddBtn onClick={data.onNew} />
      <Handle type="source" position={Position.Right} style={hidden} />
    </div>
  );
}

function BubbleNode({ data, selected }: NodeProps<Node<{ bubble: Bubble; active: boolean }>>) {
  const b = data.bubble;
  const ink = inkFor(b.color);
  return (
    <div className="relative w-[250px] cursor-pointer" style={{ filter: data.active || selected ? "drop-shadow(0 6px 14px rgba(0,0,0,.18))" : undefined }}>
      <Handle type="target" position={Position.Left} style={{ ...hidden, top: 40 }} />
      {/* tail */}
      <span className="absolute left-[-7px] top-[34px] h-3.5 w-3.5 rotate-45 rounded-[2px]" style={{ background: b.color }} />
      <div
        className="relative rounded-[18px] px-4 py-3 transition-transform hover:-translate-y-0.5"
        style={{ background: b.color, color: ink, outline: data.active ? `2px solid ${ink}` : "none", outlineOffset: 2 }}
      >
        <p className="line-clamp-4 text-[13px] leading-relaxed">{b.content}</p>
        <div className="mt-2 flex items-center justify-between text-[11px] opacity-75">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full border border-black/15" style={{ background: b.author?.color ?? "#ccc" }} />
            {b.author?.nickname ?? "익명"}
          </span>
          <span>💬 {b.reply_count ?? 0}</span>
        </div>
      </div>
    </div>
  );
}

function AddBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title="말풍선 띄우기"
      className="nodrag absolute -right-3 -top-3 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--line)] bg-white text-xs opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
    >
      💬
    </button>
  );
}

const nodeTypes = { root: RootNode, toc: TocNodeView, bubble: BubbleNode };

export function MindMap(p: Props) {
  const { nodes, edges } = useMemo(() => {
    const { nodes, edges } = layoutBook(p.book, p.toc, p.bubbles);
    return {
      edges,
      nodes: nodes.map((n) => {
        if (n.type === "bubble") return { ...n, data: { ...n.data, active: n.id === p.selectedBubbleId } };
        const tocId = n.type === "root" ? null : n.id;
        return { ...n, draggable: false, data: { ...n.data, onNew: () => p.onNewBubble(tocId) } };
      }),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.book, p.toc, p.bubbles, p.selectedBubbleId]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodeClick={(_, n) => n.type === "bubble" && p.onOpenBubble(n.id)}
      nodesConnectable={false}
      nodesDraggable={false}
      fitView
      fitViewOptions={{ padding: 0.2, maxZoom: 1.1 }}
      minZoom={0.2}
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={24} size={1.2} color="var(--dot)" />
      <Controls showInteractive={false} position="bottom-right" />
      <MiniMap pannable zoomable position="bottom-left" nodeColor={(n) => (n.type === "bubble" ? (n.data as { bubble: Bubble }).bubble.color : "#D9D2C6")} />
      <Focus focus={p.focus} />
      <RefitOnBook bookId={p.book.id} />
    </ReactFlow>
  );
}

function Focus({ focus }: { focus: Props["focus"] }) {
  const rf = useReactFlow();
  useEffect(() => {
    if (!focus) return;
    const n = rf.getNode(focus.id);
    if (!n) return;
    const w = n.measured?.width ?? 200;
    const h = n.measured?.height ?? 50;
    rf.setCenter(n.position.x + w / 2 + 150, n.position.y + h / 2, { zoom: 1, duration: 450 });
  }, [focus, rf]);
  return null;
}

function RefitOnBook({ bookId }: { bookId: string }) {
  const rf = useReactFlow();
  useEffect(() => {
    const t = setTimeout(() => rf.fitView({ padding: 0.2, maxZoom: 1.1, duration: 300 }), 50);
    return () => clearTimeout(t);
  }, [bookId, rf]);
  return null;
}
