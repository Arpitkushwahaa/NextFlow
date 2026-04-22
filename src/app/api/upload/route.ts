import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const transloaditKey = process.env.TRANSLOADIT_KEY;
    const transloaditSecret = process.env.TRANSLOADIT_SECRET;

    if (transloaditKey && transloaditSecret) {
      const crypto = await import("crypto");
      const params = JSON.stringify({
        auth: { key: transloaditKey },
        steps: { ":original": { robot: "/upload/handle" } },
      });
      const signature =
        "sha384:" +
        crypto.createHmac("sha384", transloaditSecret)
          .update(Buffer.from(params, "utf-8")).digest("hex");

      const body = new FormData();
      body.append("params", params);
      body.append("signature", signature);
      body.append("file", file);

      const response = await fetch("https://api2.transloadit.com/assemblies", { method: "POST", body });
      const result = await response.json() as { ok?: string; error?: string; results?: { ":original"?: Array<{ ssl_url: string }> }; assembly_ssl_url?: string };

      if (result.error) throw new Error(result.error);

      let assemblyUrl = result.assembly_ssl_url ?? "";
      let attempts = 0;
      let url = "";
      while (attempts < 30 && assemblyUrl) {
        await new Promise((r) => setTimeout(r, 1500));
        attempts++;
        const statusRes = await fetch(assemblyUrl);
        const status = await statusRes.json() as { ok?: string; error?: string; results?: { ":original"?: Array<{ ssl_url: string }> } };
        if (status.ok === "ASSEMBLY_COMPLETED") { url = status.results?.[":original"]?.[0]?.ssl_url ?? ""; break; }
        if (status.error) throw new Error(status.error);
      }
      if (!url) throw new Error("Upload failed or timed out");
      return NextResponse.json({ url });
    }

    // Fallback: base64 data URL
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;
    return NextResponse.json({ url: dataUrl });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 500 });
  }
}