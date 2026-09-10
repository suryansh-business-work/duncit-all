import { useQuery } from '@apollo/client/react';
import DetailLine from './DetailLine';
import { DetailsHeading, DetailsState } from './AutoPodEnrolledDialog';
import { AUTO_POD_CLUB_DETAILS, type AutoPodClubDetails, type AutoPodTableRow } from '../queries';

interface Props {
  row: AutoPodTableRow;
  t: (key: string) => string;
  formatDateTime: (value: string) => string;
}

interface Data {
  club: AutoPodClubDetails | null;
}

/**
 * The club admin behind a green Club Admin dot: the person who claimed the
 * offer, their contact details off the club's admin list, and the club they
 * claimed it for. The claim carries the club and the user id, so the admin's
 * own row is picked out of the club rather than read separately.
 */
export default function ClubDetailsBody({ row, t, formatDateTime }: Readonly<Props>) {
  const claim = row.club_claim;
  const { data, loading, error } = useQuery<Data>(AUTO_POD_CLUB_DETAILS, {
    variables: { club_doc_id: claim?.club_id ?? '' },
    skip: !claim,
  });
  const club = data?.club ?? null;
  // The admin who claimed it, or the club's first admin when the claimer is no
  // longer on the club — a claim outlives a membership change.
  const admins = club?.club_admins ?? [];
  const admin = admins.find((row_) => row_.id === claim?.user_id) ?? admins[0] ?? null;
  const city = [club?.locality, row.location?.city].filter(Boolean).join(', ');

  return (
    <>
      <DetailsHeading name={admin?.name || (claim?.club_name ?? '')} />
      <DetailsState loading={loading} failed={error ? t('admin.autoPods.clubDetailsFailed') : null} />
      {admin ? (
        <>
          <DetailLine label={t('admin.autoPods.detailEmail')} value={admin.email ?? ''} />
          <DetailLine label={t('admin.autoPods.detailPhone')} value={admin.phone ?? ''} />
        </>
      ) : null}
      <DetailLine label={t('admin.autoPods.clubLabel')} value={club?.club_name ?? claim?.club_name ?? ''} />
      <DetailLine label={t('admin.autoPods.detailAddress')} value={city} />
      <DetailLine
        label={t('admin.autoPods.enrolledAt')}
        value={claim ? formatDateTime(claim.claimed_at) : ''}
      />
    </>
  );
}
