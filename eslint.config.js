const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  {
    ignores: [
      'android/**',
      'dist/**',
      'ios/**',
      'node_modules/**',
      'supabase/functions/**',
      'supabase/tests/**',
    ],
  },
  ...expoConfig,
]);
