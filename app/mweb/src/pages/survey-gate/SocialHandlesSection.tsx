import type { ReactElement } from 'react';
import { Card, Stack, Typography } from '@mui/material';
import XIcon from '@mui/icons-material/X';
import InstagramIcon from '@mui/icons-material/Instagram';
import YouTubeIcon from '@mui/icons-material/YouTube';
import FacebookIcon from '@mui/icons-material/Facebook';
import LanguageIcon from '@mui/icons-material/Language';
import { DuncitButton } from '@duncit/buttons';
import { socialHandleLinks, type SocialHandleKey, type SocialHandles } from '@duncit/onboarding';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  /** `onboardingIntro.social_handles` — null until the intro query answers. */
  handles?: SocialHandles | null;
}

/** Keys are written out in full: the translation gate only sees literal keys. */
const PLATFORMS: Record<SocialHandleKey, { labelKey: string; icon: ReactElement }> = {
  x_url: { labelKey: 'mweb.socialHandles.x', icon: <XIcon /> },
  instagram_url: { labelKey: 'mweb.socialHandles.instagram', icon: <InstagramIcon /> },
  youtube_url: { labelKey: 'mweb.socialHandles.youtube', icon: <YouTubeIcon /> },
  facebook_url: { labelKey: 'mweb.socialHandles.facebook', icon: <FacebookIcon /> },
  website_url: { labelKey: 'mweb.socialHandles.website', icon: <LanguageIcon /> },
};

/**
 * "Social Media Handles" on the survey pages behind each "Tell me more":
 * Duncit's links, set in Onboarding > Onboarding Intro, each with its icon.
 * Renders nothing when no link is set. Native twin:
 * components/survey-onboarding/SocialHandlesSection.
 */
export default function SocialHandlesSection({ handles }: Readonly<Props>) {
  const { t } = useTranslation();
  const links = socialHandleLinks(handles);
  if (links.length === 0) return null;

  return (
    <Card
      component="section"
      data-testid="survey-gate-social-handles"
      aria-labelledby="survey-gate-social-handles-title"
      sx={{ p: 2, mt: 3 }}
    >
      <Typography id="survey-gate-social-handles-title" component="h2" sx={{ fontSize: 16, fontWeight: 600, mb: 1.5 }}>
        {t('mweb.socialHandles.title')}
      </Typography>
      <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 1 }}>
        {links.map((link) => {
          const name = t(PLATFORMS[link.key].labelKey);
          return (
            <DuncitButton
              key={link.key}
              data-testid={`survey-gate-social-${link.key}`}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              variant="outlined"
              startIcon={PLATFORMS[link.key].icon}
              aria-label={t('mweb.socialHandles.opensInNewTab', { vars: { name } })}
            >
              {name}
            </DuncitButton>
          );
        })}
      </Stack>
    </Card>
  );
}
