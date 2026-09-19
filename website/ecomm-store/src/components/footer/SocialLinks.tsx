import { Box, Stack } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import PinterestIcon from '@mui/icons-material/Pinterest';
import TelegramIcon from '@mui/icons-material/Telegram';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import XIcon from '@mui/icons-material/X';
import YouTubeIcon from '@mui/icons-material/YouTube';
import { DuncitIconButton } from '@duncit/buttons';

import type { StoreSocialLink } from '../../graphql/settings';
import { useStoreT } from '../../i18n';
import { CIRCLE_BUTTON_SX } from '../CircleButton';

/** Which network a link's host belongs to; anything unrecognised gets a plain link mark. */
const NETWORK_ICONS: ReadonlyArray<readonly [RegExp, SvgIconComponent]> = [
  [/(^|\.)instagram\.com$/, InstagramIcon],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me)$/, FacebookIcon],
  [/(^|\.)linkedin\.com$/, LinkedInIcon],
  [/(^|\.)(x\.com|twitter\.com)$/, XIcon],
  [/(^|\.)(youtube\.com|youtu\.be)$/, YouTubeIcon],
  [/(^|\.)(wa\.me|whatsapp\.com)$/, WhatsAppIcon],
  [/(^|\.)pinterest\.[a-z.]+$/, PinterestIcon],
  [/(^|\.)(t\.me|telegram\.org|telegram\.me)$/, TelegramIcon],
];

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

function iconFor(url: string): SvgIconComponent {
  const host = hostOf(url);
  return NETWORK_ICONS.find(([pattern]) => pattern.test(host))?.[1] ?? LinkRoundedIcon;
}

const testIdOf = (label: string): string => label.toLowerCase().replaceAll(/\W+/g, '-');

/** The operator's social links as round icon buttons, each named after its network. */
export function SocialLinks({ links }: Readonly<{ links: StoreSocialLink[] }>) {
  const { t } = useStoreT();
  if (links.length === 0) return null;
  return (
    <Stack direction="row" spacing={1} component="ul" aria-label={t('ecommStore.footer.social')} sx={{ listStyle: 'none', p: 0, m: 0 }} data-testid="footer-social">
      {links.map((link) => {
        const Icon = iconFor(link.url);
        return (
          <Box component="li" key={link.url}>
            <DuncitIconButton
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('ecommStore.footer.followOn', { vars: { name: link.label } })}
              sx={CIRCLE_BUTTON_SX}
              data-testid={`footer-social-${testIdOf(link.label)}`}
            >
              <Icon />
            </DuncitIconButton>
          </Box>
        );
      })}
    </Stack>
  );
}
