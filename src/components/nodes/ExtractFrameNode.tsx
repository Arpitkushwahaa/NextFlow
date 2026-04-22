"use client";
import React, { memo, useCallback, useEffect } from "react";
import { Handle, Position, NodeProps, useUpdateNodeInternals } from "@xyflow/react";
import { Film, Trash2, Play, Loader2 } from "lucide-react";
import { ExtractFrameNodeData } from "@/types/workflow";
import { useWorkflowStore } from "@/store/workflowStore";

const ExtractFrameNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as ExtractFrameNodeData;
  const { updateNodeData, deleteNode, deleteEdgeByHandle, edges, setNodeExecuting } = useWorkflowStore();
  const updateNodeInternals = useUpdateNodeInternals();

  useEffect(() => { updateNodeInternals(id); }, [id, updateNodeInternals]);

  const connectedTargets = edges.filter((e) => e.target === id).map((e) => e.targetHandle ?? "");
  const isConnected = (h: string) => connectedTargets.includes(h);

  const onDoubleClickHandle = useCallback((e: React.MouseEvent, hid: string) => {
    e.stopPropagation(); e.preventDefault();
    deleteEdgeByHandle(id, hid, "target");
  }, [id, deleteEdgeByHandle]);

  const handleRun = useCallback(async () => {
    const videoUrl = nodeData.videoUrl;
    if (!videoUrl) { updateNodeData(id, { error: "Connect a video source or enter a video URL", isLoading: false }); return; }
    updateNodeData(id, { isLoading: true, error: null, outputUrl: null });
    setNodeExecuting(id, true);

    try {
      const workflowId = useWorkflowStore.getState().workflowId;
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId, scope: "SINGLE", nodeIds: [id] }),
      });
      if (!res.ok) { const err = await res.json() as { error?: string }; throw new Error(err.error ?? "Run failed"); }
      const result = await res.json() as { run: { nodeRuns: Array<{ nodeId: string; outputs: { imageUrl?: string }; status: string; error?: string }> } };
      const nodeRun = result.run?.nodeRuns?.find((nr) => nr.nodeId === id);
      if (nodeRun?.status === "FAILED") { updateNodeData(id, { error: nodeRun.error ?? "Execution failed", isLoading: false }); }
      else { updateNodeData(id, { outputUrl: nodeRun?.outputs?.imageUrl ?? null, isLoading: false, error: null }); }
      useWorkflowStore.getState().fetchRuns();
    } catch (err) {
      updateNodeData(id, { error: err instanceof Error ? err.message : "An error occurred", isLoading: false });
    } finally { setNodeExecuting(id, false); }
  }, [id, nodeData, updateNodeData, setNodeExecuting]);

  return (
    <div className={`node-card${selected ? " node-selected" : ""}${nodeData.isExecuting ? " node-executing" : ""}`} style={{ minWidth: 300 }}>
      {/* Input handles */}
      <Handle type="target" position={Position.Left} id="target-video_url"
        className={`node-handle node-handle-video${isConnected("target-video_url") ? " node-handle-connected" : ""}`}
        style={{ top: 56 }}
        onDoubleClick={(e) => { e.stopPropagation(); deleteEdgeByHandle(id, "target-video_url", "target"); }}
      />
      <span className="node-handle-label-left absolute text-[10px]" style={{ top: 50, left: -60 }}>video_url*</span>

      <Handle type="target" position={Position.Left} id="target-timestamp"
        className={`node-handle node-handle-text${isConnected("target-timestamp") ? " node-handle-connected" : ""}`}
        style={{ top: 84 }}
        onDoubleClick={(e) => { e.stopPropagation(); deleteEdgeByHandle(id, "target-timestamp", "target"); }}
      />
      <span className="node-handle-label-left absolute text-[10px]" style={{ top: 78, left: -64 }}>timestamp</span>

      {/* Output handle */}
      <Handle type="source" position={Position.Right} id="source-image"
        className="node-handle node-handle-image"
        style={{ top: 70 }}
      />
      <span className="node-handle-label-right absolute text-[10px]" style={{ top: 64, right: -36 }}>image</span>

      {/* Header */}
      <div className="node-header">
        <div className="node-header-left">
          <div className="node-icon node-icon-extract"><Film className="w-3 h-3" /></div>
          <span className="node-title">{nodeData.label || "Extract Frame"}</span>
        </div>
        <button onClick={() => deleteNode(id)} className="node-delete-btn"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>

      <div className="node-body space-y-2">
        {!isConnected("target-video_url") && (
          <div>
            <label className="node-field-label">Video URL</label>
            <input type="text" value={nodeData.videoUrl ?? ""} onChange={(e) => updateNodeData(id, { videoUrl: e.target.value })}
              placeholder="https://..." className="node-input" />
          </div>
        )}

        <div>
          <label className="node-field-label">Timestamp (seconds or 50%)</label>
          <input type="text" value={nodeData.timestamp || "50%"}
            disabled={isConnected("target-timestamp")}
            onChange={(e) => updateNodeData(id, { timestamp: e.target.value })}
            placeholder="0 or 50%"
            className={`node-input${isConnected("target-timestamp") ? " opacity-40 cursor-not-allowed" : ""}`}
          />
        </div>

        {nodeData.outputUrl && (
          <div>
            <label className="node-field-label">Extracted Frame</label>
            <img src={nodeData.outputUrl} alt="frame" className="w-full h-28 object-cover rounded-lg border border-[#2a2a2a]" />
          </div>
        )}
        {nodeData.error && <p className="text-xs text-red-400">{nodeData.error}</p>}
      </div>

      <div className="node-footer">
        <button onClick={handleRun} disabled={nodeData.isLoading} className="node-run-btn">
          {nodeData.isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          <span>Extract Frame</span>
        </button>
      </div>
    </div>
  );
});

ExtractFrameNode.displayName = "ExtractFrameNode";
export default ExtractFrameNode;