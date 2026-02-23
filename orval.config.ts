import { defineConfig } from 'orval';

export default defineConfig({
  common: {
    input: {
      target: 'http://localhost:8080/api-docs',
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
      target: 'http://localhost:8080/api-docs',
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
