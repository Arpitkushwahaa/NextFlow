"use client";
import React, { useCallback, useRef, useState } from "react";
import { ReactFlow, Background, MiniMap, BackgroundVariant, Panel, useReactFlow, reconnectEdge, type Edge, type Connection } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ZoomIn, ZoomOut, Maximize2, Undo2, Redo2, Play, Loader2 } from "lucide-react";
import { useWorkflowStore } from "@/store/workflowStore";
import { SOURCE_HANDLE_TYPES, TARGET_HANDLE_ACCEPTS } from "@/types/workflow";
import TextNode from "./nodes/TextNode";
import ImageNode from "./nodes/ImageNode";
import UploadVideoNode from "./nodes/UploadVideoNode";
import LLMNode from "./nodes/LLMNode";
import CropImageNode from "./nodes/CropImageNode";
import ExtractFrameNode from "./nodes/ExtractFrameNode";

const nodeTypes = {
  textNode: TextNode,
  imageNode: ImageNode,
  videoNode: UploadVideoNode,
  llmNode: LLMNode,
  cropImageNode: CropImageNode,
  extractFrameNode: ExtractFrameNode,
};

interface CanvasProps {
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

function getHandleDataType(handleId: string | null | undefined): string | null {
  if (!handleId) return null;
  if (SOURCE_HANDLE_TYPES[handleId]) return SOURCE_HANDLE_TYPES[handleId];
  if (TARGET_HANDLE_ACCEPTS[handleId]) return TARGET_HANDLE_ACCEPTS[handleId];
  if (handleId.startsWith("target-images-")) return "image";
  return null;
}

export default function Canvas({ onDragOver, onDrop }: CanvasProps) {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, setEdges, deleteNode, undo, redo, canUndo, canRedo, workflowId, workflowName, setNodeExecuting, fetchRuns, saveWorkflow } = useWorkflowStore();
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const canvasRef = useRef<HTMLDivElement>(null);
  const edgeReconnectSuccessful = useRef(true);
  const [isRunning, setIsRunning] = useState(false);

  const isValidConnection = useCallback((conn: Edge | Connection) => { const connection = conn as Connection;
    const srcType = getHandleDataType(connection.sourceHandle);
    const tgtType = getHandleDataType(connection.targetHandle);
    if (srcType && tgtType && srcType !== tgtType) return false;
    const alreadyConnected = edges.find((e) => e.target === connection.target && e.targetHandle === connection.targetHandle);
    if (alreadyConnected) return false;
    return true;
  }, [edges]);

