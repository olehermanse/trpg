import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  test: {
    globals: true,
    threads: false,
    watch: false,
    include: ["test/*.ts"],
  },
});
