import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';
import { Stack, Tooltip } from '@mui/material';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import EditIcon from '@mui/icons-material/Edit';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { DuncitIconButton } from '@duncit/buttons';
import { canOpenPodAttendance } from '@duncit/utils';
import type { ClubAdminPodRow } from './types';
import { useTranslation } from '../../i18n/useTranslation';

type ActionColor = 'default' | 'success' | 'error';

interface Action {
  key: string;
  /** The Tooltip title is the button's accessible name — no aria-label beside it. */
  title: string;
  icon: ReactNode;
  color?: ActionColor;
  /** A link when the action is a page; a handler when it opens a dialog. */
  to?: string;
  onClick?: () => void;
}

/** One icon action — a router link for a page, a button for a dialog. */
function ActionButton({ action }: Readonly<{ action: Action }>) {
  const color = action.color ?? 'default';
  if (action.to) {
    return (
      <Tooltip title={action.title}>
        <DuncitIconButton size="small" color={color} component={RouterLink} to={action.to}>
          {action.icon}
        </DuncitIconButton>
      </Tooltip>
    );
  }
  return (
    <Tooltip title={action.title}>
      <DuncitIconButton size="small" color={color} onClick={action.onClick}>
        {action.icon}
      </DuncitIconButton>
    </Tooltip>
  );
}

interface Props {
  pod: ClubAdminPodRow;
  /** `/clubs/:clubId/pods` — the details and edit routes hang off it. */
  podsPath: string;
  onActivity: () => void;
  onDelete: () => void;
}

/**
 * The actions on one pod row. Attendance only for a pod that ran or is
 * running (`canOpenPodAttendance`), delete only for one not already
 * cancelled — a cancelled pod stays editable, but there is nothing left to
 * delete.
 */
export default function ClubPodActions({ pod, podsPath, onActivity, onDelete }: Readonly<Props>) {
  const { t } = useTranslation();
  const actions: Action[] = [
    {
      key: 'details',
      title: t('clubAdmin.pods.podDetails'),
      icon: <VisibilityIcon fontSize="small" />,
      to: `${podsPath}/${pod.id}`,
    },
  ];
  if (canOpenPodAttendance(pod)) {
    actions.push({
      key: 'attendance',
      title: t('clubAdmin.pods.podAttendance'),
      icon: <CheckCircleOutlinedIcon fontSize="small" />,
      color: 'success',
      to: `/host/pod/${pod.id}/attendance`,
    });
  }
  actions.push(
    {
      key: 'edit',
      title: t('clubAdmin.pods.editPod'),
      icon: <EditIcon fontSize="small" />,
      to: `${podsPath}/${pod.id}/edit`,
    },
    {
      key: 'activity',
      title: t('clubAdmin.pods.aiMonitoring'),
      icon: <MonitorHeartIcon fontSize="small" />,
      onClick: onActivity,
    },
  );
  if (!pod.is_deleted) {
    actions.push({
      key: 'delete',
      title: t('clubAdmin.pods.deletePod'),
      icon: <DeleteOutlineIcon fontSize="small" />,
      color: 'error',
      onClick: onDelete,
    });
  }

  return (
    <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
      {actions.map((action) => (
        <ActionButton key={action.key} action={action} />
      ))}
    </Stack>
  );
}
