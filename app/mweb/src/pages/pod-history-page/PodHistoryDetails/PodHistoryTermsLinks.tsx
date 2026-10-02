import { Link as RouterLink } from 'react-router';
import { Stack } from '@mui/material';
import RuleIcon from '@mui/icons-material/Rule';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../../i18n/useTranslation';

/** Links to the Backout terms page and the general terms. */
export default function PodHistoryTermsLinks({ termsUrl }: Readonly<{ termsUrl: string }>) {
  const { t } = useTranslation();
  return (
    <Stack direction="row" spacing={1} useFlexGap sx={{
      flexWrap: "wrap"
    }}>
      <DuncitButton
        component={RouterLink}
        to="/policies/backout-terms"
        size="small"
        startIcon={<RuleIcon />}
        data-testid="ph-backout-terms"
      >
        {t('mweb.podHistory.backoutTerms')}
      </DuncitButton>
      <DuncitButton
        href={termsUrl}
        target="_blank"
        rel="noopener"
        size="small"
        data-testid="ph-general-terms"
      >
        {t('mweb.podHistory.generalTerms')}
      </DuncitButton>
    </Stack>
  );
}
