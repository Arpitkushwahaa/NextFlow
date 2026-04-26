"use client";
import React, { useCallback, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Type, ImageIcon, Video, Brain, Crop, Film, Search, Save, FileDown, FileUp, Package, Plus, ArrowLeft, ChevronLeft, History } from "lucide-react";
import { useWorkflowStore } from "@/store/workflowStore";

export type NodeTypeKey = "textNode" | "imageNode" | "videoNode" | "llmNode" | "cropImageNode" | "extractFrameNode";

interface SidebarProps {
  onDragStart: (event: React.DragEvent, nodeType: NodeTypeKey) => void;
}

const NODE_TYPES: Array<{ type: NodeTypeKey; label: string; Icon: React.ElementType; color: string; span?: boolean }> = [
  { type: "textNode", label: "Text", Icon: Type, color: "#10b981" },
  { type: "imageNode", label: "Upload Image", Icon: ImageIcon, color: "#6366f1" },
  { type: "videoNode", label: "Upload Video", Icon: Video, color: "#f59e0b" },
  { type: "llmNode", label: "Run Any LLM", Icon: Brain, color: "#7c3aed", span: true },
  { type: "cropImageNode", label: "Crop Image", Icon: Crop, color: "#f97316" },
  { type: "extractFrameNode", label: "Extract Frame", Icon: Film, color: "#14b8a6" },
];

export default function Sidebar({ onDragStart }: SidebarProps) {
  const { workflowName, setWorkflowName, saveWorkflow, loadSampleWorkflow, exportWorkflow, importWorkflow, toggleHistory, isHistoryOpen } = useWorkflowStore();
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const handleNew = useCallback(async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled Workflow", nodes: [], edges: [] }),
      });
      const data = await res.json() as { id?: string };
      if (data?.id) router.push(`/workflow/${data.id}`);
    } finally {
      setCreating(false);
    }
  }, [router]);

  const filtered = search.trim() === "" ? NODE_TYPES : NODE_TYPES.filter((n) => n.label.toLowerCase().includes(search.toLowerCase()));

  const handleExport = useCallback(() => {
    const json = exportWorkflow();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${workflowName.replace(/\s+/g, "_")}.json`; a.click();
    URL.revokeObjectURL(url);
  }, [exportWorkflow, workflowName]);

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => importWorkflow(ev.target?.result as string);
    reader.readAsText(file);
  }, [importWorkflow]);

  return (
    <div className="flex h-full shrink-0">
      {/* Icon rail */}
      <div className="w-12 h-full bg-[#111] flex flex-col items-center border-r border-[#1f1f1f] shrink-0">
        <Link href="/dashboard" className="w-full h-12 flex items-center justify-center border-b border-[#1f1f1f] hover:bg-[#1a1a1a] transition-colors" title="Dashboard">
          <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center">
            <span className="text-black font-bold text-xs">N</span>
          </div>
        </Link>

        <div className="flex flex-col items-center gap-1 pt-2 px-1">
          <Link href="/dashboard" title="Back" className="sidebar-icon-btn"><ArrowLeft className="w-4 h-4" /></Link>
          <button onClick={() => { setOpen(!open); if (!open) setTimeout(() => searchRef.current?.focus(), 200); }} title="Nodes" className={`sidebar-icon-btn${open ? " sidebar-icon-active" : ""}`}>
            <Brain className="w-4 h-4" />
          </button>
          <button onClick={toggleHistory} title="History" className={`sidebar-icon-btn${isHistoryOpen ? " sidebar-icon-active" : ""}`}>
            <History className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expandable panel */}
      <div className="h-full bg-[#111] flex flex-col overflow-hidden border-r border-[#1f1f1f] transition-all duration-200"
        style={{ width: open ? 248 : 0 }}>
        <div className="w-[248px] h-full flex flex-col">
          {/* Workflow name */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#1f1f1f] shrink-0">
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="flex-1 min-w-0 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-white text-xs font-medium focus:outline-none focus:border-[#444]"
              placeholder="Untitled Workflow"
            />
            <button onClick={() => setOpen(false)} className="w-6 h-6 flex items-center justify-center text-[#555] hover:text-white transition-colors shrink-0">
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Search */}
          <div className="px-3 py-2 border-b border-[#1f1f1f] shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#555]" />
              <input ref={searchRef} type="text" placeholder="Search nodes..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-[11px] text-white placeholder-[#444] focus:outline-none focus:border-[#444]"
              />
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            {/* Quick access */}
            <div className="px-3 pt-3">
              <p className="text-[10px] font-semibold text-[#555] uppercase tracking-widest mb-2">Quick Access</p>
              <div className="grid grid-cols-2 gap-1.5">
                {filtered.map((n) => (
                  <div
                    key={n.type}
                    draggable
                    onDragStart={(e) => onDragStart(e, n.type)}
                    onClick={() => {
                      const pos = { x: 300 + Math.random() * 200, y: 200 + Math.random() * 200 };
                      useWorkflowStore.getState().addNode(n.type, pos);
                    }}
                    className={`node-sidebar-btn${n.span ? " col-span-2" : ""}`}
                    title={`${n.label} — drag to canvas or click to add`}
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-1" style={{ backgroundColor: n.color + "22" }}>
                      <n.Icon className="w-3.5 h-3.5" style={{ color: n.color }} />
                    </div>
                    <span className="text-[10px] font-medium text-[#aaa] text-center leading-tight">{n.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tools */}
            <div className="px-3 pt-4">
              <p className="text-[10px] font-semibold text-[#555] uppercase tracking-widest mb-2">Tools</p>
              <div className="grid grid-cols-2 gap-1.5">
                <button onClick={handleExport} className="node-sidebar-btn">
                  <FileDown className="w-4 h-4 text-[#666] mb-1" />
                  <span className="text-[10px] text-[#888]">Export</span>
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="node-sidebar-btn">
                  <FileUp className="w-4 h-4 text-[#666] mb-1" />
                  <span className="text-[10px] text-[#888]">Import</span>
                </button>
                <button onClick={loadSampleWorkflow} className="col-span-2 node-sidebar-btn">
                  <Package className="w-4 h-4 text-[#666] mb-1" />
                  <span className="text-[10px] text-[#888]">Load Sample Workflow</span>
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
            </div>

            {/* Actions */}
            <div className="px-3 pt-4 pb-4">
              <p className="text-[10px] font-semibold text-[#555] uppercase tracking-widest mb-2">Actions</p>
              <div className="flex gap-1.5">
                <button onClick={handleNew} disabled={creating} className="flex-1 flex items-center justify-center gap-1 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] rounded-lg text-[#888] hover:text-white text-[10px] transition-colors disabled:opacity-50">
                  <Plus className="w-3 h-3" /> {creating ? "..." : "New"}
                </button>
                <button onClick={() => saveWorkflow()} className="flex-1 flex items-center justify-center gap-1 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] rounded-lg text-[#888] hover:text-white text-[10px] transition-colors">
                  <Save className="w-3 h-3" /> Save
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}