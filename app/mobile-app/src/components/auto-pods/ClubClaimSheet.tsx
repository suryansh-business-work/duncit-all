import { useCallback, useEffect, useState } from 'react';
import { Text, XStack, YStack } from 'tamagui';
import { autoPodCityLabel, type AutoPodLabels, type AutoPodRow } from '@duncit/utils';

import { DuncitDialog } from '@/components/DuncitDialog';
import { LoadingIndicator } from '@/components/LoadingIndicator';
import { OptionChipRow } from '@/components/home/HomeFilterParts';
import { PillButton } from '@/components/attendance/AttendanceOtpControls';
import { ClubClaimAutoPodDocument, MyAdminClubsForAutoPodDocument } from '@/graphql/auto-pods';
import { useThemeColors } from '@/hooks/useThemeColors';
import { graphqlRequest } from '@/services/graphql.client';
import { toErrorMessage } from '@/utils/errors';

interface Props {
  row: AutoPodRow | null;
  /** The Auto Pod's sub-category — only clubs carrying it may claim, because a
   * pod inherits its category from its club. */
  subCategoryId: string | null;
  labels: AutoPodLabels;
  onClose: () => void;
  onClaimed: () => void;
  formatWhen: (iso: string) => string;
}

type ClubOption = readonly [string, string];

/**
 * "Claim for my club" — the club admin attaches the offer to one of their
 * clubs, which is what gives the resulting pod its club and its category. Only
 * clubs in the Auto Pod's own category AND (once pinned) its city are offered;
 * the server asserts the same rules, so a stale list cannot slip one through.
 *
 * The Tamagui twin of `@duncit/auto-pods`' `ClubClaimDialog` (rule 27).
 */
export function ClubClaimSheet({
  row,
  subCategoryId,
  labels,
  onClose,
  onClaimed,
  formatWhen,
}: Readonly<Props>) {
  const { warning } = useThemeColors();
  const [clubs, setClubs] = useState<ClubOption[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [clubId, setClubId] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const autoPodId = row?.id ?? null;
  const pinnedLocationId = row?.location?.location_id ?? null;

  useEffect(() => {
    setClubId('');
    setFailure('');
    setLoaded(false);
  }, [autoPodId]);

  useEffect(() => {
    if (!autoPodId) return;
    let active = true;
    graphqlRequest(MyAdminClubsForAutoPodDocument, undefined, { auth: true })
      .then((res) => {
        if (!active) return;
        const eligible = res.myAdminClubs
          .filter(
            (club) =>
              (!subCategoryId || String(club.category_id ?? '') === subCategoryId) &&
              (!pinnedLocationId || club.location_id === pinnedLocationId),
          )
          .map((club) => [club.id, club.club_name] as ClubOption);
        setClubs(eligible);
        setLoaded(true);
        // One eligible club is not a choice — preselect it.
        const only = eligible.length === 1 ? eligible[0] : undefined;
        if (only) setClubId(only[0]);
      })
      .catch(() => active && setFailure(labels.loadFailed));
    return () => {
      active = false;
    };
  }, [autoPodId, subCategoryId, pinnedLocationId, labels.loadFailed]);

  const claim = useCallback(async () => {
    if (!autoPodId || !clubId) return;
    setBusy(true);
    setFailure('');
    try {
      await graphqlRequest(
        ClubClaimAutoPodDocument,
        { auto_pod_doc_id: autoPodId, club_id: clubId },
        { auth: true },
      );
      onClaimed();
    } catch (err: unknown) {
      setFailure(toErrorMessage(err, labels.claimedElsewhere));
    } finally {
      setBusy(false);
    }
  }, [autoPodId, clubId, labels.claimedElsewhere, onClaimed]);

  const footer = (
    <XStack gap={10}>
      <YStack flex={1}>
        <PillButton
          testID="auto-pod-claim-cancel"
          label={labels.dismiss}
          onPress={onClose}
          variant="ghost"
          disabled={false}
        />
      </YStack>
      <YStack flex={1}>
        <PillButton
          testID="auto-pod-claim-confirm"
          label={labels.claimForClubCta}
          onPress={() => {
            claim().catch(() => undefined);
          }}
          variant="solid"
          disabled={!clubId || busy}
        />
      </YStack>
    </XStack>
  );

  const venue = row?.venue_claim;
  const noClubInCity = !!pinnedLocationId && loaded && clubs.length === 0;

  return (
    <DuncitDialog
      open={!!row}
      onClose={onClose}
      testID="auto-pod-claim-sheet"
      title={labels.confirmClaim}
      subtitle={labels.confirmClaimBody}
      closeLabel={labels.dismiss}
      footer={footer}
    >
      <YStack gap={14}>
        {row ? (
          <Text fontSize={14} fontWeight="700" color="$color">
            {row.pod_title}
          </Text>
        ) : null}

        {row?.location ? (
          <Text testID="auto-pod-claim-city" fontSize={12.5} color="$color">
            {labels.pinnedTo(autoPodCityLabel(row.location))}
          </Text>
        ) : null}

        {venue ? (
          <Text fontSize={12.5} color="$color">
            {`${venue.venue_name} · ${formatWhen(venue.pod_date_time)}`}
          </Text>
        ) : null}

        {noClubInCity ? (
          <Text testID="auto-pod-no-club-in-city" fontSize={12} color={warning}>
            {labels.noClubInCity(autoPodCityLabel(row?.location))}
          </Text>
        ) : null}

        <YStack gap={8}>
          <Text fontSize={12} fontWeight="700" color="$color">
            {labels.pickClub}
          </Text>
          {/* Reading the caller's clubs is a round trip; an empty chip column
              mid-read reads as "you administer no club in this city". */}
          {loaded ? null : <LoadingIndicator testID="auto-pod-clubs-loading" />}
          <OptionChipRow
            layout="column"
            testIDPrefix="auto-pod-club"
            options={clubs}
            value={clubId}
            onSelect={setClubId}
          />
        </YStack>

        {busy ? <LoadingIndicator testID="auto-pod-claim-busy" /> : null}

        {failure ? (
          <Text testID="auto-pod-claim-error" fontSize={12} color="$danger">
            {failure}
          </Text>
        ) : null}
      </YStack>
    </DuncitDialog>
  );
}
