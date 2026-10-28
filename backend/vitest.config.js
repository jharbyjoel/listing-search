import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Inside Lambda both layers are mounted at /opt/nodejs and their contents merge there.
// Tests map each /opt/nodejs file to the matching file in its local layer folder.
export default defineConfig({
  resolve: {
    alias: [
      {
        find: '/opt/nodejs/validateQuery.js',
        replacement: fileURLToPath(new URL('./layers/validation/nodejs/validateQuery.js', import.meta.url)),
      },
      {
        find: '/opt/nodejs/loadListings.js',
        replacement: fileURLToPath(new URL('./layers/util/nodejs/loadListings.js', import.meta.url)),
      },
      {
        find: '/opt/nodejs/search.js',
        replacement: fileURLToPath(new URL('./layers/util/nodejs/search.js', import.meta.url)),
      },
      {
        find: '/opt/nodejs/scoring.js',
        replacement: fileURLToPath(new URL('./layers/util/nodejs/scoring.js', import.meta.url)),
      },
    ],
  },
});
