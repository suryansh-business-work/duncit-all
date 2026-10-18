import { useCallback, useState } from 'react';
import { Spinner, Text, XStack, YStack } from 'tamagui';
import type { GigInterest } from '@duncit/utils';

import { GigJobInterestsDocument } from '@/graphql/gigs';
import { useReloadableQuery } from '@/hooks/useReloadableQuery';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import { GigContactCard } from './GigContactCard';

/** The poster's view of who is interested, each with their contact. mWeb twin: GigInterestsList. */
export function GigInterestsList({ jobId }: Readonly<{ jobId: string }>) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<GigInterest[] | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => {
    setRows(
      (await graphqlRequest(GigJobInterestsDocument, { job_id: jobId }, { auth: true }))
        .gigJobInterests,
    );
    setFailed(false);
  }, [jobId]);
  useReloadableQuery(load, { onError: () => setFailed(true) });

  let body;
  if (failed && !rows) {
    body = (
      <Text fontSize={13} color="$danger">
        {t('gigJobs.interests.loadFailed')}
      </Text>
    );
  } else if (!rows) {
    body = <Spinner role="progressbar" aria-label={t('mweb.a11y.loading')} color="$primary" />;
  } else if (rows.length === 0) {
    body = (
      <Text fontSize={13} color="$muted">
        {t('gigJobs.interests.empty')}
      </Text>
    );
  } else {
    body = rows.map((row) => (
      <YStack key={row.id} gap={6}>
        <GigContactCard
          contact={row.contact}
          title={row.freelancer_name}
          testID={`gig-interest-${row.id}`}
        />
        {row.skills.length > 0 ? (
          <XStack gap={6} flexWrap="wrap" aria-label={t('gigJobs.interests.skills')}>
            {row.skills.map((skill) => (
              <XStack
                key={skill}
                paddingHorizontal={10}
                paddingVertical={3}
                borderRadius={999}
                backgroundColor="$soft"
              >
                <Text fontSize={12} color="$color">
                  {skill}
                </Text>
              </XStack>
            ))}
          </XStack>
        ) : null}
        {row.message ? (
          <Text fontSize={13} color="$color">
            {row.message}
          </Text>
        ) : null}
      </YStack>
    ));
  }

  return (
    <YStack gap={12} testID="gig-interests">
      <Text fontSize={16} fontWeight="700" color="$color" role="heading">
        {t('gigJobs.interests.title')}
      </Text>
      {body}
    </YStack>
  );
}
