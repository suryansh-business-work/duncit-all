import { useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, DialogActions, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { CmsSiteRow } from '../../queries/sites';
import SiteIdentityFields from './SiteIdentityFields';
import SiteSeoFields, { type FragmentOption } from './SiteSeoFields';
import SiteCollectionFields from './SiteCollectionFields';
import { siteSchema, toSiteFormValues, type SiteFormOutput, type SiteFormValues } from './site.types';

interface Props {
  site: CmsSiteRow | null;
  /** The site's own fragments — only an existing site can pick a header/footer. */
  fragments: FragmentOption[];
  submitting: boolean;
  errorMessage: string | null;
  onSubmit: (values: SiteFormOutput) => void;
  onCancel?: () => void;
}

/** Everything about a website except its pages: identity, domains, SEO
 * defaults, header/footer and which collections it has. */
export default function SiteForm({ site, fragments, submitting, errorMessage, onSubmit, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => siteSchema((key) => t(key)), [t]);
  const { control, handleSubmit } = useForm<SiteFormValues, unknown, SiteFormOutput>({
    defaultValues: toSiteFormValues(site),
    resolver: zodResolver(schema) as Resolver<SiteFormValues, unknown, SiteFormOutput>,
    mode: 'onTouched',
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate data-testid="cms-site-form">
      <Stack spacing={2} sx={{ mt: 1 }}>
        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
        <SiteIdentityFields control={control} />
        <SiteSeoFields control={control} fragments={site ? fragments : []} />
        <SiteCollectionFields control={control} />
      </Stack>
      <DialogActions sx={{ px: 0, pt: 2 }}>
        {onCancel && (
          <DuncitButton onClick={onCancel} disabled={submitting}>
            {t('shell.common.cancel')}
          </DuncitButton>
        )}
        <DuncitButton type="submit" variant="contained" loading={submitting} data-testid="cms-site-save">
          {t('shell.common.save')}
        </DuncitButton>
      </DialogActions>
    </form>
  );
}
