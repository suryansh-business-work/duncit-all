import { useForm } from 'react-hook-form';
import CodeField from '../../src/pages/cms/components/CodeField';
import type { CodeToken } from '../../src/pages/cms/components/code-field/CodeTokens';
import type { CodeLanguage } from '../../src/pages/cms/components/code-field/useServerProblems';

export interface CodeFieldHarnessProps {
  language?: CodeLanguage;
  initial?: { css?: string };
  hint?: string;
  minRows?: number;
  tokens?: CodeToken[];
  onProblemsChange?: (count: number) => void;
  /** Receives every value the form holds, so tests can see what a save would send. */
  onValue?: (value: string | undefined) => void;
}

/** One CodeField inside a real react-hook-form form, as the CMS forms mount it. */
export function CodeFieldHarness({ language = 'scss', initial = {}, hint, minRows, tokens, onProblemsChange, onValue }: Readonly<CodeFieldHarnessProps>) {
  const { control, watch } = useForm<{ css?: string }>({ defaultValues: initial });
  onValue?.(watch('css'));
  return (
    <CodeField control={control} name="css" label="Site CSS" hint={hint} language={language} minRows={minRows} tokens={tokens} onProblemsChange={onProblemsChange} />
  );
}
