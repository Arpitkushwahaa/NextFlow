import { task, logger } from "@trigger.dev/sdk/v3";

export interface ExtractFramePayload {
  videoUrl: string;
  timestamp: string; // seconds (e.g., "5") or percentage (e.g., "50%")
  nodeRunId?: string;
}

export interface ExtractFrameResult {
  outputUrl: string;
  nodeRunId?: string;
}

export const extractFrameTask = task({
  id: "extract-frame-task",
  maxDuration: 180,
  run: async (payload: ExtractFramePayload): Promise<ExtractFrameResult> => {
    logger.log("Extract frame task started", { videoUrl: payload.videoUrl });

    const transloaditKey = process.env.TRANSLOADIT_KEY;
    const transloaditSecret = process.env.TRANSLOADIT_SECRET;

    if (!transloaditKey || !transloaditSecret) {
      logger.warn("Transloadit not configured, returning placeholder");
      return { outputUrl: "", nodeRunId: payload.nodeRunId };
    }

    // Parse timestamp: "50%" stays as is; "5" becomes 5 seconds
    const isPercent = payload.timestamp.endsWith("%");
    const offsetValue = isPercent
      ? payload.timestamp
      : parseFloat(payload.timestamp) || 0;

    const params = {
      auth: { key: transloaditKey },
      steps: {
        import_url: {
          robot: "/http/import",
          url: payload.videoUrl,
        },
        frame: {
          use: "import_url",
          robot: "/video/thumbs",
          count: 1,
          offsets: [offsetValue],
          format: "jpg",
          result: true,
        },
      },
    };

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

    let assemblyUrl = "https://api2.transloadit.com/assemblies";
    const response = await fetch(assemblyUrl, {
      method: "POST",
      body,
    });
    const assembly = await response.json() as {
      assembly_ssl_url: string;
      ok?: string;
      error?: string;
      results?: { frame?: Array<{ ssl_url: string }> };
    };

    if (assembly.error) {
      throw new Error(`Transloadit error: ${assembly.error}`);
    }

    assemblyUrl = assembly.assembly_ssl_url;
    let completed = false;
    let outputUrl = "";
    let attempts = 0;

    while (!completed && attempts < 45) {
      await new Promise((r) => setTimeout(r, 2000));
      attempts++;

      const statusRes = await fetch(assemblyUrl);
      const status = await statusRes.json() as {
        ok?: string;
        error?: string;
        results?: { frame?: Array<{ ssl_url: string }> };
      };

      if (status.ok === "ASSEMBLY_COMPLETED") {
        completed = true;
        outputUrl = status.results?.frame?.[0]?.ssl_url ?? "";
      } else if (status.error) {
        throw new Error(`Assembly failed: ${status.error}`);
      }
    }

    logger.log("Extract frame task completed", { outputUrl });
    return { outputUrl, nodeRunId: payload.nodeRunId };
  },
});
