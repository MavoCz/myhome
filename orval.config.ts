import { defineConfig } from 'orval';

export default defineConfig({
  common: {
    input: {
      target: 'backend/build/docs/openapi.json',
    },
    output: {
      client: 'fetch',
      target: 'common/src/api/generated/endpoints',
      schemas: 'common/src/api/generated/model',
      baseUrl: '',
      override: {
        mutator: {
          path: 'common/src/api/client.ts',
          name: 'customFetch',
        },
      },
    },
  },
  web: {
    input: {
      target: 'backend/build/docs/openapi.json',
    },
    output: {
      client: 'react-query',
      target: 'web/src/api/generated',
      schemas: 'common/src/api/generated/model',
      baseUrl: '',
      override: {
        mutator: {
          path: 'common/src/api/client.ts',
          name: 'customFetch',
        },
      },
    },
  },
});
