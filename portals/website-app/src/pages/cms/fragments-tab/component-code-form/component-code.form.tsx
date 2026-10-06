import { useMemo } from 'react';
import { Controller, useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, DialogActions, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import CodeField from '../../components/CodeField';
import { useCodeProblems } from '../../components/useCodeProblems';
import type { CodeToken } from '../../components/code-field/CodeTokens';
import { componentCodeSchema, MARKUP_MODES, type ComponentCodeOutput, type ComponentCodeValues } from './component-code.types';

interface Props {
  values: ComponentCodeValues;
  tokens: CodeToken[];
  submitting: boolean;
  errorMessage: string | null;
  onSubmit: (values: ComponentCodeOutput) => void;
  onCancel: () => void;
}

/**
 * A component's markup (HTML or Astro), its SCSS — scoped to the component, so
 * it cannot reach the rest of the page — and its JavaScript, which runs once
 * per placement with `root` set to that placement.
 */
export default function ComponentCodeForm({ values, tokens, submitting, errorMessage, onSubmit, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => componentCodeSchema(), []);
  const { reporter, hasProblems } = useCodeProblems();
  const { control, handleSubmit } = useForm<ComponentCodeValues, unknown, ComponentCodeOutput>({
    defaultValues: values,
    resolver: zodResolver(schema) as Resolver<ComponentCodeValues, unknown, ComponentCodeOutput>,
  });
  const mode = useWatch({ control, name: 'mode' });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate data-testid="cms-component-code-form">
      <Stack spacing={2.5}>
        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
        {hasProblems && <Alert severity="error">{t('websiteApp.cms.code.fixBeforeSave')}</Alert>}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
          <Typography id="cms-markup-mode" variant="body2" color="text.secondary">
            {t('websiteApp.cms.componentCode.mode')}
          </Typography>
          <Controller
            control={control}
            name="mode"
            render={({ field }) => (
              <ToggleButtonGroup size="small" exclusive value={field.value} onChange={(_event, next) => next && field.onChange(next)} aria-labelledby="cms-markup-mode">
                {MARKUP_MODES.map((option) => (
                  <ToggleButton key={option} value={option}>
                    {option === 'astro' ? t('websiteApp.cms.componentCode.astro') : t('websiteApp.cms.componentCode.html')}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            )}
          />
        </Stack>
        {mode === 'astro' && <Alert severity="info">{t('websiteApp.cms.componentCode.astroNote')}</Alert>}
        <CodeField control={control} name="html" label={t('websiteApp.cms.componentCode.markup')} language={mode} minRows={14} onProblemsChange={reporter('html')} />
        <CodeField
          control={control}
          name="scss"
          label={t('websiteApp.cms.componentCode.scss')}
          hint={t('websiteApp.cms.componentCode.scssHint')}
          language="scss"
          minRows={12}
          tokens={tokens}
          onProblemsChange={reporter('scss')}
        />
        <CodeField
          control={control}
          name="js"
          label={t('websiteApp.cms.componentCode.js')}
          hint={t('websiteApp.cms.componentCode.jsHint')}
          language="javascript"
          minRows={10}
          onProblemsChange={reporter('js')}
        />
      </Stack>
      <DialogActions sx={{ px: 0, pt: 2 }}>
        <DuncitButton onClick={onCancel}>{t('shell.common.cancel')}</DuncitButton>
        <DuncitButton type="submit" variant="contained" loading={submitting} disabled={hasProblems} data-testid="cms-component-code-save">
          {t('websiteApp.cms.componentCode.save')}
        </DuncitButton>
      </DialogActions>
    </form>
  );
}
