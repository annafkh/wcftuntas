import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WCF Tuntas",
    short_name: "WCF Tuntas",
    description: "Checklist task PT wcf dengan workflow karyawan dan pengawas.",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f4f8",
    theme_color: "#2563eb",
    lang: "id-ID",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
