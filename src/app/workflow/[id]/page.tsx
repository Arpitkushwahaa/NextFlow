"use client";
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import WorkflowBuilder from "@/components/WorkflowBuilder";
import { useWorkflowStore } from "@/store/workflowStore";

export default function WorkflowPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const { setWorkflowId, loadWorkflow, saveWorkflowLocal, workflowId } = useWorkflowStore();

  // Redirect unauthenticated users — handles Back button after sign-out
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/login");
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (!id) return;
    setWorkflowId(id);
    loadWorkflow(id);
  }, [id, setWorkflowId, loadWorkflow]);

  // Auto-save locally every 30 s
  useEffect(() => {
    if (!workflowId) return;
    const interval = setInterval(() => saveWorkflowLocal(), 30_000);
    return () => clearInterval(interval);
  }, [workflowId, saveWorkflowLocal]);

  // Don't render the builder until auth is confirmed
  if (!isLoaded || !isSignedIn) return null;

  return (
    <div style={{ height: "100vh", width: "100vw", overflow: "hidden" }}>
      <WorkflowBuilder />
    </div>
  );
}
