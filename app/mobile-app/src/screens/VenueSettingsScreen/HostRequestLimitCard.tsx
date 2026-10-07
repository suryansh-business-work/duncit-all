import { useState } from 'react';

import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import { PodRequestLimitForm } from '@/forms/pod-request-limit';
import { UpdateVenueSettingsDocument } from '@/graphql/venue-availability';
import { useTranslation } from '@/hooks/useTranslation';
import type { SettingsVenue } from '@/hooks/useVenuesWithSettings';
import { graphqlRequest } from '@/services/graphql.client';
import { toErrorMessage } from '@/utils/errors';

interface Props {
  venue: SettingsVenue;
  /** Re-reads the venues so the saved cap is what the box shows next. */
  onSaved: () => void;
}

/** Venue Settings → "Maximum Host Requests / Month", for the venue the switcher has picked. mWeb twin. */
export function HostRequestLimitCard({ venue, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (limit: number) => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await graphqlRequest(
        UpdateVenueSettingsDocument,
        { venue_doc_id: venue.id, input: { rules: { max_host_requests_per_month: limit } } },
        { auth: true },
      );
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(toErrorMessage(err, t('mweb.account.somethingWentWrong')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SurfaceCard gap={12} testID="venue-host-request-limit">
      <SectionHeader title={t('podRequests.venueLimitLabel')} />
      <PodRequestLimitForm
        label={t('podRequests.venueLimitLabel')}
        initialLimit={venue.settings?.rules?.max_host_requests_per_month ?? 0}
        override={venue.host_requests_limit_override ?? null}
        saving={saving}
        saved={saved}
        error={error}
        onSubmit={save}
        testID="venue-host-request-limit-form"
      />
    </SurfaceCard>
  );
}
