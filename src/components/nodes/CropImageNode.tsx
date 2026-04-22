"use client";
import React, { memo, useCallback, useEffect } from "react";
import { Handle, Position, NodeProps, useUpdateNodeInternals } from "@xyflow/react";
import { Crop, Trash2, Play, Loader2 } from "lucide-react";
import { CropImageNodeData } from "@/types/workflow";
import { useWorkflowStore } from "@/store/workflowStore";

const CropImageNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as CropImageNodeData;
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
    const imageUrl = nodeData.imageUrl;
    if (!imageUrl) { updateNodeData(id, { error: "Connect an image source or the image_url handle", isLoading: false }); return; }
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

  const handles: Array<{ id: string; label: string; top: number }> = [
    { id: "target-image_url", label: "image_url*", top: 56 },
    { id: "target-x_percent", label: "x_percent", top: 84 },
    { id: "target-y_percent", label: "y_percent", top: 112 },
    { id: "target-width_percent", label: "width_%", top: 140 },
    { id: "target-height_percent", label: "height_%", top: 168 },
  ];

  return (
    <div className={`node-card${selected ? " node-selected" : ""}${nodeData.isExecuting ? " node-executing" : ""}`} style={{ minWidth: 300 }}>
      {/* Input handles */}
      {handles.map((h) => (
        <div key={h.id}>
          <Handle type="target" position={Position.Left} id={h.id}
            className={`node-handle ${h.id === "target-image_url" ? "node-handle-image" : "node-handle-text"}${isConnected(h.id) ? " node-handle-connected" : ""}`}
            style={{ top: h.top }}
            onDoubleClick={(e) => onDoubleClickHandle(e, h.id)}
          />
          <span className="node-handle-label-left absolute text-[10px]" style={{ top: h.top - 6, left: -72 }}>{h.label}</span>
        </div>
      ))}

      {/* Output handle */}
      <Handle type="source" position={Position.Right} id="source-image"
        className="node-handle node-handle-image"
        style={{ top: 90 }}
      />
      <span className="node-handle-label-right absolute text-[10px]" style={{ top: 84, right: -36 }}>image</span>

      {/* Header */}
      <div className="node-header">
        <div className="node-header-left">
          <div className="node-icon node-icon-crop"><Crop className="w-3 h-3" /></div>
          <span className="node-title">{nodeData.label || "Crop Image"}</span>
        </div>
        <button onClick={() => deleteNode(id)} className="node-delete-btn"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>

      <div className="node-body space-y-2">
        {/* Image URL if not connected */}
        {!isConnected("target-image_url") && (
          <div>
            <label className="node-field-label">Image URL</label>
            <input type="text" value={nodeData.imageUrl ?? ""} onChange={(e) => updateNodeData(id, { imageUrl: e.target.value })}
              placeholder="https://..." className="node-input" />
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {[
            { key: "xPercent", handle: "target-x_percent", label: "X %" },
            { key: "yPercent", handle: "target-y_percent", label: "Y %" },
            { key: "widthPercent", handle: "target-width_percent", label: "W %" },
            { key: "heightPercent", handle: "target-height_percent", label: "H %" },
          ].map(({ key, handle, label }) => (
            <div key={key}>
              <label className="node-field-label">{label}</label>
              <input type="number" min="0" max="100"
                value={nodeData[key as keyof CropImageNodeData] as number ?? 0}
                disabled={isConnected(handle)}
                onChange={(e) => updateNodeData(id, { [key]: parseFloat(e.target.value) || 0 })}
                className={`node-input${isConnected(handle) ? " opacity-40 cursor-not-allowed" : ""}`}
              />
            </div>
          ))}
        </div>

        {/* Output preview */}
        {nodeData.outputUrl && (
          <div>
            <label className="node-field-label">Output</label>
            <img src={nodeData.outputUrl} alt="cropped" className="w-full h-28 object-cover rounded-lg border border-[#2a2a2a]" />
          </div>
        )}
        {nodeData.error && <p className="text-xs text-red-400">{nodeData.error}</p>}
      </div>

      <div className="node-footer">
        <button onClick={handleRun} disabled={nodeData.isLoading} className="node-run-btn">
          {nodeData.isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          <span>Run Crop</span>
        </button>
      </div>
    </div>
  );
});

CropImageNode.displayName = "CropImageNode";
export default CropImageNode;