import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "postmost",
    short_name: "postmost",
    description: "Post once. Sell everywhere. The operating system for selling everywhere.",
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
