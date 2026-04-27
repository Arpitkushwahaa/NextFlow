import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

// Vercel Pro allows 60s; Hobby allows 10s. Keep well under 10s for safety.
export const maxDuration = 60;

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;  // 5 MB
const MAX_VIDEO_BYTES = 30 * 1024 * 1024; // 30 MB

async function tryTransloadit(file: File, key: string, secret: string): Promise<string | null> {
  try {
    const crypto = await import("crypto");
    const params = JSON.stringify({
      auth: { key },
      steps: { ":original": { robot: "/upload/handle" } },
    });
    const sig =
      "sha384:" +
      crypto.createHmac("sha384", secret).update(Buffer.from(params, "utf-8")).digest("hex");

    const body = new FormData();
    body.append("params", params);
    body.append("signature", sig);
    body.append("file", file);

    const res = await fetch("https://api2.transloadit.com/assemblies", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;

    const data = await res.json() as {
      error?: string;
      assembly_ssl_url?: string;
      results?: { ":original"?: Array<{ ssl_url: string }> };
    };
    if (data.error || !data.assembly_ssl_url) return null;

    // Poll up to 5 times × 2 s = 10 s max
    for (let i = 0; i < 5; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const s = await (
        await fetch(data.assembly_ssl_url!, { signal: AbortSignal.timeout(5_000) })
      ).json() as { ok?: string; error?: string; results?: { ":original"?: Array<{ ssl_url: string }> } };
      if (s.ok === "ASSEMBLY_COMPLETED") {
        return s.results?.[":original"]?.[0]?.ssl_url ?? null;
      }
      if (s.error) return null;
    }
    return null;
  } catch {
    return null; // Any error → caller falls back to base64
  }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let file: File | null = null;
  try {
    const formData = await req.formData();
    file = formData.get("file") as File | null;
  } catch {
    return NextResponse.json({ error: "Failed to parse upload. Try a smaller file." }, { status: 400 });
  }

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const isVideo = file.type.startsWith("video/");
  const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > maxBytes) {
    const mb = Math.round(maxBytes / 1024 / 1024);
    return NextResponse.json(
      { error: `File too large. Max ${isVideo ? "video" : "image"} size is ${mb} MB.` },
      { status: 413 }
    );
  }

  try {
    const key = process.env.TRANSLOADIT_KEY;
    const secret = process.env.TRANSLOADIT_SECRET;

    if (key && secret) {
      const cdnUrl = await tryTransloadit(file, key, secret);
      if (cdnUrl) return NextResponse.json({ url: cdnUrl });
      // Transloadit failed — fall through to base64
    }

    // Base64 fallback — always works for images; acceptable for small videos
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    return NextResponse.json({ url: `data:${file.type};base64,${base64}` });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
