import { useState } from 'react';
import { IconButton, Menu, MenuItem, Stack, Tooltip, Typography } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { StatusChip } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import {
  HR_EMPLOYEE_STATUS_COLORS,
  HR_EMPLOYEE_STATUS_KEYS,
  canCancelHrExit,
  canRehireHrEmployee,
  canScheduleHrExit,
  isHrRecordEditable,
  type HrEmployeeRecord,
} from '@duncit/utils';

export type ProfileDialog = 'personal' | 'job' | 'pay' | 'bank' | 'exit' | 'rehire';

interface Props {
  employee: HrEmployeeRecord;
  onOpen: (dialog: ProfileDialog) => void;
  onCancelExit: () => void;
}

/** Name, code, job line and status, with the actions this record's status allows. */
export default function ProfileHeader({ employee, onOpen, onCancelExit }: Readonly<Props>) {
  const { t } = useTranslation();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const editable = isHrRecordEditable(employee.status);
  const items: { key: string; label: string; show: boolean; run: () => void }[] = [
    { key: 'personal', label: t('hrEmployee.profile.editPersonal'), show: true, run: () => onOpen('personal') },
    { key: 'job', label: t('hrEmployee.profile.changeJob'), show: editable, run: () => onOpen('job') },
    { key: 'pay', label: t('hrEmployee.profile.revisePay'), show: editable, run: () => onOpen('pay') },
    { key: 'bank', label: t('hrEmployee.profile.editBank'), show: editable, run: () => onOpen('bank') },
    { key: 'exit', label: t('hrEmployee.profile.recordExit'), show: canScheduleHrExit(employee.status), run: () => onOpen('exit') },
    { key: 'cancelExit', label: t('hrEmployee.profile.cancelExit'), show: canCancelHrExit(employee.status), run: onCancelExit },
    { key: 'rehire', label: t('hrEmployee.profile.rehire'), show: canRehireHrEmployee(employee.status), run: () => onOpen('rehire') },
  ];
  const actionsLabel = t('hrEmployee.profile.actionsFor', { vars: { name: employee.full_name } });

  return (
    <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <div>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
            {employee.full_name}
          </Typography>
          <StatusChip status={employee.status} colorMap={HR_EMPLOYEE_STATUS_COLORS} label={t(HR_EMPLOYEE_STATUS_KEYS[employee.status])} />
        </Stack>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {[employee.employee_code, employee.job.job_title, employee.job.department].filter(Boolean).join(' · ')}
        </Typography>
      </div>
      <Tooltip title={t('hrEmployee.profile.actions')}>
        <IconButton onClick={(event) => setAnchor(event.currentTarget)} aria-label={actionsLabel} aria-haspopup="menu" data-testid="hr-profile-actions">
          <MoreVertIcon />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchor} open={anchor !== null} onClose={() => setAnchor(null)}>
        {items
          .filter((item) => item.show)
          .map((item) => (
            <MenuItem
              key={item.key}
              onClick={() => {
                setAnchor(null);
                item.run();
              }}
              data-testid={`hr-profile-action-${item.key}`}
            >
              {item.label}
            </MenuItem>
          ))}
      </Menu>
    </Stack>
  );
}
