import type { ReactElement } from 'react';
import { Box, IconButton } from '@mui/material';
import InstagramIcon from '@mui/icons-material/Instagram';
import LanguageIcon from '@mui/icons-material/Language';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import XIcon from '@mui/icons-material/X';
import YouTubeIcon from '@mui/icons-material/YouTube';
import type { LiteSocialKey, LiteSocialLinks } from '../../../shared/graphql/documents';
import { useWebT } from '../../../shared/i18n';
import { socialLinks } from '../../lib/social';

/** TikTok has no mark in the icon set, so it gets a note; its label says which network it is. */
const ICONS: Record<LiteSocialKey, ReactElement> = {
  instagram: <InstagramIcon fontSize="small" />,
  x: <XIcon fontSize="small" />,
  youtube: <YouTubeIcon fontSize="small" />,
  tiktok: <MusicNoteIcon fontSize="small" />,
  linkedin: <LinkedInIcon fontSize="small" />,
  website: <LanguageIcon fontSize="small" />,
};

/** A person's social links as icon buttons, each named for screen readers ("Asha on Instagram"). */
export function SocialLinks({ name, social }: Readonly<{ name: string; social: LiteSocialLinks | null | undefined }>) {
  const { t } = useWebT();
  const links = socialLinks(social);
  if (links.length === 0) return null;
  return (
    <Box component="ul" aria-label={t('liteWeb.settings.social')} sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, listStyle: 'none', p: 0, m: 0 }} data-testid="user-social">
      {links.map((link) => (
        <li key={link.key}>
          <IconButton
            component="a"
            href={link.href}
            target="_blank"
            rel="noopener noreferrer me"
            aria-label={t('liteWeb.user.socialOn', { vars: { name, network: t(`liteWeb.settings.networks.${link.key}`) } })}
            sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
            data-testid={`user-social-${link.key}`}
          >
            {ICONS[link.key]}
          </IconButton>
        </li>
      ))}
    </Box>
  );
}
