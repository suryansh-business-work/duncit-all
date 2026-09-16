import { Box, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RICH_TEXT_BODY_SX } from '@duncit/ui';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  html: string;
  onContinue: () => void;
}

/**
 * First screen of the onboarding gate — the admin-authored intro copy
 * (Onboarding Portal > Settings). The caller skips this step entirely when a
 * kind's intro field is blank.
 *
 * NOTE: html comes from a trusted, role-gated authoring surface (same trust
 * model as PolicyRenderer's policy content).
 */
export default function IntroStep({ html, onContinue }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack data-testid="survey-gate-intro" spacing={2}>
      <Box data-testid="survey-gate-intro-content" sx={RICH_TEXT_BODY_SX} dangerouslySetInnerHTML={{ __html: html }} />
      <DuncitButton data-testid="primary-action" variant="contained" size="large" fullWidth onClick={onContinue}>
        {t('mweb.common.continue')}
      </DuncitButton>
    </Stack>
  );
}
