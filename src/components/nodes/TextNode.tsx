"use client";
import React, { memo, useCallback } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Type, Trash2 } from "lucide-react";
import { TextNodeData } from "@/types/workflow";
import { useWorkflowStore } from "@/store/workflowStore";

const TextNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as TextNodeData;
  const { updateNodeData, deleteNode } = useWorkflowStore();

  const onChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateNodeData(id, { content: e.target.value });
  }, [id, updateNodeData]);

  const onLabelChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateNodeData(id, { label: e.target.value });
  }, [id, updateNodeData]);

  return (
    <div className={`node-card${selected ? " node-selected" : ""}${nodeData.isExecuting ? " node-executing" : ""}`} style={{ minWidth: 280 }}>
      {/* Header */}
      <div className="node-header">
        <div className="node-header-left">
          <div className="node-icon node-icon-text"><Type className="w-3 h-3" /></div>
          <input
            type="text"
            value={nodeData.label}
            onChange={onLabelChange}
            className="node-label-input"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        <button onClick={() => deleteNode(id)} className="node-delete-btn">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="node-body">
        <textarea
          value={nodeData.content}
          onChange={onChange}
          placeholder="Enter text content..."
          className="node-textarea"
          rows={5}
        />
      </div>

      {/* Output Handle */}
      <div className="node-handle-row node-handle-row-right">
        <span className="node-handle-label-right">text</span>
        <Handle type="source" position={Position.Right} id="source-text" className="node-handle node-handle-text" />
      </div>
    </div>
  );
});

TextNode.displayName = "TextNode";
export default TextNode;