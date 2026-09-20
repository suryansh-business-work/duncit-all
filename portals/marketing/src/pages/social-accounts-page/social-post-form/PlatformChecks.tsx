import { Chip, Stack } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import PlatformIcon from '../PlatformIcon';
import { PLATFORM_LABEL } from '../copy';
import type { SocialPlatform } from '../queries';
import { PUBLISH_RULES, textLength } from './publish-rules';

/**
 * A character count per chosen network against its own limit — X's 280 is
 * the one that bites, and it should show while typing, not on submit.
 */
export default function PlatformChecks({ platforms, text }: Readonly<{ platforms: SocialPlatform[]; text: string }>) {
  const { t, locale } = useTranslation();
  if (platforms.length === 0) return null;
  const length = textLength(text);
  return (
    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }} aria-live="polite" data-testid="social-post-limits">
      {platforms.map((platform) => {
        const max = PUBLISH_RULES[platform].maxText;
        const over = length > max;
        return (
          <Chip
            key={platform}
            size="small"
            variant="outlined"
            color={over ? 'error' : 'default'}
            icon={<PlatformIcon platform={platform} fontSize="small" />}
            label={t('marketing.social.charCount', {
              vars: { network: t(PLATFORM_LABEL[platform]), used: length.toLocaleString(locale), max: max.toLocaleString(locale) },
            })}
          />
        );
      })}
    </Stack>
  );
}
