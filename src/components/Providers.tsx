"use client";

import { ReactNode, useEffect } from "react";

export default function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      const orig = console.error.bind(console);
      console.error = (...args: unknown[]) => {
        const msg = typeof args[0] === "string" ? args[0] : "";
        if (msg.includes("bis_skin_checked") || msg.includes("bis_register") || msg.includes("__processed_")) return;
        if (msg.includes("Hydration") && args.some(a => typeof a === "string" && (String(a).includes("bis_") || String(a).includes("__processed_")))) return;
        orig(...args);
      };
      return () => { console.error = orig; };
    }
  }, []);

  return <>{children}</>;
}
