"use client";

import { useEffect, useState } from "react";

export function useExtensionDetector() {
  const [installed, setInstalled] = useState<boolean | null>(null);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.source !== window) return;
      const data = event.data;
      if (data?.source === "postmost-extension" && data?.type !== "ACK" && data?.type !== "ERROR") {
        setInstalled(true);
      }
    }

    window.addEventListener("message", onMessage);
    window.postMessage({ source: "postmost", type: "PING" }, "*");

    const timer = setTimeout(() => {
      setInstalled((prev) => (prev === null ? false : prev));
    }, 2000);

    return () => {
      window.removeEventListener("message", onMessage);
      clearTimeout(timer);
    };
  }, []);

  return installed;
}
