import { useQuery } from '@apollo/client/react';
import DetailLine from './DetailLine';
import { DetailsHeading, DetailsState } from './AutoPodEnrolledDialog';
import { AUTO_POD_HOST_DETAILS, type AutoPodHostDetails, type AutoPodTableRow } from '../queries';

interface Props {
  row: AutoPodTableRow;
  t: (key: string) => string;
  formatDateTime: (value: string) => string;
}

interface Data {
  hostByUser: AutoPodHostDetails | null;
}

/**
 * The host behind a green Host dot: the person who took the pod, their email,
 * phone and address off their host profile, and when they assigned themselves.
 * The claim carries only their name, so the profile is read on open.
 */
export default function HostDetailsBody({ row, t, formatDateTime }: Readonly<Props>) {
  const claim = row.host_claim;
  const { data, loading, error } = useQuery<Data>(AUTO_POD_HOST_DETAILS, {
    variables: { user_id: claim?.user_id ?? '' },
    skip: !claim,
  });
  const host = data?.hostByUser ?? null;

  return (
    <>
      <DetailsHeading name={host?.full_name || (claim?.host_name ?? '')} />
      <DetailsState loading={loading} failed={error ? t('admin.autoPods.hostDetailsFailed') : null} />
      {host ? (
        <>
          <DetailLine label={t('admin.autoPods.detailEmail')} value={host.email} />
          <DetailLine label={t('admin.autoPods.detailPhone')} value={host.phone} />
          <DetailLine label={t('admin.autoPods.detailAddress')} value={host.full_address} />
        </>
      ) : null}
      <DetailLine
        label={t('admin.autoPods.enrolledAt')}
        value={claim ? formatDateTime(claim.assigned_at) : ''}
      />
    </>
  );
}
