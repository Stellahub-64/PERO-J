import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    "import.meta.env.NEXT_PUBLIC_USE_BACKEND": JSON.stringify(
      process.env.NEXT_PUBLIC_USE_BACKEND ?? ""
    ),
  },
  server: { proxy: { "/api": process.env.VITE_API_PROXY || "http://localhost:3001" } },
});
