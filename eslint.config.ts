import { createProtoConfig } from '@protoapps/eslint-config';
import globals from 'globals';

export default createProtoConfig(
  { tsconfigRootDir: import.meta.dirname, vitest: { files: ['tests/*.test.ts'] } },
  { ignores: ['dist/**', 'coverage/**', 'tests/fixtures/**'] },
  {
    files: ['**/*.{js,ts}'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['src/index.ts', 'src/getBrowserTargets.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': 'off',
    },
  },
);
