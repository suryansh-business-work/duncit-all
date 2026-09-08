import { useNavigate } from 'react-router';
import { Alert, Box, Drawer, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitIconButton } from '@duncit/buttons';
import { BackButton } from '@duncit/ui';
import { useTranslation } from '../../i18n';
import { REGION_CLUB_PODS, REGION_HOST_PODS } from '../queries';
import RegionClubsTable from './RegionClubsTable';
import RegionPodsTable from './RegionPodsTable';
import { LEVEL_SUBTITLE_KEYS, type DrillLevel } from './levels';

interface Props {
  /** Innermost level last. Empty keeps the drawer closed. */
  stack: DrillLevel[];
  currency: string;
  onPush: (level: DrillLevel) => void;
  onPop: () => void;
  onClose: () => void;
}

/**
 * The one drill-down surface: Club Admin -> Clubs -> Pods, or Host -> Pods.
 *
 * A drawer rather than more boxes on the canvas or a second page: a busy host
 * runs dozens of pods, and dozens of nodes hanging off one box is a canvas
 * nobody can read. The pods are also the only level with columns worth sorting.
 *
 * Everything it shows is scoped SERVER-SIDE to this region — a host runs pods
 * elsewhere too, and those are not this manager's to see.
 */
export default function RegionDrillDrawer({
  stack,
  currency,
  onPush,
  onPop,
  onClose,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const level = stack.at(-1) ?? null;
  const parent = stack.length > 1 ? stack[stack.length - 2] : null;
  const openPod = (podDocId: string) => navigate(`/pods/${podDocId}`);

  return (
    <Drawer
      anchor="right"
      open={!!level}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 640, lg: 820 }, p: 2.5 } } }}
    >
      {level && (
        <>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {parent && <BackButton onClick={onPop}>{parent.label}</BackButton>}
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {level.label}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {t(LEVEL_SUBTITLE_KEYS[level.kind])}
              </Typography>
            </Box>
            <DuncitIconButton aria-label={t('shell.common.close')} onClick={onClose}>
              <CloseIcon />
            </DuncitIconButton>
          </Stack>

          {level.kind === 'CLUBS' && (
            <RegionClubsTable
              clubAdminId={level.id}
              onOpenClub={(club) =>
                onPush({ kind: 'CLUB_PODS', id: club.id, label: club.club_name })
              }
            />
          )}
          {level.kind !== 'CLUBS' && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {t('partners.regional.openPodHint')}
            </Alert>
          )}

          {level.kind === 'CLUB_PODS' && (
            <RegionPodsTable
              document={REGION_CLUB_PODS}
              rootField="regionClubPods"
              variables={{ club_id: level.id }}
              scopeKey={level.id}
              currency={currency}
              emptyText={t('partners.regional.noPodsForClub')}
              onOpenPod={openPod}
            />
          )}
          {level.kind === 'HOST_PODS' && (
            <RegionPodsTable
              document={REGION_HOST_PODS}
              rootField="regionHostPods"
              variables={{ host_user_id: level.id }}
              scopeKey={level.id}
              currency={currency}
              emptyText={t('partners.regional.noPodsForHost')}
              onOpenPod={openPod}
            />
          )}
        </>
      )}
    </Drawer>
  );
}
