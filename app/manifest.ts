import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PostMost",
    short_name: "PostMost",
    description: "List once, sell everywhere. Cross-listing platform for resellers.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#F7F8FA",
    theme_color: "#090B0D",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon.png", sizes: "1024x1024", type: "image/png" },
    ],
  };
}
