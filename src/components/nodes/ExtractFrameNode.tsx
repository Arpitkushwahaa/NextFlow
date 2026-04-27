"use client";
import { memo, useCallback, useEffect } from "react";
import { Handle, Position, NodeProps, useUpdateNodeInternals } from "@xyflow/react";
import { Film, Trash2, Play, Loader2 } from "lucide-react";
import { ExtractFrameNodeData } from "@/types/workflow";
import { useWorkflowStore } from "@/store/workflowStore";

// Client-side video frame extraction using HTML5 video + canvas
function extractFrameFromVideo(videoUrl: string, timestamp: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;

    let seeked = false;

    const doSeek = () => {
      if (seeked) return;
      let t = 0;
      if (timestamp.trim().endsWith("%")) {
        t = (parseFloat(timestamp) / 100) * (video.duration || 0);
      } else {
        t = parseFloat(timestamp) || 0;
      }
      video.currentTime = Math.min(Math.max(t, 0), video.duration || 0);
    };

    video.onseeked = () => {
      seeked = true;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;
        canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.88));
      } catch (e) {
        reject(new Error("Could not capture frame — video may be cross-origin"));
      } finally {
        video.src = "";
      }
    };

    video.onloadedmetadata = doSeek;
    video.onloadeddata = doSeek;
    video.onerror = () => reject(new Error("Failed to load video. Check the URL or try a smaller file."));

    // Timeout fallback
    const timeout = setTimeout(() => {
      if (!seeked) reject(new Error("Frame extraction timed out"));
    }, 15000);

    video.onseeked = () => {
      clearTimeout(timeout);
      seeked = true;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;
        canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.88));
      } catch {
        resolve(""); // Canvas tainted — return empty
      } finally {
        video.src = "";
      }
    };

    video.src = videoUrl;
    video.load();
  });
}

const ExtractFrameNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as ExtractFrameNodeData;
  const { updateNodeData, deleteNode, deleteEdgeByHandle, edges, nodes, setNodeExecuting } = useWorkflowStore();
  const updateNodeInternals = useUpdateNodeInternals();

  useEffect(() => { updateNodeInternals(id); }, [id, updateNodeInternals]);

  const connectedTargets = edges.filter((e) => e.target === id).map((e) => e.targetHandle ?? "");
  const isConnected = (h: string) => connectedTargets.includes(h);

  // Resolve video URL from connected node or manual input
  const resolveVideoUrl = useCallback((): string => {
    const edge = edges.find((e) => e.target === id && e.targetHandle === "target-video_url");
    if (edge) {
      const src = nodes.find((n) => n.id === edge.source);
      if (src) return ((src.data as Record<string, unknown>).videoUrl ?? "") as string;
    }
    return nodeData.videoUrl ?? "";
  }, [id, edges, nodes, nodeData.videoUrl]);

  const handleRun = useCallback(async () => {
    const videoUrl = resolveVideoUrl();
    if (!videoUrl) {
      updateNodeData(id, { error: "Connect a video node or enter a video URL below", isLoading: false });
      return;
    }

    updateNodeData(id, { isLoading: true, error: null, outputUrl: null });
    setNodeExecuting(id, true);

    try {
      const timestamp = nodeData.timestamp || "50%";
      const frameUrl = await extractFrameFromVideo(videoUrl, timestamp);
      if (frameUrl) {
        updateNodeData(id, { outputUrl: frameUrl, isLoading: false, error: null });
      } else {
        updateNodeData(id, { error: "Could not capture frame from this video", isLoading: false });
      }
    } catch (err) {
      updateNodeData(id, { error: err instanceof Error ? err.message : "Frame extraction failed", isLoading: false });
    } finally {
      setNodeExecuting(id, false);
    }
  }, [id, nodeData.timestamp, resolveVideoUrl, updateNodeData, setNodeExecuting]);

  return (
    <div className={`node-card${selected ? " node-selected" : ""}${nodeData.isExecuting ? " node-executing" : ""}`} style={{ minWidth: 300 }}>
      <Handle type="target" position={Position.Left} id="target-video_url"
        className={`node-handle node-handle-video${isConnected("target-video_url") ? " node-handle-connected" : ""}`}
        style={{ top: 56 }}
        onDoubleClick={(e) => { e.stopPropagation(); deleteEdgeByHandle(id, "target-video_url", "target"); }}
      />
      <span className="node-handle-label-left absolute text-[10px]" style={{ top: 50, left: -60 }}>video_url</span>

      <Handle type="target" position={Position.Left} id="target-timestamp"
        className={`node-handle node-handle-text${isConnected("target-timestamp") ? " node-handle-connected" : ""}`}
        style={{ top: 84 }}
        onDoubleClick={(e) => { e.stopPropagation(); deleteEdgeByHandle(id, "target-timestamp", "target"); }}
      />
      <span className="node-handle-label-left absolute text-[10px]" style={{ top: 78, left: -64 }}>timestamp</span>

      <Handle type="source" position={Position.Right} id="source-image"
        className="node-handle node-handle-image" style={{ top: 70 }} />
      <span className="node-handle-label-right absolute text-[10px]" style={{ top: 64, right: -36 }}>image</span>

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
              placeholder="https://... or connect a video node" className="node-input" />
          </div>
        )}

        <div>
          <label className="node-field-label">Timestamp (e.g. 5 or 50%)</label>
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
        {nodeData.error && <p className="text-xs text-red-400 mt-1">{nodeData.error}</p>}
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
