import { useEffect, useId, useRef } from 'react';
import { Controller, useWatch, type Control, type FieldValues, type Path } from 'react-hook-form';
import Editor, { type OnMount } from '@monaco-editor/react';
import { Box, FormHelperText, FormLabel, LinearProgress, Stack, useTheme } from '@mui/material';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import { DuncitButton } from '@duncit/buttons';
import { notifyError } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import CodeTokens, { type CodeToken } from './code-field/CodeTokens';
import { useServerProblems, type CodeLanguage } from './code-field/useServerProblems';

interface Props<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  hint?: string;
  language: CodeLanguage;
  minRows?: number;
  /** The site's design tokens, listed beside a stylesheet so they can be used instead of copied. */
  tokens?: CodeToken[];
  /** Errors in this field, so the form can refuse to save broken code. */
  onProblemsChange?: (count: number) => void;
}

type MonacoEditor = Parameters<OnMount>[0];
type Monaco = Parameters<OnMount>[1];

const LINE_HEIGHT = 19;
const MAX_LISTED = 5;
/** Astro is HTML with fences and directives: HTML highlighting and formatting fit it, the server checks it. */
const MONACO_LANGUAGE: Record<CodeLanguage, string> = { html: 'html', scss: 'scss', javascript: 'javascript', astro: 'html' };

/**
 * A Monaco editor for site and component code — HTML, Astro, SCSS or
 * JavaScript: highlighting, Format, and the server's own checks as you type
 * (the exact compiler a save runs), painted on the lines they are about.
 */
export default function CodeField<T extends FieldValues>({ control, name, label, hint, language, minRows = 4, tokens, onProblemsChange }: Readonly<Props<T>>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const labelId = useId();
  const editorRef = useRef<MonacoEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const source = String(useWatch({ control, name }) ?? '');
  const { problems, checking } = useServerProblems(language, source);
  const errors = problems.filter((problem) => problem.severity === 'ERROR');
  const height = Math.max(minRows, 6) * LINE_HEIGHT + 2 * LINE_HEIGHT;

  useEffect(() => onProblemsChange?.(errors.length), [errors.length, onProblemsChange]);

  // Each problem drawn on its own line in the editor, not only listed under it.
  useEffect(() => {
    const model = editorRef.current?.getModel();
    const monaco = monacoRef.current;
    if (!model || !monaco) return;
    monaco.editor.setModelMarkers(
      model,
      'cms',
      problems.map((p) => ({
        startLineNumber: p.line,
        startColumn: p.column,
        endLineNumber: p.line,
        endColumn: model.getLineMaxColumn(Math.min(p.line, model.getLineCount())),
        message: p.message,
        severity: p.severity === 'ERROR' ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning,
      })),
    );
  }, [problems]);

  const insert = (text: string) => {
    const editor = editorRef.current;
    const selection = editor?.getSelection();
    if (!editor || !selection) return;
    editor.executeEdits('cms-tokens', [{ range: selection, text, forceMoveMarkers: true }]);
    editor.focus();
  };

  const format = () => {
    editorRef.current
      ?.getAction('editor.action.formatDocument')
      ?.run()
      .catch(() => notifyError(t('websiteApp.cms.code.formatFailed')));
  };

  return (
    <Stack spacing={0.5} role="group" aria-labelledby={labelId} data-testid={`cms-code-${String(name)}`}>
      <Stack direction="row" sx={{ alignItems: 'center' }}>
        <FormLabel id={labelId} sx={{ flex: 1 }}>
          {label}
        </FormLabel>
        <DuncitButton size="small" startIcon={<FormatAlignLeftIcon fontSize="small" />} aria-label={`${t('websiteApp.cms.code.format')}: ${label}`} onClick={format}>
          {t('websiteApp.cms.code.format')}
        </DuncitButton>
      </Stack>
      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: tokens ? 'minmax(0, 1fr) 240px' : '1fr' } }}>
        <Controller
          control={control}
          name={name}
          render={({ field }) => (
            <Box sx={{ border: 1, borderColor: errors.length ? 'error.main' : 'divider', borderRadius: 1, overflow: 'hidden', minWidth: 0 }}>
              <Editor
                height={height}
                language={MONACO_LANGUAGE[language]}
                theme={theme.palette.mode === 'dark' ? 'vs-dark' : 'light'}
                value={field.value ?? ''}
                onChange={(value) => field.onChange(value ?? '')}
                onMount={(editor, monaco) => {
                  editorRef.current = editor;
                  monacoRef.current = monaco;
                }}
                options={{
                  ariaLabel: label,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  tabSize: 2,
                  formatOnPaste: true,
                  automaticLayout: true,
                  fontSize: theme.typography.fontSize,
                }}
              />
              {checking && <LinearProgress aria-label={t('websiteApp.cms.code.checking')} sx={{ height: 2 }} />}
            </Box>
          )}
        />
        {tokens && <CodeTokens tokens={tokens} onInsert={insert} />}
      </Box>
      {problems.length > 0 ? (
        <FormHelperText error={errors.length > 0} role="alert">
          {t('websiteApp.cms.code.problems', { vars: { count: problems.length } })}{' '}
          {problems
            .slice(0, MAX_LISTED)
            .map((problem) => t('websiteApp.cms.code.problemLine', { vars: { line: problem.line, message: problem.message } }))
            .join(' · ')}
        </FormHelperText>
      ) : (
        <FormHelperText>{hint ?? t('websiteApp.cms.code.editorHint')}</FormHelperText>
      )}
    </Stack>
  );
}
