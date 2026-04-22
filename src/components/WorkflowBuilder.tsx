"use client";
import React, { useCallback } from "react";
import { ReactFlowProvider, useReactFlow } from "@xyflow/react";
import Sidebar, { NodeTypeKey } from "@/components/Sidebar";
import Canvas from "@/components/Canvas";
import HistoryPanel from "@/components/HistoryPanel";
import { useWorkflowStore } from "@/store/workflowStore";

function WorkflowBuilderInner() {
  const { addNode, isHistoryOpen } = useWorkflowStore();
  const { screenToFlowPosition } = useReactFlow();

  const onDragStart = useCallback((event: React.DragEvent, nodeType: NodeTypeKey) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  }, []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData("application/reactflow") as NodeTypeKey;
    if (!type) return;
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    addNode(type, position);
  }, [addNode, screenToFlowPosition]);

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden">
      {/* Left sidebar */}
      <Sidebar onDragStart={onDragStart} />

      {/* Canvas — full width between sidebars */}
      <div className="flex-1 relative overflow-hidden">
        <Canvas onDragOver={onDragOver} onDrop={onDrop} />
      </div>

      {/* Right history panel */}
      {isHistoryOpen && (
        <div className="history-panel-wrapper">
          <HistoryPanel />
        </div>
      )}
    </div>
  );
}

export default function WorkflowBuilder() {
  return (
    <ReactFlowProvider>
      <WorkflowBuilderInner />
    </ReactFlowProvider>
  );
}