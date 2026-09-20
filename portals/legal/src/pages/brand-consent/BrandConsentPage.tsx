import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, CircularProgress, Stack } from '@mui/material';
import { useDateFormat } from '@duncit/app-settings';
import { notifySuccess } from '@duncit/dialogs';
import { PageHeader } from '@duncit/ui';
import { BRAND_CONSENT_POLICY_SLUG, parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import { CREATE_POLICY, POLICY_BY_SLUG, UPDATE_POLICY, type PolicyBySlug } from '../../graphql/policies';
import {
  BrandConsentForm,
  EMPTY_BRAND_CONSENT,
  type BrandConsentFormValues,
} from './brand-consent-form';

/** The policy type the consent is filed under on the Policies dashboard. */
const BRAND_CONSENT_POLICY_TYPE = 'Brand & Seller Policy';
/** Sorts it after every signup-gating policy on the public list. */
const BRAND_CONSENT_SORT_ORDER = 999;

/**
 * The one policy brand partners sign at the last wizard step.
 *
 * Its slug is fixed (`BRAND_CONSENT_POLICY_SLUG`), so this page edits that
 * record in place and creates it the first time — Legal never types the slug.
 */
export default function BrandConsentPage() {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });
  const { data, loading, refetch } = useQuery<any>(POLICY_BY_SLUG, {
    variables: { slug: BRAND_CONSENT_POLICY_SLUG },
    fetchPolicy: 'network-only',
  });
  const [createMut, { loading: creating }] = useMutation<any>(CREATE_POLICY);
  const [updateMut, { loading: updating }] = useMutation<any>(UPDATE_POLICY);
  const [error, setError] = useState<string | null>(null);

  const policy: PolicyBySlug | null = data?.policyBySlug ?? null;

  // A new object every render would reset the form on every keystroke, so the
  // seed only changes when the saved record does.
  const initialValues = useMemo<BrandConsentFormValues>(
    () =>
      policy
        ? { title: policy.title, content: policy.content || '', is_active: policy.is_active }
        : EMPTY_BRAND_CONSENT,
    [policy],
  );

  const updatedAt = policy?.updated_at
    ? t('legal.brandConsent.lastUpdated', { vars: { when: formatDateTime(policy.updated_at) } })
    : '';

  const submit = async (values: BrandConsentFormValues) => {
    setError(null);
    const fields = { title: values.title, content: values.content, is_active: values.is_active };
    try {
      if (policy) {
        await updateMut({ variables: { id: policy.id, input: fields } });
      } else {
        await createMut({
          variables: {
            input: {
              slug: BRAND_CONSENT_POLICY_SLUG,
              policy_type: BRAND_CONSENT_POLICY_TYPE,
              requires_signup_acceptance: false,
              sort_order: BRAND_CONSENT_SORT_ORDER,
              ...fields,
            },
          },
        });
      }
      notifySuccess(t('legal.brandConsent.saved'));
      await refetch();
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  if (loading && !data) {
    return (
      <Stack sx={{ alignItems: 'center', py: 8 }}>
        <CircularProgress />
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      <PageHeader title={t('legal.brandConsent.title')} subtitle={t('legal.brandConsent.subtitle')} />

      {policy ? (
        <Alert severity="warning">{t('legal.brandConsent.rewordWarning')}</Alert>
      ) : (
        <Alert severity="info">{t('legal.brandConsent.notCreated')}</Alert>
      )}

      <BrandConsentForm
        initialValues={initialValues}
        saving={creating || updating}
        error={error}
        updatedAt={updatedAt}
        onSubmit={submit}
      />
    </Stack>
  );
}
