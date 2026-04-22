import { task, logger } from "@trigger.dev/sdk/v3";

export interface CropImagePayload {
  imageUrl: string;
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  nodeRunId?: string;
}

export interface CropImageResult {
  outputUrl: string;
  nodeRunId?: string;
}

export const cropImageTask = task({
  id: "crop-image-task",
  maxDuration: 120,
  run: async (payload: CropImagePayload): Promise<CropImageResult> => {
    logger.log("Crop image task started", { imageUrl: payload.imageUrl });

    const transloaditKey = process.env.TRANSLOADIT_KEY;
    const transloaditSecret = process.env.TRANSLOADIT_SECRET;

    if (!transloaditKey || !transloaditSecret) {
      // Fallback: return original URL with a note
      logger.warn("Transloadit not configured, returning original URL");
      return { outputUrl: payload.imageUrl, nodeRunId: payload.nodeRunId };
    }

    // Use Transloadit /http/import + /image/resize robots
    const x1 = payload.xPercent / 100;
    const y1 = payload.yPercent / 100;
    const x2 = Math.min(1, (payload.xPercent + payload.widthPercent) / 100);
    const y2 = Math.min(1, (payload.yPercent + payload.heightPercent) / 100);

    const params = {
      auth: { key: transloaditKey },
      steps: {
        import_url: {
          robot: "/http/import",
          url: payload.imageUrl,
        },
        cropped: {
          use: "import_url",
          robot: "/image/resize",
          result: true,
          imagemagick_stack: "v3.0.1",
          crop: { x1, y1, x2, y2, relative: true },
          resize_strategy: "crop",
          strip: true,
        },
      },
    };

    // Create HMAC signature
    const crypto = await import("crypto");
    const paramsStr = JSON.stringify(params);
    const signature =
      "sha384:" +
      crypto
        .createHmac("sha384", transloaditSecret)
        .update(Buffer.from(paramsStr, "utf-8"))
        .digest("hex");

    const body = new URLSearchParams();
    body.append("params", paramsStr);
    body.append("signature", signature);

    // Submit assembly
    let assemblyUrl = "https://api2.transloadit.com/assemblies";
    const response = await fetch(assemblyUrl, {
      method: "POST",
      body,
    });
    const assembly = await response.json() as {
      assembly_ssl_url: string;
      ok?: string;
      error?: string;
      results?: { cropped?: Array<{ ssl_url: string }> };
    };

    if (assembly.error) {
      throw new Error(`Transloadit error: ${assembly.error}`);
    }

    // Poll for completion
    assemblyUrl = assembly.assembly_ssl_url;
    let completed = false;
    let outputUrl = payload.imageUrl;
    let attempts = 0;

    while (!completed && attempts < 30) {
      await new Promise((r) => setTimeout(r, 2000));
      attempts++;

      const statusRes = await fetch(assemblyUrl);
      const status = await statusRes.json() as {
        ok?: string;
        error?: string;
        results?: { cropped?: Array<{ ssl_url: string }> };
      };

      if (status.ok === "ASSEMBLY_COMPLETED") {
        completed = true;
        outputUrl = status.results?.cropped?.[0]?.ssl_url ?? payload.imageUrl;
      } else if (status.error) {
        throw new Error(`Assembly failed: ${status.error}`);
      }
    }

    logger.log("Crop image task completed", { outputUrl });
    return { outputUrl, nodeRunId: payload.nodeRunId };
  },
});
