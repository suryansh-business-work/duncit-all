import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import { DuncitButton } from '@duncit/buttons';
import { Link as RouterLink } from 'react-router';
import { formatDate } from '../../utils/dateFormat';
import IconDisc from '../account-page/IconDisc';
import HostPodsSection, { HOST_PODS } from './HostPodsSection';
import { useTranslation } from '../../i18n/useTranslation';

const MY_HOST = gql`
  query ProfileMyHost {
    myHost {
      id
      user_id
      status
      step_completed
      reviewer_notes
      submitted_at
      approved_at
    }
    me {
      user_id
      roles
    }
  }
`;

export default function UserHostPanel() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<any>(MY_HOST, { fetchPolicy: 'cache-and-network' });
  const host = data?.myHost;
  const myUserId: string | undefined = data?.me?.user_id || host?.user_id;
  const isHost = (data?.me?.roles ?? []).includes('HOST');
  const isApproved = host?.status === 'APPROVED';
  const completed = Math.min(host?.step_completed ?? 0, 4);
  const labels = ['Profile', 'Docs', 'Skills', 'Submit'];

  const podsQuery = useQuery<any>(HOST_PODS, {
    variables: { host_user_id: myUserId },
    skip: !isApproved || !myUserId,
    fetchPolicy: 'cache-and-network',
  });
  const pods = podsQuery.data?.pods ?? [];

  if (loading && !data) return <CircularProgress size={22} />;
  if (error) return <Alert severity="error">{error.message}</Alert>;
  if (!host) {
    return (
      <Stack spacing={1.5}>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          {isHost
            ? "You're a host. Complete your host profile to add payout and verification details."
            : 'You have not started a host profile yet.'}
        </Typography>
        <DuncitButton component={RouterLink} to="/become-host" variant="outlined" size="small">
          {isHost ? 'Complete host profile' : 'Become a Host'}
        </DuncitButton>
      </Stack>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1.25} sx={{
        alignItems: "center"
      }}>
        <IconDisc size={40}>
          <WorkspacePremiumIcon />
        </IconDisc>
        <Typography sx={{ minWidth: 0, flex: 1, fontSize: 15, fontWeight: 600 }}>{t('mweb.profile.hostApplication')}</Typography>
        <Chip size="small" label={host.status} color={isApproved ? 'success' : 'warning'} />
      </Stack>
      <Stack direction="row" spacing={0.75} sx={{
        alignItems: "center"
      }}>
        {labels.map((label, index) => {
          const done = index < completed || isApproved;
          return (
            <Box key={label} sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ height: 4, borderRadius: 99, bgcolor: done ? 'primary.main' : 'action.hover', mb: 0.6 }} />
              <Typography variant="caption" color={done ? 'primary.main' : 'text.secondary'} sx={{ fontSize: 11, fontWeight: 600 }} noWrap>
                {label}
              </Typography>
            </Box>
          );
        })}
      </Stack>
      {(host.approved_at || host.submitted_at) && (
        <Typography variant="caption" sx={{
          color: "text.secondary"
        }}>
          {host.approved_at ? `Approved ${formatDate(host.approved_at)}` : `Submitted ${formatDate(host.submitted_at)}`}
        </Typography>
      )}
      {host.reviewer_notes && <Alert severity="info">{host.reviewer_notes}</Alert>}
      <DuncitButton
        component={RouterLink}
        to="/become-host"
        variant="contained"
        size="large"
      >
        {isApproved ? 'Update host profile' : `Resume - step ${Math.min(completed + 1, 4)} of 4`}
      </DuncitButton>

      {isApproved && (
        <HostPodsSection pods={pods} loading={podsQuery.loading && !podsQuery.data} />
      )}
    </Stack>
  );
}
