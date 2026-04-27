import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { GoogleGenerativeAI, Part } from "@google/generative-ai";

const runSchema = z.object({
  workflowId: z.string(),
  scope: z.enum(["FULL", "PARTIAL", "SINGLE"]).default("FULL"),
  nodeIds: z.array(z.string()).optional(),
});

type NodeOutput = { text?: string; imageUrl?: string; videoUrl?: string };
type NodeOutputMap = Record<string, NodeOutput>;

async function executeLLMNode(
  nodeData: Record<string, unknown>,
  inputs: Record<string, unknown>
): Promise<NodeOutput> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelId = (nodeData.model as string) || "gemini-1.5-flash";
  const systemPrompt =
    (inputs["target-system_prompt"] as string) || (nodeData.systemPrompt as string) || "";
  const userMessage =
    (inputs["target-user_message"] as string) ||
    (nodeData.userMessage as string) ||
    (nodeData.userPrompt as string) ||
    "";

  const model = genAI.getGenerativeModel({
    model: modelId,
    ...(systemPrompt ? { systemInstruction: systemPrompt } : {}),
  });

  const parts: Part[] = [];
  for (let i = 0; i <= 2; i++) {
    const img = inputs[`target-images-${i}`] as string | undefined;
    if (img) {
      let base64Data = img;
      let mimeType = "image/jpeg";
      if (img.startsWith("data:")) {
        const match = img.match(/^data:([^;]+);base64,(.+)$/);
        if (match) { mimeType = match[1]; base64Data = match[2]; }
      }
      parts.push({ inlineData: { data: base64Data, mimeType: mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif" } });
    }
  }
  if (userMessage) parts.push({ text: userMessage });

  if (parts.length === 0) throw new Error("No input provided to LLM");

  const result = await model.generateContent({ contents: [{ role: "user", parts }] });
  return { text: result.response.text() };
}

async function executeCropImageNode(
  nodeData: Record<string, unknown>,
  inputs: Record<string, unknown>
): Promise<NodeOutput> {
  const imageUrl = (inputs["target-image_url"] as string) || (nodeData.imageUrl as string) || "";
  if (!imageUrl) throw new Error("No image URL provided");

  const transloaditKey = process.env.TRANSLOADIT_KEY;
  const transloaditSecret = process.env.TRANSLOADIT_SECRET;
  if (!transloaditKey || !transloaditSecret) return { imageUrl };

  const xPct = parseFloat((inputs["target-x_percent"] as string) ?? String(nodeData.xPercent ?? 0));
  const yPct = parseFloat((inputs["target-y_percent"] as string) ?? String(nodeData.yPercent ?? 0));
  const wPct = parseFloat((inputs["target-width_percent"] as string) ?? String(nodeData.widthPercent ?? 80));
  const hPct = parseFloat((inputs["target-height_percent"] as string) ?? String(nodeData.heightPercent ?? 80));

  const x1 = xPct / 100; const y1 = yPct / 100;
  const x2 = Math.min(1, (xPct + wPct) / 100); const y2 = Math.min(1, (yPct + hPct) / 100);

  const crypto = await import("crypto");
  const params = JSON.stringify({
    auth: { key: transloaditKey },
    steps: {
      import_url: { robot: "/http/import", url: imageUrl },
      cropped: { use: "import_url", robot: "/image/resize", result: true, imagemagick_stack: "v3.0.1", crop: { x1, y1, x2, y2, relative: true }, resize_strategy: "crop", strip: true },
    },
  });
  const sig = "sha384:" + crypto.createHmac("sha384", transloaditSecret).update(Buffer.from(params, "utf-8")).digest("hex");
  const body = new URLSearchParams(); body.append("params", params); body.append("signature", sig);

  const res = await fetch("https://api2.transloadit.com/assemblies", { method: "POST", body });
  const assembly = await res.json() as { assembly_ssl_url?: string; error?: string; ok?: string; results?: { cropped?: Array<{ ssl_url: string }> } };
  if (assembly.error) throw new Error(assembly.error);

  let assemblyUrl = assembly.assembly_ssl_url ?? "";
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const s = await (await fetch(assemblyUrl)).json() as { ok?: string; error?: string; results?: { cropped?: Array<{ ssl_url: string }> } };
    if (s.ok === "ASSEMBLY_COMPLETED") return { imageUrl: s.results?.cropped?.[0]?.ssl_url ?? imageUrl };
    if (s.error) throw new Error(s.error);
  }
  return { imageUrl };
}

async function executeExtractFrameNode(
  nodeData: Record<string, unknown>,
  inputs: Record<string, unknown>
): Promise<NodeOutput> {
  const videoUrl = (inputs["target-video_url"] as string) || (nodeData.videoUrl as string) || "";
  if (!videoUrl) throw new Error("No video URL provided");

  const transloaditKey = process.env.TRANSLOADIT_KEY;
  const transloaditSecret = process.env.TRANSLOADIT_SECRET;
  if (!transloaditKey || !transloaditSecret) return { imageUrl: "" };

  const timestamp = (inputs["target-timestamp"] as string) || (nodeData.timestamp as string) || "0";
  const isPercent = timestamp.endsWith("%");
  const offsetValue = isPercent ? timestamp : parseFloat(timestamp) || 0;

  const crypto = await import("crypto");
  const params = JSON.stringify({
    auth: { key: transloaditKey },
    steps: {
      import_url: { robot: "/http/import", url: videoUrl },
      frame: { use: "import_url", robot: "/video/thumbs", count: 1, offsets: [offsetValue], format: "jpg", result: true },
    },
  });
  const sig = "sha384:" + crypto.createHmac("sha384", transloaditSecret).update(Buffer.from(params, "utf-8")).digest("hex");
  const body = new URLSearchParams(); body.append("params", params); body.append("signature", sig);

  const res = await fetch("https://api2.transloadit.com/assemblies", { method: "POST", body });
  const assembly = await res.json() as { assembly_ssl_url?: string; error?: string; ok?: string; results?: { frame?: Array<{ ssl_url: string }> } };
  if (assembly.error) throw new Error(assembly.error);

  let assemblyUrl = assembly.assembly_ssl_url ?? "";
  for (let i = 0; i < 45; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const s = await (await fetch(assemblyUrl)).json() as { ok?: string; error?: string; results?: { frame?: Array<{ ssl_url: string }> } };
    if (s.ok === "ASSEMBLY_COMPLETED") return { imageUrl: s.results?.frame?.[0]?.ssl_url ?? "" };
    if (s.error) throw new Error(s.error);
  }
  return { imageUrl: "" };
}

function buildDependencyGraph(nodes: Array<{ id: string }>, edges: Array<{ source: string; target: string; targetHandle?: string | null; sourceHandle?: string | null }>) {
  const deps: Record<string, Set<string>> = {};
  for (const n of nodes) deps[n.id] = new Set();
  for (const e of edges) { if (deps[e.target]) deps[e.target].add(e.source); }
  return deps;
}

function topologicalSort(nodes: Array<{ id: string }>, deps: Record<string, Set<string>>): string[][] {
  const visited = new Set<string>();
  const levels: string[][] = [];
  const remaining = new Set(nodes.map((n) => n.id));

  while (remaining.size > 0) {
    const level: string[] = [];
    for (const id of remaining) {
      const nodeDeps = deps[id] ?? new Set();
      const allSatisfied = [...nodeDeps].every((d) => visited.has(d));
      if (allSatisfied) level.push(id);
    }
    if (level.length === 0) break;
    levels.push(level);
    for (const id of level) { visited.add(id); remaining.delete(id); }
  }
  return levels;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { workflowId, scope, nodeIds } = runSchema.parse(body);

    let user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) user = await prisma.user.create({ data: { clerkId: userId, email: `${userId}@placeholder.local` } });

    const workflow = await prisma.workflow.findFirst({ where: { id: workflowId, userId: user.id } });
    if (!workflow) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

    const allNodes = workflow.nodes as Array<{ id: string; type: string; data: Record<string, unknown> }>;
    const allEdges = workflow.edges as Array<{ id: string; source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null }>;

    let nodesToRun = allNodes;
    if (scope === "SINGLE" && nodeIds?.length) {
      nodesToRun = allNodes.filter((n) => nodeIds.includes(n.id));
    } else if (scope === "PARTIAL" && nodeIds?.length) {
      nodesToRun = allNodes.filter((n) => nodeIds.includes(n.id));
    }

    const workflowRun = await prisma.workflowRun.create({
      data: { workflowId, status: "RUNNING", scope },
    });

    const deps = buildDependencyGraph(nodesToRun, allEdges);
    const levels = topologicalSort(nodesToRun, deps);
    const nodeOutputs: NodeOutputMap = {};
    let overallStatus: "SUCCESS" | "FAILED" | "PARTIAL" = "SUCCESS";

    const startTime = Date.now();

    for (const level of levels) {
      await Promise.all(
        level.map(async (nodeId) => {
          const node = nodesToRun.find((n) => n.id === nodeId);
          if (!node) return;

          const nodeStart = Date.now();
          const incomingEdges = allEdges.filter((e) => e.target === nodeId);
          const inputs: Record<string, unknown> = {};

          for (const edge of incomingEdges) {
            const srcOutput = nodeOutputs[edge.source];
            const th = edge.targetHandle ?? "";

            if (srcOutput) {
              // Source node was already executed — use its output
              if (th.startsWith("target-images")) inputs[th] = srcOutput.imageUrl ?? srcOutput.text ?? "";
              else if (th === "target-user_message" || th === "target-system_prompt") inputs[th] = srcOutput.text ?? "";
              else if (th === "target-image_url") inputs[th] = srcOutput.imageUrl ?? "";
              else if (th === "target-video_url") inputs[th] = srcOutput.videoUrl ?? "";
              else inputs[th] = srcOutput.text ?? "";
            } else {
              // Source node not yet executed (SINGLE/PARTIAL scope) — read from stored node data
              const srcNode = allNodes.find((n) => n.id === edge.source);
              if (srcNode) {
                const d = srcNode.data;
                if (th.startsWith("target-images") || th === "target-image_url") {
                  inputs[th] = ((d.outputUrl ?? d.imageUrl ?? "") as string);
                } else if (th === "target-user_message" || th === "target-system_prompt") {
                  inputs[th] = ((d.content ?? d.response ?? "") as string);
                } else if (th === "target-video_url") {
                  inputs[th] = ((d.videoUrl ?? "") as string);
                } else if (th === "target-timestamp") {
                  inputs[th] = ((d.timestamp ?? "") as string);
                } else if (th.startsWith("target-x_")) {
                  inputs[th] = String(d.xPercent ?? 0);
                } else if (th.startsWith("target-y_")) {
                  inputs[th] = String(d.yPercent ?? 0);
                } else if (th.startsWith("target-w")) {
                  inputs[th] = String(d.widthPercent ?? 80);
                } else if (th.startsWith("target-h")) {
                  inputs[th] = String(d.heightPercent ?? 80);
                }
              }
            }
          }

          let status: "SUCCESS" | "FAILED" = "SUCCESS";
          let outputs: NodeOutput = {};
          let errorMsg: string | undefined;

          try {
            if (node.type === "textNode") {
              outputs = { text: node.data.content as string ?? "" };
            } else if (node.type === "imageNode") {
              outputs = { imageUrl: node.data.imageUrl as string ?? "" };
            } else if (node.type === "videoNode") {
              outputs = { videoUrl: node.data.videoUrl as string ?? "" };
            } else if (node.type === "llmNode") {
              outputs = await executeLLMNode(node.data, inputs);
            } else if (node.type === "cropImageNode") {
              outputs = await executeCropImageNode(node.data, inputs);
            } else if (node.type === "extractFrameNode") {
              outputs = await executeExtractFrameNode(node.data, inputs);
            }
            nodeOutputs[nodeId] = outputs;
          } catch (err) {
            status = "FAILED";
            overallStatus = overallStatus === "SUCCESS" ? "PARTIAL" : overallStatus;
            errorMsg = err instanceof Error ? err.message : "Execution failed";
          }

          const duration = Date.now() - nodeStart;
          await prisma.nodeRun.create({
            data: {
              workflowRunId: workflowRun.id,
              nodeId,
              nodeLabel: (node.data.label as string) ?? node.type,
              status,
              duration,
              inputs: inputs as never,
              outputs: outputs as never,
              ...(errorMsg ? { error: errorMsg } : {}),
            },
          });
        })
      );
    }

    const totalDuration = Date.now() - startTime;
    const finalRun = await prisma.workflowRun.update({
      where: { id: workflowRun.id },
      data: { status: overallStatus, duration: totalDuration },
      include: { nodeRuns: { orderBy: { createdAt: "asc" } } },
    });

    return NextResponse.json({ run: finalRun, outputs: nodeOutputs }, { status: 201 });
  } catch (error) {
    console.error("POST /api/runs error:", error);
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const workflowId = searchParams.get("workflowId");
  if (!workflowId) return NextResponse.json({ error: "workflowId required" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json([]);

  const workflow = await prisma.workflow.findFirst({ where: { id: workflowId, userId: user.id } });
  if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const runs = await prisma.workflowRun.findMany({
    where: { workflowId },
    orderBy: { createdAt: "desc" },
    include: { nodeRuns: { orderBy: { createdAt: "asc" } } },
    take: 50,
  });

  return NextResponse.json(runs);
}