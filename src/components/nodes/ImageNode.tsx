"use client";
import React, { memo, useCallback, useRef } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { ImageIcon, Trash2, Upload } from "lucide-react";
import { ImageNodeData } from "@/types/workflow";
import { useWorkflowStore } from "@/store/workflowStore";

const ImageNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as ImageNodeData;
  const { updateNodeData, deleteNode } = useWorkflowStore();
  const inputRef = useRef<HTMLInputElement>(null);

  const onUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    updateNodeData(id, { imageUrl: null });

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const json = await res.json() as { url?: string; error?: string };
      if (json.url) updateNodeData(id, { imageUrl: json.url });
    } catch { /* silent */ }
  }, [id, updateNodeData]);

  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const fakeEvent = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
    await onUpload(fakeEvent);
  }, [onUpload]);

  return (
    <div className={`node-card${selected ? " node-selected" : ""}${nodeData.isExecuting ? " node-executing" : ""}`} style={{ minWidth: 280 }}>
      <div className="node-header">
        <div className="node-header-left">
          <div className="node-icon node-icon-image"><ImageIcon className="w-3 h-3" /></div>
          <span className="node-title">{nodeData.label || "Upload Image"}</span>
        </div>
        <button onClick={() => deleteNode(id)} className="node-delete-btn"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>

      <div className="node-body">
        {nodeData.imageUrl ? (
          <div className="relative group">
            <img src={nodeData.imageUrl} alt="uploaded" className="w-full h-40 object-cover rounded-lg border border-[#2a2a2a]" />
            <button
              onClick={() => inputRef.current?.click()}
              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-lg transition-opacity"
            >
              <Upload className="w-5 h-5 text-white" />
            </button>
          </div>
        ) : (
          <div
            className="node-upload-zone"
            onClick={() => inputRef.current?.click()}
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <Upload className="w-6 h-6 text-[#555] mb-1" />
            <p className="text-xs text-[#555]">Click or drag to upload</p>
            <p className="text-[10px] text-[#444] mt-0.5">jpg, jpeg, png, webp, gif</p>
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp,image/gif" className="hidden" onChange={onUpload} />
      </div>

      <div className="node-handle-row node-handle-row-right">
        <span className="node-handle-label-right">image</span>
        <Handle type="source" position={Position.Right} id="source-image" className="node-handle node-handle-image" />
      </div>
    </div>
  );
});

ImageNode.displayName = "ImageNode";
export default ImageNode;