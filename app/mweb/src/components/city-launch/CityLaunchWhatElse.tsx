import type { ReactElement } from 'react';
import { useNavigate } from 'react-router';
import { Card, Chip, Stack, Typography } from '@mui/material';
import GroupsIcon from '@mui/icons-material/GroupsRounded';
import StorefrontIcon from '@mui/icons-material/StorefrontRounded';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivismRounded';
import { DuncitButton } from '@duncit/buttons';
import { EARN_JOURNEYS, type EarnJourney } from '@duncit/onboarding';
import { useTranslation } from '../../i18n/useTranslation';

interface WhatElseCard {
  testId: string;
  /** The Earn journey the card opens — its survey route comes from @duncit/onboarding. */
  kind: EarnJourney['kind'];
  icon: ReactElement;
  eyebrowKey: string;
  titleKey: string;
  bodyKey: string;
}

const CARDS: readonly WhatElseCard[] = [
  {
    testId: 'city-launch-card-host',
    kind: 'HOST',
    icon: <GroupsIcon />,
    eyebrowKey: 'mweb.cityLaunch.hostEyebrow',
    titleKey: 'mweb.cityLaunch.hostTitle',
    bodyKey: 'mweb.cityLaunch.hostBody',
  },
  {
    testId: 'city-launch-card-venue',
    kind: 'VENUE',
    icon: <StorefrontIcon />,
    eyebrowKey: 'mweb.cityLaunch.venueEyebrow',
    titleKey: 'mweb.cityLaunch.venueTitle',
    bodyKey: 'mweb.cityLaunch.venueBody',
  },
  {
    testId: 'city-launch-card-volunteer',
    kind: 'CLUB_ADMIN',
    icon: <VolunteerActivismIcon />,
    eyebrowKey: 'mweb.cityLaunch.volunteerEyebrow',
    titleKey: 'mweb.cityLaunch.volunteerTitle',
    bodyKey: 'mweb.cityLaunch.volunteerBody',
  },
];

const surveyPathOf = (kind: string) => EARN_JOURNEYS.find((journey) => journey.kind === kind)?.surveyPath ?? '/earn';

/**
 * "What else can you do?" — three ways to help a city launch, each opening
 * its Earn journey: hosting, a venue, or running a club. Native twin:
 * components/city-launch/CityLaunchWhatElse.
 */
export default function CityLaunchWhatElse() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Stack data-testid="city-launch-what-else" spacing={1.5}>
      <Typography component="h2" sx={{ fontSize: '1.05rem', fontWeight: 600 }}>
        {t('mweb.cityLaunch.whatElse')}
      </Typography>
      {CARDS.map((card) => (
        <Card key={card.testId} data-testid={card.testId} sx={{ p: 2 }}>
          <Stack spacing={1}>
            <Chip size="small" icon={card.icon} label={t(card.eyebrowKey)} sx={{ alignSelf: 'flex-start' }} />
            <Typography component="h3" sx={{ fontSize: 16, fontWeight: 600, lineHeight: 1.3 }}>
              {t(card.titleKey)}
            </Typography>
            <Typography sx={{ fontSize: 14, lineHeight: 1.45, color: 'text.secondary' }}>
              {t(card.bodyKey)}
            </Typography>
            <DuncitButton
              data-testid={`${card.testId}-cta`}
              variant="outlined"
              onClick={() => navigate(surveyPathOf(card.kind))}
              sx={{ alignSelf: 'flex-start', mt: 0.5 }}
            >
              {t('mweb.cityLaunch.tellMeMore')}
            </DuncitButton>
          </Stack>
        </Card>
      ))}
    </Stack>
  );
}
