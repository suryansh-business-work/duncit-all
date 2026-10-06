import { useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { CmsDesign } from '@duncit/gql-types';
import CodeField from '../../components/CodeField';
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
        <CodeField control={control} name="base_css" label={t('websiteApp.cms.design.baseCss')} hint={t('websiteApp.cms.design.baseCssHint')} language="css" minRows={10} />
        <DuncitButton type="submit" variant="contained" loading={submitting} sx={{ alignSelf: 'flex-start' }} data-testid="cms-design-save">
          {t('shell.common.save')}
        </DuncitButton>
      </Stack>
    </form>
  );
}
