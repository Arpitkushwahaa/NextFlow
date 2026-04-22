"use client";
import React, { useEffect, useState } from "react";
import { History, ChevronRight, CheckCircle2, XCircle, Clock, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useWorkflowStore, WorkflowRunEntry, NodeRunEntry } from "@/store/workflowStore";

function formatDuration(ms?: number) {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
    SUCCESS: { icon: <CheckCircle2 className="w-3 h-3" />, color: "text-emerald-400", bg: "bg-emerald-400/10" },
    FAILED: { icon: <XCircle className="w-3 h-3" />, color: "text-red-400", bg: "bg-red-400/10" },
    RUNNING: { icon: <Clock className="w-3 h-3 animate-spin" />, color: "text-yellow-400", bg: "bg-yellow-400/10" },
    PARTIAL: { icon: <AlertCircle className="w-3 h-3" />, color: "text-orange-400", bg: "bg-orange-400/10" },
  };
  const { icon, color, bg } = cfg[status] ?? cfg.RUNNING;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${color} ${bg}`}>
      {icon} {status}
    </span>
  );
}

function NodeRunRow({ nr }: { nr: NodeRunEntry }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-l border-[#2a2a2a] ml-3 pl-3">
      <button onClick={() => setOpen(!open)} className="flex items-start justify-between w-full py-1.5 hover:bg-[#181818] rounded px-1 text-left gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {open ? <ChevronUp className="w-3 h-3 text-[#555] shrink-0" /> : <ChevronDown className="w-3 h-3 text-[#555] shrink-0" />}
          <span className="text-[11px] text-[#aaa] truncate">{nr.nodeLabel || nr.nodeId}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] text-[#555]">{formatDuration(nr.duration)}</span>
          <StatusBadge status={nr.status} />
        </div>
      </button>
      {open && (
        <div className="px-2 pb-2 space-y-1.5">
          {nr.error && (
            <div className="bg-red-400/10 border border-red-400/20 rounded p-2">
              <p className="text-[10px] text-red-400 font-medium mb-0.5">Error</p>
              <p className="text-[10px] text-red-300/80">{nr.error}</p>
            </div>
          )}
          {Object.keys(nr.inputs).length > 0 && (
            <div>
              <p className="text-[10px] text-[#555] font-medium mb-0.5">Inputs</p>
              <div className="bg-[#111] rounded p-1.5 max-h-20 overflow-y-auto">
                {Object.entries(nr.inputs).map(([k, v]) => (
                  <div key={k} className="text-[10px] text-[#888]">
                    <span className="text-[#666]">{k}: </span>
                    <span className="truncate">{typeof v === "string" ? (v.length > 60 ? v.slice(0, 60) + "..." : v) : JSON.stringify(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {Object.keys(nr.outputs).length > 0 && (
            <div>
              <p className="text-[10px] text-[#555] font-medium mb-0.5">Outputs</p>
              <div className="bg-[#111] rounded p-1.5 max-h-24 overflow-y-auto">
                {Object.entries(nr.outputs).map(([k, v]) => (
                  <div key={k} className="text-[10px] text-[#888]">
                    <span className="text-[#666]">{k}: </span>
                    {typeof v === "string" && (v.startsWith("http") || v.startsWith("data:image")) ? (
                      <img src={v} alt="output" className="mt-1 h-12 w-auto rounded border border-[#2a2a2a]" />
                    ) : (
                      <span className="break-all">{typeof v === "string" ? (v.length > 80 ? v.slice(0, 80) + "..." : v) : JSON.stringify(v)}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RunRow({ run }: { run: WorkflowRunEntry }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-[#1f1f1f] rounded-lg overflow-hidden mb-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-start justify-between w-full px-3 py-2.5 hover:bg-[#161616] transition-colors text-left gap-2"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] text-white/50 uppercase tracking-wider font-medium">{run.scope}</span>
            <StatusBadge status={run.status} />
          </div>
          <p className="text-[11px] text-[#666]">{formatTime(run.createdAt)} · {formatDuration(run.duration)}</p>
        </div>
        <ChevronRight className={`w-3.5 h-3.5 text-[#444] shrink-0 mt-0.5 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && run.nodeRuns.length > 0 && (
        <div className="border-t border-[#1f1f1f] bg-[#0f0f0f] py-1">
          {run.nodeRuns.map((nr) => <NodeRunRow key={nr.id} nr={nr} />)}
        </div>
      )}
    </div>
  );
}

export default function HistoryPanel() {
  const { runs, isHistoryOpen, fetchRuns, workflowId } = useWorkflowStore();

  useEffect(() => {
    if (workflowId) fetchRuns();
  }, [workflowId, fetchRuns]);

  if (!isHistoryOpen) return null;

  return (
    <div className="history-panel flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1f1f1f] shrink-0">
        <History className="w-4 h-4 text-[#555]" />
        <span className="text-sm font-medium text-white/60">Workflow History</span>
        {runs.length > 0 && (
          <span className="ml-auto text-xs text-[#444] bg-[#1a1a1a] px-1.5 py-0.5 rounded">{runs.length}</span>
        )}
      </div>

      {/* Runs list */}
      <div className="flex-1 overflow-y-auto p-3">
        {runs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <History className="w-8 h-8 text-[#2a2a2a] mb-3" />
            <p className="text-xs text-[#444]">No runs yet</p>
            <p className="text-[11px] text-[#333] mt-1">Run the workflow to see history</p>
          </div>
        ) : (
          runs.map((run) => <RunRow key={run.id} run={run} />)
        )}
      </div>
    </div>
  );
}