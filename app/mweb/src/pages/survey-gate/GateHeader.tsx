import { Stack, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { DuncitRoundButton } from '@duncit/buttons';
import AuthLogo from '../../components/AuthLogo';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  title: string;
  onBack: () => void;
}

/**
 * The gate's header: the brand mark, then a 40px round back button beside the
 * phase title. No subtitle — the phase's own content says what to do. Native
 * twin: the header row in components/survey-onboarding/OnboardingSurvey.
 */
export default function GateHeader({ title, onBack }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Stack spacing={1} sx={{ mb: 2 }}>
      <AuthLogo size={32} />
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <DuncitRoundButton
          size="large"
          tone="paper"
          onClick={onBack}
          aria-label={t('mweb.common.goBack')}
          sx={{ width: 40, height: 40, minWidth: 40, minHeight: 40, color: 'text.primary' }}
        >
          <ArrowBackRoundedIcon />
        </DuncitRoundButton>
        <Typography component="h1" sx={{ fontSize: 17, fontWeight: 600, minWidth: 0 }}>
          {title}
        </Typography>
      </Stack>
    </Stack>
  );
}
