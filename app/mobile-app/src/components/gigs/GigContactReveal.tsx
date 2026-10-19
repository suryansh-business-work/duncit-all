import { useState } from 'react';
import { Text } from 'tamagui';
import { logs } from '@duncit/logs';
import { parseApiError, type GigContact } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { GigJobContactDocument } from '@/graphql/gigs';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import { fireAndForget } from '@/utils/fire-and-forget';
import { GigContactCard } from './GigContactCard';

/**
 * "View contact": any signed-in member may see a poster's contact. It is read
 * on the tap — never shipped with the gig — and the server logs each reveal.
 * mWeb twin: @duncit/gig-jobs GigContactReveal.
 */
export function GigContactReveal({ jobId }: Readonly<{ jobId: string }>) {
  const { t } = useTranslation();
  const [contact, setContact] = useState<GigContact | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const reveal = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const result = await graphqlRequest(GigJobContactDocument, { job_id: jobId }, { auth: true });
      setContact(result.gigJobContact);
    } catch (error) {
      // The parsed message (a closed gig, a validation failure) is for the
      // log; the member reads one localized line.
      logs.mobileApp.error('GigJobDetail', 'revealContact', {
        error,
        jobId,
        reason: parseApiError(error),
      });
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  if (contact) return <GigContactCard contact={contact} />;

  return (
    <SurfaceCard gap={10} testID="gig-contact-reveal">
      <Text fontSize={13} fontWeight="700" color="$color">
        {t('gigJobs.contact.title')}
      </Text>
      <Text fontSize={13} color="$muted">
        {t('gigJobs.contact.hidden')}
      </Text>
      {failed ? (
        <Text role="alert" fontSize={13} color="$danger" testID="gig-contact-reveal-error">
          {t('gigJobs.contact.viewFailed')}
        </Text>
      ) : null}
      <DuncitButton
        label={t('gigJobs.contact.view')}
        loading={busy}
        disabled={busy}
        onPress={() => fireAndForget(reveal())}
        testID="gig-contact-view"
      />
    </SurfaceCard>
  );
}
