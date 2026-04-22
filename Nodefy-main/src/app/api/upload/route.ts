import { NextResponse } from "next/server"; import { auth } from "@clerk/nextjs/server"; export async function POST(req: Request) { return NextResponse.json({ url: "" }); }
