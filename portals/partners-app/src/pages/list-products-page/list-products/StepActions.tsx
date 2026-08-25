import { Button, Stack } from '@mui/material';
import { AiCheckingIndicator, AiMonitoringChip } from './AiMonitoring';
import { useTranslation } from '@duncit/shell';

interface Props {
  isFirst: boolean;
  isLast: boolean;
  loading: boolean;
  moderating: boolean;
  submitLabel: string;
  onBack: () => void;
  onNext: () => void;
}

/** Back/Next controls per wizard step; the final step swaps Next for the
 * always-visible AI-monitoring chip + submit, with the animated AI-checking
 * state while the moderation preflight runs. */
export default function StepActions({
  isFirst,
  isLast,
  loading,
  moderating,
  submitLabel,
  onBack,
  onNext,
}: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1.25}>
      {isLast && <AiCheckingIndicator visible={moderating} />}
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{
          alignItems: "center",
          flexWrap: "wrap"
        }}>
        <Button disabled={isFirst || loading} onClick={onBack}>
          {t('partners.venueAvailabilityPage.back')}
        </Button>
        {isLast ? (
          <>
            <AiMonitoringChip />
            <Button type="submit" variant="contained" disabled={loading}>
              {submitLabel}
            </Button>
          </>
        ) : (
          <Button variant="contained" onClick={onNext}>
            {t('partners.venueAvailabilityPage.next')}
          </Button>
        )}
      </Stack>
    </Stack>
  );
}
