import { Chip, Stack } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import PlatformIcon from '../PlatformIcon';
import { PLATFORM_LABEL } from '../copy';
import type { SocialPlatform } from '../queries';
import { PUBLISH_RULES, textLength } from './publish-rules';

interface Props {
  platforms: SocialPlatform[];
  text: string;
  /** How many media items are picked; the count shows against each limit once it is a carousel. */
  mediaCount: number;
  /** How many collaborators are invited; shown against the cap of each network that has them. */
  collaboratorCount?: number;
}

/**
 * A character count per chosen network against its own limit — X's 280 is
 * the one that bites, and it should show while typing, not on submit. Once
 * more than one item is picked, the media count joins it the same way.
 */
export default function PlatformChecks({ platforms, text, mediaCount, collaboratorCount = 0 }: Readonly<Props>) {
  const { t, locale } = useTranslation();
  if (platforms.length === 0) return null;
  const length = textLength(text);
  const carousel = mediaCount > 1;
  return (
    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }} aria-live="polite" data-testid="social-post-limits">
      {platforms.flatMap((platform) => {
        const rules = PUBLISH_RULES[platform];
        const network = t(PLATFORM_LABEL[platform]);
        const icon = <PlatformIcon platform={platform} fontSize="small" />;
        const chips = [
          <Chip
            key={`${platform}-text`}
            size="small"
            variant="outlined"
            color={length > rules.maxText ? 'error' : 'default'}
            icon={icon}
            label={t('marketing.social.charCount', {
              vars: { network, used: length.toLocaleString(locale), max: rules.maxText.toLocaleString(locale) },
            })}
          />,
        ];
        if (carousel) {
          chips.push(
            <Chip
              key={`${platform}-media`}
              size="small"
              variant="outlined"
              color={mediaCount > rules.maxMedia ? 'error' : 'default'}
              icon={icon}
              label={t('marketing.social.mediaCountLimit', { vars: { network, used: mediaCount, limit: rules.maxMedia } })}
              data-testid={`social-post-media-limit-${platform}`}
            />,
          );
        }
        if (collaboratorCount > 0 && rules.maxCollaborators > 0) {
          chips.push(
            <Chip
              key={`${platform}-collaborators`}
              size="small"
              variant="outlined"
              color={collaboratorCount > rules.maxCollaborators ? 'error' : 'default'}
              icon={icon}
              label={t('marketing.social.collaboratorCountLimit', { vars: { network, used: collaboratorCount, limit: rules.maxCollaborators } })}
              data-testid={`social-post-collaborator-limit-${platform}`}
            />,
          );
        }
        return chips;
      })}
    </Stack>
  );
}
