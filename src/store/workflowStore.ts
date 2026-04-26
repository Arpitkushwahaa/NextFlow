import { create } from "zustand";
import { Node, Edge, addEdge, Connection, applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange } from "@xyflow/react";
import { WorkflowNode, TextNodeData, ImageNodeData, VideoNodeData, LLMNodeData, CropImageNodeData, ExtractFrameNodeData, Workflow, SOURCE_HANDLE_TYPES, TARGET_HANDLE_ACCEPTS } from "@/types/workflow";

interface HistoryState { nodes: WorkflowNode[]; edges: Edge[] }

export interface WorkflowRunEntry {
  id: string;
  workflowId: string;
  status: "RUNNING" | "SUCCESS" | "FAILED" | "PARTIAL";
  duration?: number;
  scope: "FULL" | "PARTIAL" | "SINGLE";
  nodeRuns: NodeRunEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface NodeRunEntry {
  id: string;
  workflowRunId: string;
  nodeId: string;
  nodeLabel: string;
  status: "RUNNING" | "SUCCESS" | "FAILED";
  duration?: number;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

interface WorkflowState {
  workflowId: string;
  workflowName: string;
  nodes: WorkflowNode[];
  edges: Edge[];
  history: HistoryState[];
  historyIndex: number;
  runs: WorkflowRunEntry[];
  isHistoryOpen: boolean;
  isSidebarOpen: boolean;

  setNodes: (nodes: WorkflowNode[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: (changes: NodeChange<WorkflowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (type: string, position: { x: number; y: number }) => void;
  updateNodeData: (nodeId: string, data: Partial<Record<string, unknown>>) => void;
  deleteNode: (nodeId: string) => void;
  deleteEdgeByHandle: (nodeId: string, handleId: string, handleType: "source" | "target") => void;
  setNodeExecuting: (nodeId: string, isExecuting: boolean) => void;

  saveHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  setWorkflowId: (id: string) => void;
  setWorkflowName: (name: string) => void;
  saveWorkflow: () => Promise<void>;
  loadWorkflow: (id: string) => Promise<void>;
  loadWorkflowLocal: (id: string) => void;
  saveWorkflowLocal: () => void;
  loadSampleWorkflow: () => void;
  getWorkflowList: () => Workflow[];
  exportWorkflow: () => string;
  importWorkflow: (json: string) => void;
  createNewWorkflow: () => void;
  resetWorkflow: () => void;

  setRuns: (runs: WorkflowRunEntry[]) => void;
  addRun: (run: WorkflowRunEntry) => void;
  fetchRuns: () => Promise<void>;

  toggleHistory: () => void;
  toggleSidebar: () => void;
  setHistoryOpen: (open: boolean) => void;
}

const genId = () => `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

function createNodeData(type: string): Record<string, unknown> {
  switch (type) {
    case "textNode": return { label: "Text Input", content: "", isExecuting: false } satisfies TextNodeData;
    case "imageNode": return { label: "Upload Image", imageUrl: null, isExecuting: false } satisfies ImageNodeData;
    case "videoNode": return { label: "Upload Video", videoUrl: null, isExecuting: false } satisfies VideoNodeData;
    case "llmNode": return { label: "Run LLM", model: "gemini-1.5-flash", systemPrompt: "", userMessage: "", response: null, isLoading: false, error: null, isExecuting: false } satisfies LLMNodeData;
    case "cropImageNode": return { label: "Crop Image", imageUrl: null, xPercent: 0, yPercent: 0, widthPercent: 80, heightPercent: 80, outputUrl: null, isLoading: false, error: null, isExecuting: false } satisfies CropImageNodeData;
    case "extractFrameNode": return { label: "Extract Frame", videoUrl: null, timestamp: "50%", outputUrl: null, isLoading: false, error: null, isExecuting: false } satisfies ExtractFrameNodeData;
    default: return { label: "Unknown", isExecuting: false };
  }
}

function getHandleDataType(nodeType: string | undefined, handleId: string | null | undefined): string | null {
  if (!handleId) return null;
  if (SOURCE_HANDLE_TYPES[handleId]) return SOURCE_HANDLE_TYPES[handleId];
  if (TARGET_HANDLE_ACCEPTS[handleId]) return TARGET_HANDLE_ACCEPTS[handleId];
  // Dynamic image handles
  if (handleId.startsWith("target-images-")) return "image";
  return null;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflowId: "workflow_default",
  workflowName: "Untitled Workflow",
  nodes: [],
  edges: [],
  history: [],
  historyIndex: -1,
  runs: [],
  isHistoryOpen: true,
  isSidebarOpen: true,

  setWorkflowId: (id) => set({ workflowId: id }),
  setWorkflowName: (name) => set({ workflowName: name }),
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setRuns: (runs) => set({ runs }),
  addRun: (run) => set((s) => ({ runs: [run, ...s.runs] })),
  toggleHistory: () => set((s) => ({ isHistoryOpen: !s.isHistoryOpen })),
  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
  setHistoryOpen: (open) => set({ isHistoryOpen: open }),

  onNodesChange: (changes) => set((s) => ({ nodes: applyNodeChanges(changes, s.nodes) as WorkflowNode[] })),
  onEdgesChange: (changes) => set((s) => ({ edges: applyEdgeChanges(changes, s.edges) })),

  onConnect: (connection) => {
    const { nodes, edges } = get();
    const sourceHandleType = getHandleDataType(nodes.find((n) => n.id === connection.source)?.type, connection.sourceHandle);
    const targetHandleType = getHandleDataType(nodes.find((n) => n.id === connection.target)?.type, connection.targetHandle);

    if (sourceHandleType && targetHandleType && sourceHandleType !== targetHandleType) return;

    const existingConn = edges.find((e) => e.target === connection.target && e.targetHandle === connection.targetHandle);
    if (existingConn) return;

    get().saveHistory();
    set({ edges: addEdge({ ...connection, id: `edge_${Date.now()}`, animated: true, style: { stroke: "#7c3aed", strokeWidth: 2 } }, edges) });
  },

  addNode: (type, position) => {
    get().saveHistory();
    const id = genId();
    const newNode = { id, type, position, data: createNodeData(type) } as WorkflowNode;
    set((s) => ({ nodes: [...s.nodes, newNode] }));
  },

  updateNodeData: (nodeId, data) => {
    set((s) => ({ nodes: s.nodes.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n) as WorkflowNode[] }));
  },

  setNodeExecuting: (nodeId, isExecuting) => {
    set((s) => ({ nodes: s.nodes.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, isExecuting } } : n) as WorkflowNode[] }));
  },

  deleteNode: (nodeId) => {
    get().saveHistory();
    set((s) => ({ nodes: s.nodes.filter((n) => n.id !== nodeId), edges: s.edges.filter((e) => e.source !== nodeId && e.target !== nodeId) }));
  },

  deleteEdgeByHandle: (nodeId, handleId, handleType) => {
    const edge = get().edges.find((e) => handleType === "target" ? (e.target === nodeId && e.targetHandle === handleId) : (e.source === nodeId && e.sourceHandle === handleId));
    if (edge) { get().saveHistory(); set((s) => ({ edges: s.edges.filter((e) => e.id !== edge.id) })); }
  },

  saveHistory: () => {
    const { nodes, edges, history, historyIndex } = get();
    const newHistory = [...history.slice(0, historyIndex + 1), { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) }];
    if (newHistory.length > 50) newHistory.shift();
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) set({ nodes: history[historyIndex - 1].nodes, edges: history[historyIndex - 1].edges, historyIndex: historyIndex - 1 });
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) set({ nodes: history[historyIndex + 1].nodes, edges: history[historyIndex + 1].edges, historyIndex: historyIndex + 1 });
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  saveWorkflowLocal: () => {
    const { workflowId, workflowName, nodes, edges } = get();
    const workflow = { id: workflowId, name: workflowName, nodes, edges, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    const workflows = JSON.parse(localStorage.getItem("workflows") || "{}");
    workflows[workflowId] = workflow;
    localStorage.setItem("workflows", JSON.stringify(workflows));
  },

  saveWorkflow: async () => {
    const { workflowId, workflowName, nodes, edges } = get();
    get().saveWorkflowLocal();
    if (!workflowId || workflowId.startsWith("workflow_") || workflowId.startsWith("sample_")) return;
    try {
      await fetch(`/api/workflows/${workflowId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: workflowName, nodes, edges }),
      });
    } catch { /* silent */ }
  },

  loadWorkflowLocal: (id) => {
    const workflows = JSON.parse(localStorage.getItem("workflows") || "{}");
    const wf = workflows[id];
    if (wf) set({ workflowId: wf.id, workflowName: wf.name, nodes: wf.nodes, edges: wf.edges, history: [], historyIndex: -1 });
  },

  loadWorkflow: async (id) => {
    get().loadWorkflowLocal(id);
    if (!id || id.startsWith("workflow_") || id.startsWith("sample_")) return;
    try {
      const res = await fetch(`/api/workflows/${id}`);
      if (res.ok) {
        const wf = await res.json() as { id: string; title: string; nodes: WorkflowNode[]; edges: Edge[] };
        set({ workflowId: wf.id, workflowName: wf.title, nodes: wf.nodes, edges: wf.edges, history: [], historyIndex: -1 });
      }
    } catch { /* use local */ }
  },

  fetchRuns: async () => {
    const { workflowId } = get();
    if (!workflowId || workflowId.startsWith("workflow_") || workflowId.startsWith("sample_")) return;
    try {
      const res = await fetch(`/api/runs?workflowId=${workflowId}`);
      if (res.ok) { const runs = await res.json() as WorkflowRunEntry[]; set({ runs: Array.isArray(runs) ? runs : [] }); }
    } catch { /* silent */ }
  },

  getWorkflowList: () => {
    const workflows = JSON.parse(localStorage.getItem("workflows") || "{}");
    return Object.values(workflows) as Workflow[];
  },

  loadSampleWorkflow: () => {
    const sampleNodes: WorkflowNode[] = [
      { id: "n_img1", type: "imageNode", position: { x: 60, y: 180 }, data: { label: "Upload Product Photo", imageUrl: null, isExecuting: false } } as WorkflowNode,
      { id: "n_crop1", type: "cropImageNode", position: { x: 360, y: 180 }, data: { label: "Crop Image", imageUrl: null, xPercent: 10, yPercent: 10, widthPercent: 80, heightPercent: 80, outputUrl: null, isLoading: false, error: null, isExecuting: false } } as WorkflowNode,
      { id: "n_txt1", type: "textNode", position: { x: 60, y: 420 }, data: { label: "System Prompt", content: "You are a professional marketing copywriter. Generate a compelling one-paragraph product description.", isExecuting: false } } as WorkflowNode,
      { id: "n_txt2", type: "textNode", position: { x: 60, y: 620 }, data: { label: "Product Details", content: "Product: Wireless Bluetooth Headphones. Features: Noise cancellation, 30-hour battery, foldable design.", isExecuting: false } } as WorkflowNode,
      { id: "n_llm1", type: "llmNode", position: { x: 680, y: 280 }, data: { label: "Product Description", model: "gemini-1.5-flash", systemPrompt: "", userMessage: "", response: null, isLoading: false, error: null, isExecuting: false } } as WorkflowNode,
      { id: "n_vid1", type: "videoNode", position: { x: 60, y: 820 }, data: { label: "Upload Demo Video", videoUrl: null, isExecuting: false } } as WorkflowNode,
      { id: "n_frame1", type: "extractFrameNode", position: { x: 360, y: 820 }, data: { label: "Extract Frame", videoUrl: null, timestamp: "50%", outputUrl: null, isLoading: false, error: null, isExecuting: false } } as WorkflowNode,
      { id: "n_txt3", type: "textNode", position: { x: 680, y: 660 }, data: { label: "Social Media Prompt", content: "You are a social media manager. Create a tweet-length marketing post based on the product image and video frame.", isExecuting: false } } as WorkflowNode,
      { id: "n_llm2", type: "llmNode", position: { x: 1000, y: 460 }, data: { label: "Marketing Summary", model: "gemini-1.5-flash", systemPrompt: "", userMessage: "", response: null, isLoading: false, error: null, isExecuting: false } } as WorkflowNode,
    ];
    const edgeStyle = { stroke: "#7c3aed", strokeWidth: 2 };
    const sampleEdges: Edge[] = [
      { id: "e1", source: "n_img1", sourceHandle: "source-image", target: "n_crop1", targetHandle: "target-image_url", animated: true, style: edgeStyle },
      { id: "e2", source: "n_txt1", sourceHandle: "source-text", target: "n_llm1", targetHandle: "target-system_prompt", animated: true, style: edgeStyle },
      { id: "e3", source: "n_txt2", sourceHandle: "source-text", target: "n_llm1", targetHandle: "target-user_message", animated: true, style: edgeStyle },
      { id: "e4", source: "n_crop1", sourceHandle: "source-image", target: "n_llm1", targetHandle: "target-images-0", animated: true, style: edgeStyle },
      { id: "e5", source: "n_vid1", sourceHandle: "source-video", target: "n_frame1", targetHandle: "target-video_url", animated: true, style: edgeStyle },
      { id: "e6", source: "n_txt3", sourceHandle: "source-text", target: "n_llm2", targetHandle: "target-system_prompt", animated: true, style: edgeStyle },
      { id: "e7", source: "n_llm1", sourceHandle: "source-text", target: "n_llm2", targetHandle: "target-user_message", animated: true, style: edgeStyle },
      { id: "e8", source: "n_crop1", sourceHandle: "source-image", target: "n_llm2", targetHandle: "target-images-0", animated: true, style: edgeStyle },
      { id: "e9", source: "n_frame1", sourceHandle: "source-image", target: "n_llm2", targetHandle: "target-images-1", animated: true, style: edgeStyle },
    ];
    set({ workflowId: "sample_product_marketing", workflowName: "Product Marketing Kit Generator", nodes: sampleNodes, edges: sampleEdges, history: [], historyIndex: -1 });
  },

  exportWorkflow: () => {
    const { workflowId, workflowName, nodes, edges } = get();
    return JSON.stringify({ id: workflowId, name: workflowName, nodes, edges, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, null, 2);
  },

  importWorkflow: (json) => {
    try {
      const wf = JSON.parse(json) as Workflow;
      set({ workflowId: wf.id, workflowName: wf.name, nodes: wf.nodes, edges: wf.edges, history: [], historyIndex: -1 });
    } catch { /* silent */ }
  },

  createNewWorkflow: () => set({ workflowId: `workflow_${Date.now()}`, workflowName: "Untitled Workflow", nodes: [], edges: [], history: [], historyIndex: -1 }),
  resetWorkflow: () => set({ workflowId: "", workflowName: "", nodes: [], edges: [], history: [], historyIndex: -1 }),
}));