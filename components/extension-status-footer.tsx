"use client";

import { useExtensionDetector } from "@/components/publish-panel/use-extension-detector";
import { Puzzle } from "lucide-react";

/** Honest about what we can actually detect: the extension announces its presence (see
 *  useExtensionDetector's PING/PONG handshake with postmost-content.js), not a version number --
 *  there's no handshake field for that yet, so this doesn't claim one. */
export function ExtensionStatusFooter() {
  const installed = useExtensionDetector();
  if (installed !== true) {
    return (
      <p className="text-sm text-muted-foreground">
        Eight of these twelve marketplaces post through the browser extension. It doesn&apos;t look installed in
        this browser — install it to connect them.
      </p>
    );
  }
  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground">
      <Puzzle className="h-4 w-4 text-success" />
      The extension is running in this browser. It only acts while your browser is open, so overnight jobs pick
      up when you next start it.
    </p>
  );
}
