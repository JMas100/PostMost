"use client";

import { useEffect, useRef } from "react";

export function TrackOnMount({ action }: { action: () => Promise<void> }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    void action();
  }, [action]);

  return null;
}
