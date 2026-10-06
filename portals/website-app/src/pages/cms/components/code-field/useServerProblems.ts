import { useQuery } from '@apollo/client/react';
import { useDebouncedValue } from '@duncit/ui';
import type { CmsCodeLanguage, CmsCodeProblem } from '@duncit/gql-types';
import { CMS_VALIDATE_CODE, type CmsValidateCodeData } from '../../queries/code';

/** The editor languages the server checks, as the API names them. HTML has nothing to check. */
export const SERVER_LANGUAGE: Record<CodeLanguage, CmsCodeLanguage | null> = {
  scss: 'SCSS',
  javascript: 'JS',
  astro: 'ASTRO',
  html: null,
};

export type CodeLanguage = 'html' | 'scss' | 'javascript' | 'astro';

/** Long enough not to ask on every keystroke, short enough to feel live. */
const DEBOUNCE_MS = 600;

const NONE: CmsCodeProblem[] = [];

/**
 * What the server says is wrong with the code, as it is typed: Dart Sass for
 * SCSS, a JavaScript parser, the Astro compiler. The same checks a save runs,
 * so an editor that shows no errors is an editor that saves.
 */
export function useServerProblems(language: CodeLanguage, source: string): { problems: CmsCodeProblem[]; checking: boolean } {
  const serverLanguage = SERVER_LANGUAGE[language];
  const debounced = useDebouncedValue(source, DEBOUNCE_MS);
  const skip = !serverLanguage || !debounced.trim();
  const { data, loading } = useQuery<CmsValidateCodeData>(CMS_VALIDATE_CODE, {
    variables: { language: serverLanguage, source: debounced },
    skip,
    fetchPolicy: 'no-cache',
  });
  if (skip) return { problems: NONE, checking: false };
  return { problems: data?.cmsValidateCode ?? NONE, checking: loading || debounced !== source };
}
