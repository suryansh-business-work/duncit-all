import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import PaletteIcon from '@mui/icons-material/Palette';
import PsychologyIcon from '@mui/icons-material/Psychology';
import type { DuncitTabItem } from '@duncit/tabs';
import type { useTranslation } from '@duncit/shell';

export type SettingsTab = 'assets' | 'theme' | 'prompts';
type Translate = ReturnType<typeof useTranslation>['t'];

/** The three sections of Email Templates › Settings, selected by the URL's ?tab=. */
export const settingsTabs = (t: Translate): DuncitTabItem<SettingsTab>[] => [
  { value: 'assets', label: t('crm.emailSettings.tabAssets'), icon: <PhotoLibraryIcon fontSize="small" />, iconPosition: 'start' },
  { value: 'theme', label: t('crm.emailSettings.tabTheme'), icon: <PaletteIcon fontSize="small" />, iconPosition: 'start' },
  { value: 'prompts', label: t('crm.emailSettings.tabPrompts'), icon: <PsychologyIcon fontSize="small" />, iconPosition: 'start' },
];
