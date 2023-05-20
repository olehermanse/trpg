import { resolve } from 'path'
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: resolve(__dirname, 'src/backend/backend.js'),
      name: 'backend',
      // the proper extensions will be added
      fileName: 'backend',
    },
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
  test: {
    globals: true,
    threads: false,
    watch: false,
    include: ["test/*.ts"],
  },
});
