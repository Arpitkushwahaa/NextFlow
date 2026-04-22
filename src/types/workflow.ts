import { Node, Edge } from "@xyflow/react";

export type HandleDataType = "text" | "image" | "video";

export interface BaseNodeData {
  label: string;
  isExecuting?: boolean;
  [key: string]: unknown;
}

export interface TextNodeData extends BaseNodeData {
  content: string;
}

export interface ImageNodeData extends BaseNodeData {
  imageUrl: string | null;
}

export interface VideoNodeData extends BaseNodeData {
  videoUrl: string | null;
}

export interface LLMNodeData extends BaseNodeData {
  model: string;
  systemPrompt: string;
  userMessage: string;
  response: string | null;
  isLoading: boolean;
  error: string | null;
  // legacy compat
  userPrompt?: string;
  imageInputCount?: number;
  generatedImage?: string | null;
}

export interface CropImageNodeData extends BaseNodeData {
  imageUrl: string | null;
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  outputUrl: string | null;
  isLoading: boolean;
  error: string | null;
  imageUrlConnected?: boolean;
  xPercentConnected?: boolean;
  yPercentConnected?: boolean;
  widthPercentConnected?: boolean;
  heightPercentConnected?: boolean;
}

export interface ExtractFrameNodeData extends BaseNodeData {
  videoUrl: string | null;
  timestamp: string;
  outputUrl: string | null;
  isLoading: boolean;
  error: string | null;
  videoUrlConnected?: boolean;
  timestampConnected?: boolean;
}

// Legacy compat
export interface ImageNodeDataLegacy extends BaseNodeData {
  imageUrl: string | null;
  imageBase64: string | null;
}

export type WorkflowNodeData =
  | TextNodeData
  | ImageNodeData
  | VideoNodeData
  | LLMNodeData
  | CropImageNodeData
  | ExtractFrameNodeData;

export type TextNodeType = Node<TextNodeData, "textNode">;
export type ImageNodeType = Node<ImageNodeData, "imageNode">;
export type VideoNodeType = Node<VideoNodeData, "videoNode">;
export type LLMNodeType = Node<LLMNodeData, "llmNode">;
export type CropImageNodeType = Node<CropImageNodeData, "cropImageNode">;
export type ExtractFrameNodeType = Node<ExtractFrameNodeData, "extractFrameNode">;

export type WorkflowNode =
  | TextNodeType
  | ImageNodeType
  | VideoNodeType
  | LLMNodeType
  | CropImageNodeType
  | ExtractFrameNodeType;

export interface Workflow {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  edges: Edge[];
  createdAt: string;
  updatedAt: string;
}

export const GEMINI_MODELS = [
  { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash" },
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash" },
  { id: "gemini-2.0-flash-lite", name: "Gemini 2.0 Flash Lite" },
] as const;

// Legacy compat
export const OPENAI_MODELS = GEMINI_MODELS;

export type GeminiModel = (typeof GEMINI_MODELS)[number]["id"];

// Handle type mapping — source handle ID → data type emitted
export const SOURCE_HANDLE_TYPES: Record<string, HandleDataType> = {
  "source-text": "text",
  "source-image": "image",
  "source-video": "video",
};

// Target handle type mapping — target handle ID → data type accepted
export const TARGET_HANDLE_ACCEPTS: Record<string, HandleDataType> = {
  "target-system_prompt": "text",
  "target-user_message": "text",
  "target-images-0": "image",
  "target-images-1": "image",
  "target-images-2": "image",
  "target-image_url": "image",
  "target-x_percent": "text",
  "target-y_percent": "text",
  "target-width_percent": "text",
  "target-height_percent": "text",
  "target-video_url": "video",
  "target-timestamp": "text",
};

export interface WorkflowRunRecord {
  id: string;
  workflowId: string;
  status: "RUNNING" | "SUCCESS" | "FAILED" | "PARTIAL";
  duration?: number;
  scope: "FULL" | "PARTIAL" | "SINGLE";
  nodeRuns: NodeRunRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface NodeRunRecord {
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
