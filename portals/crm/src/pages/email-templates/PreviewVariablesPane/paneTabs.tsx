import VisibilityIcon from '@mui/icons-material/Visibility';
import TuneIcon from '@mui/icons-material/Tune';
import type { DuncitTabItem } from '@duncit/tabs';
import type { useTranslation } from '@duncit/shell';

export type PaneTab = 'preview' | 'code';

/** The strip, as data — the editor hook reads the same list to validate the URL. */
type Translate = ReturnType<typeof useTranslation>['t'];

export const paneTabs = (t: Translate): DuncitTabItem<PaneTab>[] =>[
  {
    value: 'preview',
    label: t('crm.common.preview'),
    icon: <VisibilityIcon fontSize="small" />,
    iconPosition: 'start',
    sx: { minHeight: 40 },
  },
  {
    value: 'code',
    label: t('crm.emailTemplates.variables'),
    icon: <TuneIcon fontSize="small" />,
    iconPosition: 'start',
    sx: { minHeight: 40 },
  },
];
