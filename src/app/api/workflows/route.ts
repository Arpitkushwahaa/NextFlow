import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1).default("Untitled Workflow"),
  nodes: z.array(z.unknown()).default([]),
  edges: z.array(z.unknown()).default([]),
});

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) return NextResponse.json([]);
    const workflows = await prisma.workflow.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" } });
    return NextResponse.json(workflows);
  } catch (e) { console.error(e); return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const data = createSchema.parse(body);
    let user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) user = await prisma.user.create({ data: { clerkId: userId, email: `${userId}@placeholder.local` } });
    const workflow = await prisma.workflow.create({ data: { userId: user.id, title: data.title, nodes: data.nodes as never, edges: data.edges as never } });
    return NextResponse.json(workflow, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.message }, { status: 400 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}