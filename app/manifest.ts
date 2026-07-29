import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Trading Journal Calendar",
    short_name: "Trade Journal",
    description: "ปฏิทินบันทึกผลการเทรดส่วนตัว",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f7f4",
    theme_color: "#10251f",
    icons: [],
  };
}
