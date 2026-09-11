import { Box, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { APP_SHELL_MAX_WIDTH } from '../../../app/appLayout';
import { useTranslation } from '../../../i18n/useTranslation';

interface Props {
  isFirst: boolean;
  isLast: boolean;
  busy: boolean;
  /** Step-4 pricing rules failed — Create Pod stays disabled until they clear. */
  submitDisabled?: boolean;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

/** Pinned Back / Next (or Create Pod) action bar: a surface strip under a
 * hairline, sitting right on top of the app's bottom navigation
 * (--duncit-bottom-nav-height) so the actions are never hidden behind the
 * bottom menu. Back is a soft pill, the green pill is the step's action.
 * Native twin: the footer row in CreatePodStepper. */
export default function StepFooterBar({
  isFirst,
  isLast,
  busy,
  submitDisabled = false,
  onBack,
  onNext,
  onSubmit,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const lastLabel = busy ? t('mweb.createPod.creating') : t('mweb.createPod.createPod');
  const primaryLabel = isLast ? lastLabel : t('mweb.createPod.next');
  const primaryDisabled = busy || (isLast && submitDisabled);
  return (
    <Box
      sx={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 'var(--duncit-bottom-nav-height, 0px)',
        zIndex: (theme) => theme.zIndex.appBar + 1,
        px: 2,
        py: 1.5,
        bgcolor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
      }}
    >
      <Stack direction="row" spacing={1.25} sx={{ maxWidth: APP_SHELL_MAX_WIDTH, mx: 'auto' }}>
        <DuncitButton
          color="inherit"
          size="large"
          fullWidth
          disabled={isFirst || busy}
          onClick={onBack}
          sx={{ flex: 1, bgcolor: 'action.hover' }}
        >
          {t('mweb.createPod.back')}
        </DuncitButton>
        <DuncitButton
          variant="contained"
          size="large"
          fullWidth
          disabled={primaryDisabled}
          onClick={isLast ? onSubmit : onNext}
          sx={{ flex: 2 }}
        >
          {primaryLabel}
        </DuncitButton>
      </Stack>
    </Box>
  );
}
