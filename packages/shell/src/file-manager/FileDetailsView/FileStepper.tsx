import { Stack, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  /** Where the open file sits among the ticked ones, zero-based. */
  at: number;
  total: number;
  onStep: (delta: number) => void;
}

/** Previous / next through the ticked files, saying where you are in the set. */
export default function FileStepper({ at, total, onStep }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack
      direction="row"
      sx={{
        alignItems: "center",
        justifyContent: "space-between",
        mb: 0.5
      }}>
      <DuncitIconButton
        size="small"
        onClick={() => onStep(-1)}
        disabled={at === 0}
        aria-label={t('shell.fileManager.prevFile')}
      >
        <ChevronLeftIcon fontSize="small" />
      </DuncitIconButton>
      <Typography variant="caption" sx={{
        color: "text.secondary"
      }}>
        {at + 1} of {total} selected
      </Typography>
      <DuncitIconButton
        size="small"
        onClick={() => onStep(1)}
        disabled={at === total - 1}
        aria-label={t('shell.fileManager.nextFile')}
      >
        <ChevronRightIcon fontSize="small" />
      </DuncitIconButton>
    </Stack>
  );
}
