import { memo } from 'react';
import type { SvgIconProps } from '@mui/material';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardDoubleArrowDownIcon from '@mui/icons-material/KeyboardDoubleArrowDown';
import KeyboardDoubleArrowUpIcon from '@mui/icons-material/KeyboardDoubleArrowUp';
import type { ManualTestPriority } from '@duncit/gql-types';
import { useTranslation } from '@duncit/shell';
import { PRIORITY_KEYS } from '../../pages/manual/shared/vocabulary';

type Icon = typeof DragHandleIcon;

const ICONS: Readonly<Record<ManualTestPriority, { Icon: Icon; color: SvgIconProps['color'] }>> = {
  HIGHEST: { Icon: KeyboardDoubleArrowUpIcon, color: 'error' },
  HIGH: { Icon: KeyboardArrowUpIcon, color: 'warning' },
  MEDIUM: { Icon: DragHandleIcon, color: 'action' },
  LOW: { Icon: KeyboardArrowDownIcon, color: 'info' },
  LOWEST: { Icon: KeyboardDoubleArrowDownIcon, color: 'info' },
};

interface Props {
  priority: ManualTestPriority;
  fontSize?: SvgIconProps['fontSize'];
}

/** A priority as the arrow testers read at a glance, named for screen readers. */
export const PriorityIcon = memo(function PriorityIcon({ priority, fontSize = 'small' }: Readonly<Props>) {
  const { t } = useTranslation();
  const { Icon, color } = ICONS[priority];
  return <Icon color={color} fontSize={fontSize} titleAccess={t(PRIORITY_KEYS[priority])} />;
});
