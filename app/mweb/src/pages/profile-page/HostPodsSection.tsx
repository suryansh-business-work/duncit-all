import { gql } from '@apollo/client';
import {
  Avatar,
  Box,
  Chip,
  CircularProgress,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import { useNavigate } from 'react-router';
import { formatDateTime } from '../../utils/dateFormat';
import { useTranslation } from '../../i18n/useTranslation';

export const HOST_PODS = gql`
  query ProfileHostPods($host_user_id: ID!) {
    pods(filter: { host_user_id: $host_user_id }) {
      id
      pod_id
      club_slug
      pod_title
      pod_date_time
      pod_images_and_videos {
        url
        type
      }
    }
  }
`;

interface HostPodsSectionProps {
  pods: any[];
  loading: boolean;
}

/** Pods hosted by the approved host — list, empty state and loader. Split out
 * of UserHostPanel to keep that file a layout. */
export default function HostPodsSection({ pods, loading }: Readonly<HostPodsSectionProps>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const emptyOrList =
    pods.length === 0 ? (
      <Typography
        variant="body2"
        sx={{
          color: "text.secondary",
          mt: 1
        }}>
        {t('mweb.profile.noPodsYet')}
      </Typography>
    ) : (
      <List dense disablePadding sx={{ mt: 0.5 }}>
        {pods.map((p: any) => {
          const cover =
            (p.pod_images_and_videos ?? []).find((m: any) => m?.type !== 'VIDEO')?.url ||
            p.pod_images_and_videos?.[0]?.url;
          return (
            <ListItemButton
              key={p.id}
              onClick={() =>
                p.club_slug && p.pod_id ? navigate(`/club/${p.club_slug}/pod/${p.pod_id}`) : null
              }
            >
              <ListItemAvatar>
                <Avatar src={cover || undefined} variant="rounded" sx={{ borderRadius: '12px' }}>
                  <EventIcon fontSize="small" />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={p.pod_title}
                secondary={formatDateTime(p.pod_date_time) || undefined}
              />
            </ListItemButton>
          );
        })}
      </List>
    );

  return (
    <Box>
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: "center",
          mt: 1
        }}>
        <Typography variant="subtitle2">{t('mweb.common.yourPods')}</Typography>
        <Chip size="small" label={pods.length} />
      </Stack>
      {loading ? <CircularProgress size={20} sx={{ mt: 1 }} /> : emptyOrList}
    </Box>
  );
}
