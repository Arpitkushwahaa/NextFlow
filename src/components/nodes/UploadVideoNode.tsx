"use client";
import React, { memo, useCallback, useRef, useState } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Video, Trash2, Upload, Loader2 } from "lucide-react";
import { VideoNodeData } from "@/types/workflow";
import { useWorkflowStore } from "@/store/workflowStore";

const UploadVideoNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as VideoNodeData;
  const { updateNodeData, deleteNode } = useWorkflowStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("video/")) return;
    setIsUploading(true);
    updateNodeData(id, { videoUrl: null });
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const json = await res.json() as { url?: string; error?: string };
      if (json.url) updateNodeData(id, { videoUrl: json.url });
      else updateNodeData(id, { videoUrl: null });
    } catch {
      updateNodeData(id, { videoUrl: null });
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

  return (
    <div className={`node-card${selected ? " node-selected" : ""}${nodeData.isExecuting ? " node-executing" : ""}`} style={{ minWidth: 280 }}>
      <div className="node-header">
        <div className="node-header-left">
          <div className="node-icon node-icon-video"><Video className="w-3 h-3" /></div>
          <span className="node-title">{nodeData.label || "Upload Video"}</span>
        </div>
        <button onClick={() => deleteNode(id)} className="node-delete-btn"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>

      <div className="node-body">
        {isUploading ? (
          <div className="node-upload-zone cursor-default">
            <Loader2 className="w-6 h-6 text-[#f59e0b] animate-spin mb-1" />
            <p className="text-xs text-[#666]">Uploading video...</p>
            <p className="text-[10px] text-[#444] mt-0.5">This may take a moment</p>
          </div>
        ) : nodeData.videoUrl ? (
          <div className="relative group">
            <video src={nodeData.videoUrl} controls className="w-full rounded-lg border border-[#2a2a2a] max-h-40 bg-black" />
            <button
              onClick={() => inputRef.current?.click()}
              className="absolute top-2 right-2 bg-black/70 hover:bg-black/90 text-white rounded-lg px-2 py-1 text-xs flex items-center gap-1"
            >
              <Upload className="w-3 h-3" /> Replace
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
            <p className="text-[10px] text-[#444] mt-0.5">mp4, mov, webm, m4v</p>
          </div>
        )}
        <input ref={inputRef} type="file" accept="video/mp4,video/quicktime,video/webm,video/x-m4v,video/*" className="hidden" onChange={onUpload} />
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
