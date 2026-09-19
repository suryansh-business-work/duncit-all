import type { SvgIconProps } from '@mui/material';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import XIcon from '@mui/icons-material/X';
import YouTubeIcon from '@mui/icons-material/YouTube';
import type { SocialPlatform } from './queries';

const ICONS = {
  LINKEDIN: LinkedInIcon,
  FACEBOOK: FacebookIcon,
  INSTAGRAM: InstagramIcon,
  X: XIcon,
  YOUTUBE: YouTubeIcon,
} as const;

/**
 * A network's mark in the surrounding ink. Decorative: every place that draws
 * one also names the network in text beside it.
 */
export default function PlatformIcon({ platform, ...props }: Readonly<{ platform: SocialPlatform } & SvgIconProps>) {
  const Icon = ICONS[platform];
  return <Icon aria-hidden focusable="false" {...props} />;
}
