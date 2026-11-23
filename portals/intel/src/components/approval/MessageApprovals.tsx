import { useQuery } from '@apollo/client/react';
import { Skeleton } from '@mui/material';
import { useBootstrap } from '../IntelBootstrap';
import { INTEL_APPROVAL, type ApprovalData } from '../../graphql/approvals';
import { mayDecide } from '../../lib/approval';
import ApprovalCard from './ApprovalCard';

/** The approval cards under an answer that proposed changes. */
function OneApproval({ id }: Readonly<{ id: string }>) {
  const { data: boot } = useBootstrap();
  const { data, loading } = useQuery<ApprovalData>(INTEL_APPROVAL, { variables: { id }, fetchPolicy: 'cache-and-network' });
  if (loading && !data) return <Skeleton variant="rounded" height={120} sx={{ mt: 1 }} />;
  if (!data) return null;
  return <ApprovalCard approval={data.intelApproval} canDecide={mayDecide(data.intelApproval, boot?.me)} />;
}

export default function MessageApprovals({ ids }: Readonly<{ ids: string[] }>) {
  return (
    <>
      {ids.map((id) => (
        <OneApproval key={id} id={id} />
      ))}
    </>
  );
}
