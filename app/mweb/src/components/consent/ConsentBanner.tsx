import { useState } from 'react';
import { Link, Paper, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { makeConsent } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { useWebConsent } from '../../app/useWebConsent';
import { urlConfigs } from '../../config/url-configs';
import { applyWebConsent } from './applyWebConsent';
import ConsentSwitches, { type ConsentValues } from './ConsentSwitches';

const NOTHING: ConsentValues = { analytics: false, marketing: false };
const EVERYTHING: ConsentValues = { analytics: true, marketing: true };
const TITLE_ID = 'consent-banner-title';

/**
 * The first-visit tracking question (GDPR / ePrivacy).
 *
 * Shown until this browser has answered. The answer lives in the shared
 * `.duncit.com` cookie, so a visitor who answered on the website is not asked
 * again here. "Reject all" sits beside "Accept all" with the same weight,
 * because consent is only valid when refusing is as easy as agreeing, and the
 * optional switches start OFF.
 */
export default function ConsentBanner() {
  const { t } = useTranslation();
  const choice = useWebConsent();
  const [choosing, setChoosing] = useState(false);
  const [values, setValues] = useState<ConsentValues>(NOTHING);

  if (choice) return null;

  const save = (next: ConsentValues) => applyWebConsent(makeConsent(next));

  return (
    <Paper
      component="section"
      aria-labelledby={TITLE_ID}
      data-testid="consent-banner"
      elevation={8}
      sx={{
        position: 'fixed',
        left: 16,
        right: 16,
        bottom: 'calc(16px + env(safe-area-inset-bottom))',
        mx: 'auto',
        maxWidth: 560,
        p: 2.5,
        zIndex: (theme) => theme.zIndex.snackbar,
      }}
    >
      <Stack spacing={1.5}>
        <Typography id={TITLE_ID} component="h2" sx={{ fontSize: 18, fontWeight: 700 }}>
          {t('privacy.banner.title')}
        </Typography>
        <Typography variant="body2">
          {t('privacy.banner.body')}{' '}
          <Link
            href={`${urlConfigs.mainSiteUrl}/policies`}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="consent-policy-link"
          >
            {t('privacy.banner.policyLink')}
          </Link>
        </Typography>
        {choosing && (
          <ConsentSwitches
            values={values}
            onChange={(category, checked) => setValues((prev) => ({ ...prev, [category]: checked }))}
          />
        )}
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          <DuncitButton
            variant="contained"
            data-testid="consent-accept-all"
            sx={{ flex: '1 1 140px' }}
            onClick={() => save(EVERYTHING)}
          >
            {t('privacy.banner.acceptAll')}
          </DuncitButton>
          <DuncitButton
            variant="contained"
            data-testid="consent-reject-all"
            sx={{ flex: '1 1 140px' }}
            onClick={() => save(NOTHING)}
          >
            {t('privacy.banner.rejectAll')}
          </DuncitButton>
          {choosing ? (
            <DuncitButton variant="outlined" data-testid="consent-save" onClick={() => save(values)}>
              {t('privacy.banner.save')}
            </DuncitButton>
          ) : (
            <DuncitButton
              variant="outlined"
              data-testid="consent-customise"
              aria-expanded={false}
              onClick={() => setChoosing(true)}
            >
              {t('privacy.banner.customise')}
            </DuncitButton>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}
