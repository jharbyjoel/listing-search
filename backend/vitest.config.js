import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      // Inside Lambda the validation layer is mounted at /opt/nodejs, so tests map that path to the local layer folder.
      '/opt/nodejs': fileURLToPath(new URL('./layers/validation/nodejs', import.meta.url)),
    },
  },
});
