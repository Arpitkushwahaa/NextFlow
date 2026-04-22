"use client";
import React, { useEffect } from "react";
import { useParams } from "next/navigation";
import WorkflowBuilder from "@/components/WorkflowBuilder";
import { useWorkflowStore } from "@/store/workflowStore";

export default function WorkflowPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { setWorkflowId, loadWorkflow, saveWorkflowLocal, workflowId } = useWorkflowStore();

  useEffect(() => {
    if (!id) return;
    setWorkflowId(id);
    loadWorkflow(id);
  }, [id, setWorkflowId, loadWorkflow]);

  // Auto-save every 30s
  useEffect(() => {
    if (!workflowId) return;
    const interval = setInterval(() => saveWorkflowLocal(), 30000);
    return () => clearInterval(interval);
  }, [workflowId, saveWorkflowLocal]);

  return (
    <div style={{ height: "100vh", width: "100vw", overflow: "hidden" }}>
      <WorkflowBuilder />
    </div>
  );
}