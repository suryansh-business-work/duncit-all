import { Stack, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { periodLabel, shiftAnchor, type viewRange } from './calendar-period';

interface Props {
  /** Any day of the month on show. */
  anchor: Date;
  range: ReturnType<typeof viewRange>;
  onChange: (anchor: Date) => void;
}

/** A month calendar's header controls: previous, the month's name, next, and Today. */
export default function MonthNavigator({ anchor, range, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
      <DuncitIconButton onClick={() => onChange(shiftAnchor('month', anchor, -1))} aria-label={t('availability.toolbar.previous')}>
        <ChevronLeftIcon />
      </DuncitIconButton>
      <Typography variant="subtitle1" sx={{ fontWeight: 900, minWidth: 140, textAlign: 'center' }}>
        {periodLabel('month', anchor, range)}
      </Typography>
      <DuncitIconButton onClick={() => onChange(shiftAnchor('month', anchor, 1))} aria-label={t('availability.toolbar.next')}>
        <ChevronRightIcon />
      </DuncitIconButton>
      <DuncitButton size="small" onClick={() => onChange(new Date())}>
        {t('availability.toolbar.today')}
      </DuncitButton>
    </Stack>
  );
}
