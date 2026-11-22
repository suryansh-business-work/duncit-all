import { Box, Stack, Tooltip, Typography } from '@mui/material';
import AndroidIcon from '@mui/icons-material/Android';
import AppleIcon from '@mui/icons-material/Apple';
import LanguageIcon from '@mui/icons-material/Language';
import type { UserPlatform } from '@duncit/gql-types';
import { platformLabel } from './platforms';

const ICONS: Record<UserPlatform, typeof AndroidIcon> = {
  ANDROID: AndroidIcon,
  IOS: AppleIcon,
  WEB: LanguageIcon,
};

interface Props {
  /** In display order, as the server sends them. */
  platforms: readonly UserPlatform[];
  t: (key: string) => string;
}

/**
 * The platforms an account uses Duncit from, as icons side by side: Android,
 * Apple for iOS, a globe for the web. Each one is named by its tooltip on hover,
 * and the same name is its accessible name (`role="img"` + `aria-label`). The
 * icons stay out of the tab order: they do nothing, and a focusable image tells
 * a keyboard user there is something to operate when there is not.
 */
export default function PlatformIcons({ platforms, t }: Readonly<Props>) {
  if (platforms.length === 0) {
    return (
      <Typography variant="caption" sx={{ color: 'text.secondary' }} data-testid="admin-user-platforms-empty">
        {t('admin.users.noPlatforms')}
      </Typography>
    );
  }
  return (
    <Stack
      direction="row"
      spacing={0.75}
      role="group"
      aria-label={t('admin.users.colPlatforms')}
      data-testid="admin-user-platforms"
      sx={{ alignItems: 'center' }}
    >
      {platforms.map((platform) => {
        const Icon = ICONS[platform];
        const label = platformLabel(platform, t);
        return (
          <Tooltip key={platform} title={label}>
            <Box
              component="span"
              role="img"
              aria-label={label}
              data-testid={`admin-user-platform-${platform}`}
              sx={{ display: 'inline-flex', borderRadius: 1 }}
            >
              <Icon fontSize="small" color="action" />
            </Box>
          </Tooltip>
        );
      })}
    </Stack>
  );
}
