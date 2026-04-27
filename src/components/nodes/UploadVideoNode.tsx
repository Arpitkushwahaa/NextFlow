"use client";
import React, { memo, useCallback, useRef, useState } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Video, Trash2, Upload, Loader2, Link } from "lucide-react";
import { VideoNodeData } from "@/types/workflow";
import { useWorkflowStore } from "@/store/workflowStore";

const UploadVideoNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as VideoNodeData;
  const { updateNodeData, deleteNode } = useWorkflowStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [urlMode, setUrlMode] = useState(false);
  const [urlInput, setUrlInput] = useState("");

  const uploadFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("video/")) {
      setUploadError("Please upload a video file (mp4, mov, webm)");
      return;
    }
    // Warn about large files — Vercel has a ~4.5 MB request body limit
    if (file.size > 4 * 1024 * 1024) {
      setUploadError("File too large for upload (max ~4 MB). Paste a public video URL instead.");
      return;
    }
    setIsUploading(true);
    setUploadError(null);
    updateNodeData(id, { videoUrl: null });
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const json = await res.json() as { url?: string; error?: string };
      if (json.url) updateNodeData(id, { videoUrl: json.url });
      else setUploadError(json.error ?? "Upload failed");
    } catch {
      setUploadError("Network error during upload");
    } finally {
      setIsUploading(false);
    }
  }, [id, updateNodeData]);

  const onUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  }, [uploadFile]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }, [uploadFile]);

  const applyUrl = useCallback(() => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    updateNodeData(id, { videoUrl: trimmed });
    setUrlInput("");
    setUrlMode(false);
    setUploadError(null);
  }, [id, urlInput, updateNodeData]);

  return (
    <div className={`node-card${selected ? " node-selected" : ""}${nodeData.isExecuting ? " node-executing" : ""}`} style={{ minWidth: 290 }}>
      <div className="node-header">
        <div className="node-header-left">
          <div className="node-icon node-icon-video"><Video className="w-3 h-3" /></div>
          <span className="node-title">{nodeData.label || "Upload Video"}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setUrlMode(!urlMode); setUploadError(null); }}
            className={`node-delete-btn px-1.5 text-[10px] ${urlMode ? "text-[#f59e0b]" : "text-[#555]"}`}
            title="Paste video URL"
          >
            <Link className="w-3 h-3" />
          </button>
          <button onClick={() => deleteNode(id)} className="node-delete-btn"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      <div className="node-body space-y-2">
        {/* URL paste mode */}
        {urlMode && (
          <div className="flex gap-1">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyUrl()}
              placeholder="Paste public video URL..."
              className="node-input flex-1 text-[10px]"
              autoFocus
            />
            <button
              onClick={applyUrl}
              className="px-2 py-1 bg-[#f59e0b]/20 hover:bg-[#f59e0b]/30 text-[#f59e0b] text-[10px] rounded-lg border border-[#f59e0b]/30 shrink-0"
            >
              Use
            </button>
          </div>
        )}

        {isUploading ? (
          <div className="node-upload-zone cursor-default">
            <Loader2 className="w-6 h-6 text-[#f59e0b] animate-spin mb-1" />
            <p className="text-xs text-[#666]">Uploading video...</p>
          </div>
        ) : nodeData.videoUrl ? (
          <div className="relative group">
            <video src={nodeData.videoUrl} controls className="w-full rounded-lg border border-[#2a2a2a] max-h-40 bg-black" />
            <button
              onClick={() => { updateNodeData(id, { videoUrl: null }); setUploadError(null); }}
              className="absolute top-2 right-2 bg-black/70 hover:bg-red-500/80 text-white rounded-lg px-2 py-1 text-xs flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="w-3 h-3" /> Remove
            </button>
          </div>
        ) : (
          <div
            className="node-upload-zone"
            onClick={() => inputRef.current?.click()}
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <Video className="w-6 h-6 text-[#555] mb-1" />
            <p className="text-xs text-[#555]">Click or drag to upload</p>
            <p className="text-[10px] text-[#444] mt-0.5">mp4, mov, webm · max 4 MB</p>
            <p className="text-[9px] text-[#3a3a3a] mt-0.5">For larger videos, use the link icon ↗</p>
          </div>
        )}

        <input ref={inputRef} type="file" accept="video/mp4,video/quicktime,video/webm,video/x-m4v,video/*" className="hidden" onChange={onUpload} />
        {uploadError && <p className="text-[10px] text-red-400 px-1">{uploadError}</p>}
      </div>

      <div className="node-handle-row node-handle-row-right">
        <span className="node-handle-label-right">video</span>
        <Handle type="source" position={Position.Right} id="source-video" className="node-handle node-handle-video" />
      </div>
    </div>
  );
});

UploadVideoNode.displayName = "UploadVideoNode";
export default UploadVideoNode;
