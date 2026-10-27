import { memo } from 'react';
import type { SvgIconProps } from '@mui/material';
import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined';
import ExploreOutlinedIcon from '@mui/icons-material/ExploreOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import ReplayOutlinedIcon from '@mui/icons-material/ReplayOutlined';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import type { ManualTestCaseType } from '@duncit/gql-types';
import { useTranslation } from '@duncit/shell';
import { TYPE_KEYS } from '../../pages/manual/shared/vocabulary';

type Icon = typeof BugReportOutlinedIcon;

const ICONS: Readonly<Record<ManualTestCaseType, { Icon: Icon; color: SvgIconProps['color'] }>> = {
  TEST_CASE: { Icon: FactCheckOutlinedIcon, color: 'primary' },
  BUG: { Icon: BugReportOutlinedIcon, color: 'error' },
  REGRESSION: { Icon: ReplayOutlinedIcon, color: 'secondary' },
  EXPLORATORY: { Icon: ExploreOutlinedIcon, color: 'info' },
  TASK: { Icon: TaskAltOutlinedIcon, color: 'success' },
};

interface Props {
  type: ManualTestCaseType;
  fontSize?: SvgIconProps['fontSize'];
}

/** A case type as an icon whose name screen readers (and the hover title) say. */
export const CaseTypeIcon = memo(function CaseTypeIcon({ type, fontSize = 'small' }: Readonly<Props>) {
  const { t } = useTranslation();
  const { Icon, color } = ICONS[type];
  return <Icon color={color} fontSize={fontSize} titleAccess={t(TYPE_KEYS[type])} />;
});
