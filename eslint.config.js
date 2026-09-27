import { createProtoConfig } from '@protoapps/eslint-config';
import globals from 'globals';

export default createProtoConfig(
  { tsconfigRootDir: import.meta.dirname },
  { ignores: ['dist/**', 'coverage/**', 'tests/fixtures/**'] },
  {
    files: ['**/*.{js,ts}'],
    languageOptions: { globals: globals.node },
  },
);
