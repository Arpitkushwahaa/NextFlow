"use client";
import React, { memo, useCallback, useEffect } from "react";
import { Handle, Position, NodeProps, useUpdateNodeInternals } from "@xyflow/react";
import { Crop, Trash2, Play, Loader2 } from "lucide-react";
import { CropImageNodeData } from "@/types/workflow";
import { useWorkflowStore } from "@/store/workflowStore";

// Client-side canvas crop — no Transloadit needed
async function cropImageOnCanvas(
  imageUrl: string,
  xPct: number,
  yPct: number,
  wPct: number,
  hPct: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    const draw = () => {
      const sw = Math.max(1, (wPct / 100) * img.naturalWidth);
      const sh = Math.max(1, (hPct / 100) * img.naturalHeight);
      const sx = (xPct / 100) * img.naturalWidth;
      const sy = (yPct / 100) * img.naturalHeight;
      const canvas = document.createElement("canvas");
      canvas.width = sw;
      canvas.height = sh;
      canvas.getContext("2d")!.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      try {
        resolve(canvas.toDataURL("image/jpeg", 0.92));
      } catch {
        // Canvas tainted by cross-origin — return original
        resolve(imageUrl);
      }
    };

    img.onload = draw;
    img.onerror = () => {
      // Retry without crossOrigin for same-origin / data URLs
      const img2 = new Image();
      img2.onload = () => { img.naturalWidth; Object.assign(img, img2); draw(); };
      img2.onerror = () => reject(new Error("Failed to load image"));
      img2.src = imageUrl;
    };
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
  });
}

const CropImageNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as CropImageNodeData;
  const { updateNodeData, deleteNode, deleteEdgeByHandle, edges, nodes, setNodeExecuting } = useWorkflowStore();
  const updateNodeInternals = useUpdateNodeInternals();

  useEffect(() => { updateNodeInternals(id); }, [id, updateNodeInternals]);

  const connectedTargets = edges.filter((e) => e.target === id).map((e) => e.targetHandle ?? "");
  const isConnected = (h: string) => connectedTargets.includes(h);

  const onDoubleClickHandle = useCallback((e: React.MouseEvent, hid: string) => {
    e.stopPropagation(); e.preventDefault();
    deleteEdgeByHandle(id, hid, "target");
  }, [id, deleteEdgeByHandle]);

  // Resolve the actual image URL from connected node or manual input
  const resolveImageUrl = useCallback((): string => {
    const edge = edges.find((e) => e.target === id && e.targetHandle === "target-image_url");
    if (edge) {
      const src = nodes.find((n) => n.id === edge.source);
      if (src) {
        const d = src.data as Record<string, unknown>;
        return ((d.outputUrl ?? d.imageUrl ?? "") as string);
      }
    }
    return nodeData.imageUrl ?? "";
  }, [id, edges, nodes, nodeData.imageUrl]);

  const handleRun = useCallback(async () => {
    const imageUrl = resolveImageUrl();
    if (!imageUrl) {
      updateNodeData(id, { error: "Connect an image node or enter an image URL", isLoading: false });
      return;
    }

    updateNodeData(id, { isLoading: true, error: null, outputUrl: null });
    setNodeExecuting(id, true);

    try {
      const x = nodeData.xPercent ?? 0;
      const y = nodeData.yPercent ?? 0;
      const w = nodeData.widthPercent ?? 80;
      const h = nodeData.heightPercent ?? 80;

      const cropped = await cropImageOnCanvas(imageUrl, x, y, w, h);
      updateNodeData(id, { outputUrl: cropped, isLoading: false, error: null });
    } catch (err) {
      updateNodeData(id, { error: err instanceof Error ? err.message : "Crop failed", isLoading: false });
    } finally {
      setNodeExecuting(id, false);
    }
  }, [id, nodeData, resolveImageUrl, updateNodeData, setNodeExecuting]);

  const handles: Array<{ id: string; label: string; top: number }> = [
    { id: "target-image_url", label: "image_url*", top: 56 },
    { id: "target-x_percent", label: "x %", top: 84 },
    { id: "target-y_percent", label: "y %", top: 112 },
    { id: "target-width_percent", label: "w %", top: 140 },
    { id: "target-height_percent", label: "h %", top: 168 },
  ];

  return (
    <div className={`node-card${selected ? " node-selected" : ""}${nodeData.isExecuting ? " node-executing" : ""}`} style={{ minWidth: 300 }}>
      {handles.map((h) => (
        <div key={h.id}>
          <Handle type="target" position={Position.Left} id={h.id}
            className={`node-handle ${h.id === "target-image_url" ? "node-handle-image" : "node-handle-text"}${isConnected(h.id) ? " node-handle-connected" : ""}`}
            style={{ top: h.top }}
            onDoubleClick={(e) => onDoubleClickHandle(e, h.id)}
          />
          <span className="node-handle-label-left absolute text-[10px]" style={{ top: h.top - 6, left: -52 }}>{h.label}</span>
        </div>
      ))}

      <Handle type="source" position={Position.Right} id="source-image"
        className="node-handle node-handle-image" style={{ top: 90 }} />
      <span className="node-handle-label-right absolute text-[10px]" style={{ top: 84, right: -36 }}>image</span>

      <div className="node-header">
        <div className="node-header-left">
          <div className="node-icon node-icon-crop"><Crop className="w-3 h-3" /></div>
          <span className="node-title">{nodeData.label || "Crop Image"}</span>
        </div>
        <button onClick={() => deleteNode(id)} className="node-delete-btn"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>

      <div className="node-body space-y-2">
        {!isConnected("target-image_url") && (
          <div>
            <label className="node-field-label">Image URL</label>
            <input type="text" value={nodeData.imageUrl ?? ""} onChange={(e) => updateNodeData(id, { imageUrl: e.target.value })}
              placeholder="https://... or connect an image node" className="node-input" />
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

        {nodeData.outputUrl && (
          <div>
            <label className="node-field-label">Cropped Output</label>
            <img src={nodeData.outputUrl} alt="cropped" className="w-full h-28 object-cover rounded-lg border border-[#2a2a2a]" />
          </div>
        )}
        {nodeData.error && <p className="text-xs text-red-400 mt-1">{nodeData.error}</p>}
      </div>

      <div className="node-footer">
        <button onClick={handleRun} disabled={nodeData.isLoading} className="node-run-btn">
          {nodeData.isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          <span>Crop</span>
        </button>
      </div>
    </div>
  );
});

CropImageNode.displayName = "CropImageNode";
export default CropImageNode;
