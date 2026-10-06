import { useId, useRef, useState } from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import Editor, { type OnMount } from '@monaco-editor/react';
import { Box, FormHelperText, FormLabel, Stack, useTheme } from '@mui/material';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import { DuncitButton } from '@duncit/buttons';
import { notifyError } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';

interface Props<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  hint?: string;
  language: 'html' | 'css' | 'javascript';
  minRows?: number;
  /** Syntax errors Monaco finds in this field, so the form can refuse to save broken code. */
  onProblemsChange?: (count: number) => void;
}

type MonacoEditor = Parameters<OnMount>[0];
type Problem = { line: number; message: string };

const LINE_HEIGHT = 19;
const MAX_LISTED = 5;
/** monaco.MarkerSeverity.Error — warnings (an unknown CSS property) never block a save. */
const ERROR_SEVERITY = 8;

/** A Monaco editor for site HTML, CSS or JavaScript: highlighting, Format, and live syntax checking. */
export default function CodeField<T extends FieldValues>({ control, name, label, hint, language, minRows = 4, onProblemsChange }: Readonly<Props<T>>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const labelId = useId();
  const editorRef = useRef<MonacoEditor | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const height = Math.max(minRows, 6) * LINE_HEIGHT + 2 * LINE_HEIGHT;

  return (
    <Stack spacing={0.5} role="group" aria-labelledby={labelId} data-testid={`cms-code-${String(name)}`}>
      <Stack direction="row" sx={{ alignItems: 'center' }}>
        <FormLabel id={labelId} sx={{ flex: 1 }}>
          {label}
        </FormLabel>
        <DuncitButton
          size="small"
          startIcon={<FormatAlignLeftIcon fontSize="small" />}
          aria-label={`${t('websiteApp.cms.code.format')}: ${label}`}
          onClick={() => {
            editorRef.current
              ?.getAction('editor.action.formatDocument')
              ?.run()
              .catch(() => notifyError(t('websiteApp.cms.code.formatFailed')));
          }}
        >
          {t('websiteApp.cms.code.format')}
        </DuncitButton>
      </Stack>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Box sx={{ border: 1, borderColor: problems.length ? 'error.main' : 'divider', borderRadius: 1, overflow: 'hidden' }}>
            <Editor
              height={height}
              language={language}
              theme={theme.palette.mode === 'dark' ? 'vs-dark' : 'light'}
              value={field.value ?? ''}
              onChange={(value) => field.onChange(value ?? '')}
              onMount={(editor) => {
                editorRef.current = editor;
              }}
              onValidate={(markers) => {
                const errors = markers
                  .filter((marker) => marker.severity === ERROR_SEVERITY)
                  .map((marker) => ({ line: marker.startLineNumber, message: marker.message }));
                setProblems(errors);
                onProblemsChange?.(errors.length);
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
          </Box>
        )}
      />
      {problems.length > 0 ? (
        <FormHelperText error role="alert">
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
