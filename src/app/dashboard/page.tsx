"use client";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface WorkflowRecord {
  id: string;
  title: string;
  nodes: unknown[];
  updatedAt: string;
}

function computeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Dashboard() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [workflows, setWorkflows] = useState<WorkflowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [greeting, setGreeting] = useState("Welcome");

  useEffect(() => { setGreeting(computeGreeting()); }, []);

  // Client-side guard: redirect if session expired or user presses Back after sign-out
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/login");
    }
  }, [isLoaded, isSignedIn, router]);

  const handleSignOut = useCallback(async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      router.replace("/");
    } catch {
      setSigningOut(false);
    }
  }, [signOut, router, signingOut]);

  useEffect(() => {
    fetch("/api/workflows")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setWorkflows(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleNewWorkflow = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled Workflow", nodes: [], edges: [] }),
      });
      const data = await res.json();
      if (data?.id) router.push(`/workflow/${data.id}`);
      else setCreating(false);
    } catch {
      setCreating(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    await fetch(`/api/workflows/${id}`, { method: "DELETE" });
    setWorkflows((prev) => prev.filter((w) => w.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <header className="border-b border-[#1f1f1f] px-8 py-4 flex items-center justify-between shrink-0">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <span className="text-black font-bold text-sm">N</span>
          </div>
          <span className="font-semibold text-white tracking-wide">NextFlow</span>
        </Link>
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2.5">
            {user?.imageUrl ? (
              <img src={user.imageUrl} alt="avatar" className="w-8 h-8 rounded-full object-cover ring-2 ring-[#2a2a2a]" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#2a2a2a] flex items-center justify-center text-sm font-semibold">
                {user?.firstName?.[0]}
              </div>
            )}
            <span className="text-sm text-white/60 hidden sm:block">{user?.firstName} {user?.lastName}</span>
          </div>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="text-xs font-medium text-white bg-[#1f1f1f] hover:bg-red-500/15 hover:text-red-400 border border-[#2a2a2a] hover:border-red-500/30 transition-all rounded-lg px-4 py-2 disabled:opacity-50 disabled:cursor-wait flex items-center gap-1.5"
          >
            {signingOut ? (
              <><span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin inline-block" /> Signing out...</>
            ) : "Sign out"}
          </button>
        </div>
      </header>

      <main className="flex-1 px-8 py-10 max-w-6xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-2xl font-semibold text-white">{greeting}, {user?.firstName} 👋</h1>
            <p className="text-white/40 text-sm mt-1">Build and run your AI workflows</p>
          </div>
          <button
            onClick={handleNewWorkflow}
            disabled={creating}
            className="flex items-center gap-2 bg-[#e2ff66] hover:bg-[#d4f055] disabled:opacity-60 text-black font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {creating ? "Creating..." : "New Workflow"}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          </div>
        ) : workflows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#141414] border border-[#2a2a2a] flex items-center justify-center mb-5">
              <svg className="w-7 h-7 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />
              </svg>
            </div>
            <p className="text-white/30 text-lg font-medium mb-2">No workflows yet</p>
            <p className="text-white/20 text-sm mb-6">Create your first workflow to get started</p>
            <button onClick={handleNewWorkflow} disabled={creating} className="bg-[#e2ff66] hover:bg-[#d4f055] disabled:opacity-60 text-black font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors">
              {creating ? "Creating..." : "Create Workflow"}
            </button>
          </div>
        ) : (
          <>
            <p className="text-white/30 text-xs uppercase tracking-widest mb-4">Your Workflows ({workflows.length})</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {workflows.map((wf) => (
                <Link key={wf.id} href={`/workflow/${wf.id}`} className="group relative bg-[#111] hover:bg-[#161616] border border-[#1f1f1f] hover:border-[#2a2a2a] rounded-2xl p-5 transition-all duration-200 cursor-pointer block">
                  <div className="w-full h-28 rounded-xl bg-[#0a0a0a] border border-[#1f1f1f] mb-4 flex items-center justify-center overflow-hidden">
                    <div className="flex items-center gap-2 opacity-20">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="w-8 h-8 rounded-lg bg-white/10" style={{ transform: `translateY(${i % 2 === 0 ? 4 : -4}px)` }} />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-white truncate">{wf.title || "Untitled Workflow"}</h3>
                      <p className="text-xs text-white/30 mt-0.5">
                        {(wf.nodes as unknown[])?.length ?? 0} node{(wf.nodes as unknown[])?.length !== 1 ? "s" : ""} · {timeAgo(wf.updatedAt)}
                      </p>
                    </div>
                    <button onClick={(e) => handleDelete(e, wf.id)} className="opacity-0 group-hover:opacity-100 shrink-0 w-7 h-7 rounded-lg bg-[#1f1f1f] hover:bg-red-500/20 hover:text-red-400 text-white/30 flex items-center justify-center transition-all">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </Link>
              ))}
              <button onClick={handleNewWorkflow} disabled={creating} className="bg-[#111] hover:bg-[#161616] border border-dashed border-[#2a2a2a] hover:border-[#3a3a3a] rounded-2xl p-5 transition-all flex flex-col items-center justify-center gap-2 h-full min-h-[172px] text-white/30 hover:text-white/50 disabled:opacity-50">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-xs font-medium">New Workflow</span>
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}