  const onReconnectStart = useCallback(() => { edgeReconnectSuccessful.current = false; }, []);
  const onReconnect = useCallback((old: Edge, conn: Connection) => {
    edgeReconnectSuccessful.current = true;
    setEdges(reconnectEdge(old, conn, edges));
  }, [edges, setEdges]);
  const onReconnectEnd = useCallback((_: MouseEvent | TouchEvent, edge: Edge) => {
    if (!edgeReconnectSuccessful.current) setEdges(edges.filter((e) => e.id !== edge.id));
    edgeReconnectSuccessful.current = true;
  }, [edges, setEdges]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== "Delete" && e.key !== "Backspace") return;
    const tgt = e.target as HTMLElement;
    if (["INPUT", "TEXTAREA", "SELECT"].includes(tgt.tagName) || tgt.isContentEditable) return;
    nodes.filter((n) => n.selected).forEach((n) => deleteNode(n.id));
  }, [nodes, deleteNode]);

  const isValidId = (id: string) => !!id && !id.startsWith("workflow_") && !id.startsWith("sample_");

  const runFullWorkflow = useCallback(async () => {
    if (isRunning || !isValidId(workflowId)) return;
    setIsRunning(true);
    nodes.forEach((n) => setNodeExecuting(n.id, true));
    try {
      await saveWorkflow();
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId, scope: "FULL" }),
      });
      if (!res.ok) throw new Error("Run failed");
      const result = await res.json() as { run: { nodeRuns: Array<{ nodeId: string; status: string; outputs?: { text?: string; imageUrl?: string; videoUrl?: string } }> }; outputs?: Record<string, { text?: string; imageUrl?: string }> };
      const { updateNodeData } = useWorkflowStore.getState();
      for (const nr of result.run?.nodeRuns ?? []) {
        if (nr.status === "SUCCESS" && nr.outputs) {
          if (nr.outputs.text !== undefined) updateNodeData(nr.nodeId, { response: nr.outputs.text });
          if (nr.outputs.imageUrl !== undefined) updateNodeData(nr.nodeId, { outputUrl: nr.outputs.imageUrl });
        }
      }
      await fetchRuns();
    } catch { /* silent */ } finally {
      setIsRunning(false);
      nodes.forEach((n) => setNodeExecuting(n.id, false));
    }
  }, [isRunning, workflowId, nodes, setNodeExecuting, fetchRuns]);

  const runSelectedNodes = useCallback(async () => {
    const selected = nodes.filter((n) => n.selected).map((n) => n.id);
    if (!selected.length || !isValidId(workflowId)) return;
    setIsRunning(true);
    selected.forEach((id) => setNodeExecuting(id, true));
    try {
      await saveWorkflow();
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId, scope: "PARTIAL", nodeIds: selected }),
      });
      if (!res.ok) throw new Error("Run failed");
      await fetchRuns();
    } catch { /* silent */ } finally {
      setIsRunning(false);
      selected.forEach((id) => setNodeExecuting(id, false));
    }
  }, [workflowId, nodes, setNodeExecuting, fetchRuns]);

  const hasSelected = nodes.some((n) => n.selected);

  return (
    <div ref={canvasRef} className="flex-1 h-full" onKeyDown={handleKeyDown} tabIndex={0}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onReconnect={onReconnect}
        onReconnectStart={onReconnectStart}
        onReconnectEnd={onReconnectEnd}
        nodeTypes={nodeTypes}
        onDragOver={onDragOver}
        onDrop={onDrop}
        isValidConnection={isValidConnection}
        snapToGrid
        snapGrid={[10, 10]}
        defaultEdgeOptions={{ animated: true, style: { stroke: "#7c3aed", strokeWidth: 2 } }}
        className="bg-[#0a0a0a]"
        deleteKeyCode={null}
        fitView
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1e1e1e" />

        {/* Top Toolbar */}
        <Panel position="top-center" className="mt-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-[#111] border border-[#1f1f1f] rounded-xl shadow-xl">
            <span className="text-xs text-[#555] font-medium truncate max-w-[160px]">{workflowName || "Untitled"}</span>
            <div className="w-px h-4 bg-[#2a2a2a]" />
            {hasSelected && (
              <button onClick={runSelectedNodes} disabled={isRunning || !isValidId(workflowId)} title={!isValidId(workflowId) ? "Save workflow first" : ""} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-[#2a2a2a] text-[#aaa] hover:text-white rounded-lg transition-all disabled:opacity-50">
                {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                Run Selected
              </button>
            )}
            <button onClick={runFullWorkflow} disabled={isRunning || nodes.length === 0 || !isValidId(workflowId)} title={!isValidId(workflowId) ? "Save workflow first" : ""} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-[#e2ff66] hover:bg-[#d4f055] text-black rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              Run All
            </button>
          </div>
        </Panel>

        {/* Bottom Controls */}
        <Panel position="bottom-center" className="mb-4">
          <div className="flex items-center gap-1 px-2 py-1.5 bg-[#111] border border-[#1f1f1f] rounded-xl shadow-lg">
            <button onClick={() => zoomIn()} className="canvas-ctrl-btn" title="Zoom In"><ZoomIn className="w-3.5 h-3.5" /></button>
            <button onClick={() => zoomOut()} className="canvas-ctrl-btn" title="Zoom Out"><ZoomOut className="w-3.5 h-3.5" /></button>
            <button onClick={() => fitView({ padding: 0.2 })} className="canvas-ctrl-btn" title="Fit View"><Maximize2 className="w-3.5 h-3.5" /></button>
            <div className="w-px h-4 bg-[#2a2a2a] mx-0.5" />
            <button onClick={undo} disabled={!canUndo()} className="canvas-ctrl-btn disabled:opacity-30" title="Undo"><Undo2 className="w-3.5 h-3.5" /></button>
            <button onClick={redo} disabled={!canRedo()} className="canvas-ctrl-btn disabled:opacity-30" title="Redo"><Redo2 className="w-3.5 h-3.5" /></button>
          </div>
        </Panel>

        <MiniMap nodeColor={(n) => {
          const colors: Record<string, string> = { textNode: "#10b981", imageNode: "#6366f1", videoNode: "#f59e0b", llmNode: "#7c3aed", cropImageNode: "#f97316", extractFrameNode: "#14b8a6" };
          return colors[n.type ?? ""] ?? "#444";
        }} maskColor="rgba(0,0,0,0.85)" className="!bg-[#111] !border-[#1f1f1f] !rounded-xl" pannable zoomable />
      </ReactFlow>
    </div>
  );
}