"use client";
import React, { memo, useCallback, useEffect } from "react";
import { Handle, Position, NodeProps, useUpdateNodeInternals } from "@xyflow/react";
import { Brain, Trash2, Play, Loader2, ChevronDown } from "lucide-react";
import { LLMNodeData, GEMINI_MODELS } from "@/types/workflow";
import { useWorkflowStore } from "@/store/workflowStore";

const LLMNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as LLMNodeData;
  const { updateNodeData, deleteNode, deleteEdgeByHandle, nodes, edges, setNodeExecuting } = useWorkflowStore();
  const updateNodeInternals = useUpdateNodeInternals();

  useEffect(() => { updateNodeInternals(id); }, [id, updateNodeInternals]);

  const connectedTargets = edges.filter((e) => e.target === id).map((e) => e.targetHandle ?? "");
  const connectedSources = edges.filter((e) => e.source === id).map((e) => e.sourceHandle ?? "");

  const isConnected = (h: string) => connectedTargets.includes(h);
  const isSourceConnected = (h: string) => connectedSources.includes(h);

  const onDoubleClickHandle = useCallback((e: React.MouseEvent, hid: string, htype: "source" | "target") => {
    e.stopPropagation(); e.preventDefault();
    deleteEdgeByHandle(id, hid, htype);
  }, [id, deleteEdgeByHandle]);

  const collectInputs = useCallback(async () => {
    const incomingEdges = edges.filter((e) => e.target === id);
    const inputs: Record<string, string> = {};
    for (const edge of incomingEdges) {
      const srcNode = nodes.find((n) => n.id === edge.source);
      if (!srcNode) continue;
      const th = edge.targetHandle ?? "";
      const sh = edge.sourceHandle ?? "";
      if (srcNode.type === "textNode") {
        inputs[th] = (srcNode.data as { content: string }).content ?? "";
      } else if (srcNode.type === "imageNode") {
        inputs[th] = (srcNode.data as { imageUrl: string | null }).imageUrl ?? "";
      } else if (srcNode.type === "cropImageNode" || srcNode.type === "extractFrameNode") {
        inputs[th] = (srcNode.data as { outputUrl: string | null }).outputUrl ?? "";
      } else if (srcNode.type === "llmNode" && sh === "source-text") {
        inputs[th] = (srcNode.data as LLMNodeData).response ?? "";
      }
    }
    return inputs;
  }, [id, nodes, edges]);

  const handleRun = useCallback(async () => {
    updateNodeData(id, { isLoading: true, error: null, response: null });
    setNodeExecuting(id, true);

    try {
      const inputs = await collectInputs();
      const userMessage = inputs["target-user_message"] || nodeData.userMessage || nodeData.userPrompt || "";
      const hasImages = Object.keys(inputs).some((k) => k.startsWith("target-images-") && inputs[k]);

      if (!userMessage && !hasImages) {
        updateNodeData(id, { error: "Connect a Text node to user_message or enter a message below", isLoading: false });
        setNodeExecuting(id, false);
        return;
      }

      // Save workflow to DB first so the API has the latest node data
      await useWorkflowStore.getState().saveWorkflow();
      const workflowId = useWorkflowStore.getState().workflowId;

      if (!workflowId || workflowId.startsWith("workflow_") || workflowId.startsWith("sample_")) {
        updateNodeData(id, { error: "Could not save workflow. Please try again.", isLoading: false });
        setNodeExecuting(id, false);
        return;
      }

      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId, scope: "SINGLE", nodeIds: [id] }),
      });

      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? "Run failed");
      }

      const runResult = await res.json() as { run: { nodeRuns: Array<{ nodeId: string; outputs: { text?: string }; status: string; error?: string }> }; outputs?: Record<string, { text?: string }> };
      const nodeRun = runResult.run?.nodeRuns?.find((nr) => nr.nodeId === id);
      const outputText = nodeRun?.outputs?.text ?? runResult.outputs?.[id]?.text ?? "";
      const nodeError = nodeRun?.error;

      if (nodeRun?.status === "FAILED") {
        updateNodeData(id, { error: nodeError ?? "Execution failed", isLoading: false });
      } else {
        updateNodeData(id, { response: outputText || null, isLoading: false, error: null });
      }

      const { fetchRuns } = useWorkflowStore.getState();
      fetchRuns();
    } catch (err) {
      updateNodeData(id, { error: err instanceof Error ? err.message : "An error occurred", isLoading: false });
    } finally {
      setNodeExecuting(id, false);
    }
  }, [id, nodeData, updateNodeData, collectInputs, setNodeExecuting]);

  const imageHandles = [0, 1, 2];
  const handleBase = 120;
  const handleSpacing = 28;

  return (
    <div className={`node-card${selected ? " node-selected" : ""}${nodeData.isExecuting ? " node-executing" : ""}`} style={{ minWidth: 320 }}>
      {/* Input handles */}
      <div className="node-handle-row node-handle-row-left" style={{ top: 56 }}>
        <Handle type="target" position={Position.Left} id="target-system_prompt"
          className={`node-handle node-handle-text${isConnected("target-system_prompt") ? " node-handle-connected" : ""}`}
          style={{ top: 56 }}
          onDoubleClick={(e) => onDoubleClickHandle(e, "target-system_prompt", "target")}
        />
        <span className="node-handle-label-left">system_prompt</span>
      </div>

      <div className="node-handle-row node-handle-row-left" style={{ top: 86 }}>
        <Handle type="target" position={Position.Left} id="target-user_message"
          className={`node-handle node-handle-text${isConnected("target-user_message") ? " node-handle-connected" : ""}`}
          style={{ top: 86 }}
          onDoubleClick={(e) => onDoubleClickHandle(e, "target-user_message", "target")}
        />
        <span className="node-handle-label-left">user_message*</span>
      </div>

      {imageHandles.map((i) => {
        const hid = `target-images-${i}`;
        const top = handleBase + i * handleSpacing;
        return (
          <div key={hid} className="node-handle-row node-handle-row-left" style={{ top }}>
            <Handle type="target" position={Position.Left} id={hid}
              className={`node-handle node-handle-image${isConnected(hid) ? " node-handle-connected" : ""}`}
              style={{ top }}
              onDoubleClick={(e) => onDoubleClickHandle(e, hid, "target")}
            />
            <span className="node-handle-label-left">image {i + 1}</span>
          </div>
        );
      })}

      {/* Output handle */}
      <div className="node-handle-row node-handle-row-right" style={{ top: 70 }}>
        <span className="node-handle-label-right">output</span>
        <Handle type="source" position={Position.Right} id="source-text"
          className={`node-handle node-handle-text${isSourceConnected("source-text") ? " node-handle-connected" : ""}`}
          style={{ top: 70 }}
          onDoubleClick={(e) => onDoubleClickHandle(e, "source-text", "source")}
        />
      </div>

      {/* Header */}
      <div className="node-header">
        <div className="node-header-left">
          <div className="node-icon node-icon-llm"><Brain className="w-3 h-3" /></div>
          <span className="node-title">{nodeData.label || "Run LLM"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <select
              value={nodeData.model || "gemini-1.5-flash"}
              onChange={(e) => updateNodeData(id, { model: e.target.value })}
              className="node-select pr-5"
            >
              {GEMINI_MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-[#666] pointer-events-none" />
          </div>
          <button onClick={() => deleteNode(id)} className="node-delete-btn"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {/* System prompt input if not connected */}
      {!isConnected("target-system_prompt") && (
        <div className="px-3 pt-2">
          <textarea
            value={nodeData.systemPrompt || ""}
            onChange={(e) => updateNodeData(id, { systemPrompt: e.target.value })}
            placeholder="System instructions (optional)..."
            className="node-textarea"
            rows={2}
          />
        </div>
      )}

      {/* User message if not connected */}
      {!isConnected("target-user_message") && (
        <div className="px-3 pt-2">
          <textarea
            value={(nodeData.userMessage || nodeData.userPrompt) ?? ""}
            onChange={(e) => updateNodeData(id, { userMessage: e.target.value })}
            placeholder="User message (required)..."
            className="node-textarea"
            rows={3}
          />
        </div>
      )}

      {/* Response area */}
      <div className="node-body">
        <div className="node-output-area">
          {nodeData.isLoading ? (
            <div className="flex items-center gap-2 justify-center h-16">
              <Loader2 className="w-4 h-4 text-[#7c3aed] animate-spin" />
              <span className="text-xs text-[#666]">Generating...</span>
            </div>
          ) : nodeData.error ? (
            <p className="text-xs text-red-400 whitespace-pre-wrap">{nodeData.error}</p>
          ) : nodeData.response ? (
            <p className="text-xs text-[#ccc] whitespace-pre-wrap leading-relaxed">{nodeData.response}</p>
          ) : (
            <p className="text-xs text-[#444]">Response will appear here</p>
          )}
        </div>
      </div>

      {/* Run button */}
      <div className="node-footer">
        <button onClick={handleRun} disabled={nodeData.isLoading} className="node-run-btn">
          {nodeData.isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          <span>Run Node</span>
        </button>
      </div>
    </div>
  );
});

LLMNode.displayName = "LLMNode";
export default LLMNode;