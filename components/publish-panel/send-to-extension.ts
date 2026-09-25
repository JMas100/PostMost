import { toast } from "sonner";
import { listingDescriptionFields } from "@/lib/marketplaces/listing-fields";
import { ExtensionListingPayload } from "./types";

/** Shared by the main Publish panel and FailedCrossPostCard's own retry for an extension-
 *  mechanism platform -- posting to the extension is the same action either way (hand it the
 *  listing + which platform(s)), just triggered from two different places. Fire-and-forget from
 *  the caller's point of view: there's no server-visible completion signal for this handshake
 *  itself (see PublishConfirmationDialog's own doc comment for how completion is actually
 *  tracked afterward, via PlatformListing status). */
export function sendToExtension(listing: ExtensionListingPayload, platformIds: string[]) {
  const payload = {
    id: listing.id,
    ...listingDescriptionFields(listing),
    photos: listing.photos.map((p) => p.url),
  };

  function onAck(event: MessageEvent) {
    if (event.source !== window) return;
    const data = event.data;
    if (data?.source !== "postmost-extension") return;
    window.removeEventListener("message", onAck);
    if (data.type === "ACK") {
      toast.success("Sent to PostMost extension. Open the extension popup to post.");
    } else if (data.type === "ERROR") {
      toast.error(data.message || "Extension failed to save listing");
    }
  }

  window.addEventListener("message", onAck);
  window.postMessage(
    { source: "postmost", type: "SEND_LISTING", listing: payload, platforms: platformIds },
    "*"
  );
}
