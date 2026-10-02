import { Link as RouterLink } from 'react-router';
import { Stack, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { DuncitIconButton } from '@duncit/buttons';
import type { useRequestPodChange } from '@duncit/pod-change-requests';
import { canOpenPodAttendance, changeRequestMenuKey } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import type { PodRowBase } from '../../../components/PodsTable';

interface Props {
  pod: PodRowBase;
  podsPath: string;
  openChange: ReturnType<typeof useRequestPodChange>['open'];
  onDelete: (pod: PodRowBase) => void;
}

/** Per-row view / attendance / edit / change-admin / delete icons. */
export function ClubPodRowActions({ pod, podsPath, openChange, onDelete }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack direction="row" component="span" sx={{
      justifyContent: "flex-end"
    }}>
      <Tooltip title={t('clubAdmin.pods.podDetails')}>
        <DuncitIconButton size="small" component={RouterLink} to={`${podsPath}/${pod.id}`}>
          <VisibilityIcon fontSize="small" />
        </DuncitIconButton>
      </Tooltip>
      {canOpenPodAttendance(pod) && (
        <Tooltip title={t('clubAdmin.pods.podAttendance')}>
          <DuncitIconButton
            size="small"
            color="success"
            component={RouterLink}
            to={`${podsPath}/${pod.id}/attendance`}
          >
            <CheckCircleOutlinedIcon fontSize="small" />
          </DuncitIconButton>
        </Tooltip>
      )}
      <Tooltip title={t('clubAdmin.pods.editPod')}>
        <DuncitIconButton size="small" component={RouterLink} to={`${podsPath}/${pod.id}/edit`}>
          <EditIcon fontSize="small" />
        </DuncitIconButton>
      </Tooltip>
      {!pod.is_deleted && (
        <Tooltip title={t(changeRequestMenuKey('CLUB_ADMIN'))}>
          <DuncitIconButton
            size="small"
            color="warning"
            onClick={() =>
              openChange({
                podDocId: pod.id,
                role: 'CLUB_ADMIN',
                attendeeCount: pod.pod_attendees?.length ?? 0,
              })
            }
          >
            <SwapHorizIcon fontSize="small" />
          </DuncitIconButton>
        </Tooltip>
      )}
      {/* An already-cancelled pod stays editable, but there is nothing left
          to delete. */}
      {!pod.is_deleted && (
        <Tooltip title={t('clubAdmin.pods.deletePod')}>
          <DuncitIconButton size="small" color="error" onClick={() => onDelete(pod)}>
            <DeleteOutlineIcon fontSize="small" />
          </DuncitIconButton>
        </Tooltip>
      )}
    </Stack>
  );
}
