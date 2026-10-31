import type { SvgIconProps } from '@mui/material';
import AlternateEmailIcon from '@mui/icons-material/AlternateEmail';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import XIcon from '@mui/icons-material/X';
import YouTubeIcon from '@mui/icons-material/YouTube';
import type { SocialPlatform } from './queries';

// Material has no Threads mark; the @ glyph is how Threads names a profile.
const ICONS = {
  INSTAGRAM: InstagramIcon,
  FACEBOOK: FacebookIcon,
  THREADS: AlternateEmailIcon,
  YOUTUBE: YouTubeIcon,
  LINKEDIN: LinkedInIcon,
  X: XIcon,
} as const;

/**
 * A network's mark in the surrounding ink. Decorative: every place that draws
 * one also names the network in text beside it.
 */
export default function PlatformIcon({ platform, ...props }: Readonly<{ platform: SocialPlatform } & SvgIconProps>) {
  const Icon = ICONS[platform];
  return <Icon aria-hidden focusable="false" {...props} />;
}
