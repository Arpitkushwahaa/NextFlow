import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  nodes: z.array(z.unknown()).optional(),
  edges: z.array(z.unknown()).optional(),
});

async function getWorkflow(id: string, userId: string) {
  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return null;
  return prisma.workflow.findFirst({ where: { id, userId: user.id } });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const wf = await getWorkflow(id, userId);
  if (!wf) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(wf);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const existing = await getWorkflow(id, userId);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const body = await req.json();
    const data = updateSchema.parse(body);
    const updated = await prisma.workflow.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.nodes !== undefined && { nodes: data.nodes as never }),
        ...(data.edges !== undefined && { edges: data.edges as never }),
      },
    });
    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.message }, { status: 400 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const existing = await getWorkflow(id, userId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.workflow.delete({ where: { id } });
  return NextResponse.json({ success: true });
}