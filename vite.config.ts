import { defineConfig } from "vite";

export default defineConfig({
  base: "/lumina-lite/",
  optimizeDeps: {
    exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util"],
  },
});
