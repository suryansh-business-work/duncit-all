import { Box, Stack, Tooltip, Typography } from '@mui/material';
import AndroidIcon from '@mui/icons-material/Android';
import AppleIcon from '@mui/icons-material/Apple';
import LanguageIcon from '@mui/icons-material/Language';
import { useTranslation } from '../i18n/useTranslation';
import { USER_PLATFORMS, orderedPlatforms, platformLabel, type UserPlatformKey } from './platforms';

const ICONS: Record<UserPlatformKey, typeof AndroidIcon> = {
  ANDROID: AndroidIcon,
  IOS: AppleIcon,
  WEB: LanguageIcon,
};

export interface PlatformIconsProps {
  /** The platforms the account has used, in any order. */
  platforms: readonly string[] | null | undefined;
  /**
   * `used` (default) shows only the platforms used, or "None recorded yet".
   * `all` always shows Android, iOS and the web: the used ones dark, the rest
   * dimmed, so the row reads the same for every account.
   */
  variant?: 'used' | 'all';
  /** Prefix for the test ids: `<testId>`, `<testId>-<PLATFORM>`, `<testId>-empty`. */
  testId?: string;
}

/**
 * Where an account uses Duncit from, as icons side by side: Android, Apple for
 * iOS, a globe for the web. Each icon is named by its tooltip on hover, and the
 * same name (with "used" / "not used" in the `all` variant) is its accessible
 * name (`role="img"` + `aria-label`), so the state never rests on colour alone.
 * The icons stay out of the tab order: they do nothing, and a focusable image
 * tells a keyboard user there is something to operate when there is not.
 */
export function PlatformIcons({ platforms, variant = 'used', testId = 'platform-icons' }: Readonly<PlatformIconsProps>) {
  const { t } = useTranslation();
  const used = orderedPlatforms(platforms);
  if (variant === 'used' && used.length === 0) {
    return (
      <Typography variant="caption" sx={{ color: 'text.secondary' }} data-testid={`${testId}-empty`}>
        {t('ui.platforms.none')}
      </Typography>
    );
  }
  const shown = variant === 'all' ? USER_PLATFORMS : used;
  return (
    <Stack
      direction="row"
      spacing={0.75}
      role="group"
      aria-label={t('ui.platforms.label')}
      data-testid={testId}
      sx={{ alignItems: 'center' }}
    >
      {shown.map((platform) => {
        const Icon = ICONS[platform];
        const name = platformLabel(platform, t);
        const isUsed = used.includes(platform);
        let label = name;
        if (variant === 'all') {
          label = isUsed
            ? t('ui.platforms.used', { vars: { platform: name } })
            : t('ui.platforms.notUsed', { vars: { platform: name } });
        }
        return (
          <Tooltip key={platform} title={label}>
            <Box
              component="span"
              role="img"
              aria-label={label}
              data-testid={`${testId}-${platform}`}
              data-used={isUsed}
              sx={{ display: 'inline-flex', borderRadius: 1, color: isUsed ? 'text.primary' : 'text.disabled' }}
            >
              <Icon fontSize="small" color="inherit" />
            </Box>
          </Tooltip>
        );
      })}
    </Stack>
  );
}
