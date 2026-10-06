import { useMemo } from 'react';
import { designVariables } from '@duncit/brand/cms-design';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { CmsDesign } from '@duncit/gql-types';
import CodeField from '../../components/CodeField';
import { useCodeProblems } from '../../components/useCodeProblems';
import TokenRows from './TokenRows';
import FontRows from './FontRows';
import FontsSection from '../fonts/FontsSection';
import { designSchema, toDesignFormValues, type DesignFormOutput, type DesignFormValues } from './design.types';

interface Props {
  design: CmsDesign | null;
  submitting: boolean;
  errorMessage: string | null;
  onSubmit: (values: DesignFormOutput) => void;
}

/** A website's design system: tokens, font stylesheets and its base stylesheet. */
export default function DesignForm({ design, submitting, errorMessage, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => designSchema((key) => t(key)), [t]);
  const { reporter, hasProblems } = useCodeProblems();
  const tokens = useMemo(() => designVariables(design?.tokens ?? [], design?.fonts ?? []), [design]);
  const { control, handleSubmit } = useForm<DesignFormValues, unknown, DesignFormOutput>({
    defaultValues: toDesignFormValues(design),
    resolver: zodResolver(schema) as Resolver<DesignFormValues, unknown, DesignFormOutput>,
    mode: 'onTouched',
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate data-testid="cms-design-form">
      <Stack spacing={3}>
        <Typography color="text.secondary">{t('websiteApp.cms.design.intro')}</Typography>
        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
        <TokenRows control={control} />
        <FontsSection control={control} />
        <FontRows control={control} />
        <CodeField
          control={control}
          name="base_css"
          label={t('websiteApp.cms.design.baseCss')}
          hint={t('websiteApp.cms.design.baseCssHint')}
          language="scss"
          tokens={tokens}
          minRows={14}
          onProblemsChange={reporter('base_css')}
        />
        {hasProblems && <Alert severity="error">{t('websiteApp.cms.code.fixBeforeSave')}</Alert>}
        <DuncitButton type="submit" variant="contained" loading={submitting} disabled={hasProblems} sx={{ alignSelf: 'flex-start' }} data-testid="cms-design-save">
          {t('shell.common.save')}
        </DuncitButton>
      </Stack>
    </form>
  );
}
