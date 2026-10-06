import { useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { CmsSiteDesignData } from '../../queries/sites';
import CodeField from '../../components/CodeField';
import { useCodeProblems } from '../../components/useCodeProblems';
import { codeSchema, toCodeFormValues, type CodeFormOutput, type CodeFormValues } from './code.types';

interface Props {
  site: CmsSiteDesignData['cmsSite'];
  submitting: boolean;
  errorMessage: string | null;
  onSubmit: (values: CodeFormOutput) => void;
}

/** Site-wide code: what goes in every page's <head>, before </body>, its CSS and its JavaScript. */
export default function CodeForm({ site, submitting, errorMessage, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => codeSchema(), []);
  const { reporter, hasProblems } = useCodeProblems();
  const { control, handleSubmit } = useForm<CodeFormValues, unknown, CodeFormOutput>({
    defaultValues: toCodeFormValues(site),
    resolver: zodResolver(schema) as Resolver<CodeFormValues, unknown, CodeFormOutput>,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate data-testid="cms-code-form">
      <Stack spacing={2}>
        <Alert severity="warning">{t('websiteApp.cms.code.warning')}</Alert>
        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
        {hasProblems && <Alert severity="error">{t('websiteApp.cms.code.fixBeforeSave')}</Alert>}
        <CodeField control={control} name="head_html" label={t('websiteApp.cms.code.headHtml')} language="html" minRows={6} onProblemsChange={reporter('head_html')} />
        <CodeField control={control} name="body_end_html" label={t('websiteApp.cms.code.bodyEndHtml')} language="html" minRows={6} onProblemsChange={reporter('body_end_html')} />
        <CodeField control={control} name="custom_css" label={t('websiteApp.cms.code.customCss')} language="css" minRows={12} onProblemsChange={reporter('custom_css')} />
        <CodeField control={control} name="custom_js" label={t('websiteApp.cms.code.customJs')} language="javascript" minRows={12} onProblemsChange={reporter('custom_js')} />
        <DuncitButton type="submit" variant="contained" loading={submitting} disabled={hasProblems} sx={{ alignSelf: 'flex-start' }} data-testid="cms-code-save">
          {t('shell.common.save')}
        </DuncitButton>
      </Stack>
    </form>
  );
}
