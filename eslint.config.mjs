import {defineConfig, globalIgnores} from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  // Only build artifacts. eslint-config-next ignores build/** by Next convention,
  // but here build/ holds first-party source (the Sites Vite plugin).
  globalIgnores([
    '.next/**',
    'out/**',
    'dist/**',
    '.wrangler/**',
    '.sites-runtime/**',
    'next-env.d.ts',
  ]),
  {
    // Cross-language links must be full page loads: a soft navigation between
    // /ar and /en re-renders the [lang] layout but leaves the <html lang> and
    // dir attributes stale, which breaks direction for the whole document.
    files: ['app/**/not-found.tsx', 'components/**/*.tsx'],
    rules: {
      '@next/next/no-html-link-for-pages': 'off',
    },
  },
  {
    files: ['components/ui/**/*.{ts,tsx}', 'hooks/use-mobile.ts'],
    rules: {
      // These files are vendored verbatim from shadcn@4.17.0. Keep the
      // registry source intact while applying the stricter rules to Site code.
      '@typescript-eslint/no-unused-vars': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]);

export default eslintConfig;
