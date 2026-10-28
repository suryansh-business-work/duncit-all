import { useId, useState, useSyncExternalStore } from 'react';
import { Box, ButtonBase, Card, Stack, Typography } from '@mui/material';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import CloseIcon from '@mui/icons-material/Close';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlineOutlined';
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { STORAGE_KEYS } from '../../../shared/env';
import { useWebT } from '../../../shared/i18n';
import { readStored, removeStored, writeStored } from '../../../shared/storage';
import { tint } from '../../../shared/theme';

const STEPS = [
  { key: 'what', icon: CalendarMonthOutlinedIcon },
  { key: 'events', icon: EventAvailableOutlinedIcon },
  { key: 'share', icon: ShareOutlinedIcon },
  { key: 'subscribe', icon: NotificationsActiveOutlinedIcon },
  { key: 'look', icon: PaletteOutlinedIcon },
] as const;

const noop = () => () => undefined;

/**
 * "How calendars work": a few short steps with Back and Next, closed for good
 * with the cross (remembered in this browser) and opened again from a small
 * button. Drawn after mount, since the server cannot know it was closed.
 */
export function CalendarsHelp() {
  const { t } = useWebT();
  const headingId = useId();
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const [closed, setClosed] = useState(() => readStored(STORAGE_KEYS.calendarsHelp) === '1');
  const [step, setStep] = useState(0);
  if (!mounted) return null;

  const close = () => {
    writeStored(STORAGE_KEYS.calendarsHelp, '1');
    setClosed(true);
  };
  if (closed) {
    const reopen = () => {
      removeStored(STORAGE_KEYS.calendarsHelp);
      setStep(0);
      setClosed(false);
    };
    return (
      <DuncitButton size="small" startIcon={<HelpOutlineIcon />} onClick={reopen} sx={{ alignSelf: 'flex-start' }} data-testid="calendars-help-open">
        {t('liteWeb.calendars.help.label')}
      </DuncitButton>
    );
  }

  const { key, icon: Icon } = STEPS[step];
  const last = step === STEPS.length - 1;
  return (
    <Card component="section" aria-labelledby={headingId} sx={{ position: 'relative', p: { xs: 2, sm: 2.5 } }} data-testid="calendars-help">
      <Typography id={headingId} variant="overline" component="h2" color="text.secondary" sx={{ display: 'block', pr: 5 }}>
        {t('liteWeb.calendars.help.label')}
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1.5, sm: 2.5 }} sx={{ mt: 1 }}>
        <Box
          aria-hidden
          sx={(theme) => ({
            flexShrink: 0,
            width: { xs: 64, sm: 112 },
            height: { xs: 64, sm: 112 },
            display: 'grid',
            placeItems: 'center',
            borderRadius: 3,
            color: 'primary.main',
            bgcolor: tint(theme.palette.primary.main, 0.12),
            '& svg': { fontSize: { xs: 32, sm: 52 } },
          })}
        >
          <Icon />
        </Box>
        <Stack spacing={0.75} aria-live="polite" sx={{ minWidth: 0 }} data-testid="calendars-help-step">
          <Typography variant="h6" component="h3" sx={{ fontWeight: 700 }}>
            {t(`liteWeb.calendars.help.items.${key}.title`)}
          </Typography>
          <Typography color="text.secondary">{t(`liteWeb.calendars.help.items.${key}.body`)}</Typography>
        </Stack>
      </Stack>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, mt: 2 }}>
        <Stack direction="row" role="group" aria-label={t('liteWeb.calendars.help.stepsLabel')}>
          {STEPS.map((item, index) => (
            <ButtonBase
              key={item.key}
              onClick={() => setStep(index)}
              aria-label={t('liteWeb.calendars.help.stepOf', { vars: { n: index + 1, total: STEPS.length } })}
              aria-current={index === step ? 'step' : undefined}
              sx={{ width: 28, height: 24, borderRadius: 1, '&.Mui-focusVisible': { outline: '2px solid', outlineColor: 'primary.main' } }}
              data-testid={`calendars-help-dot-${item.key}`}
            >
              <Box aria-hidden sx={{ width: 20, height: 5, borderRadius: 1, bgcolor: index === step ? 'text.primary' : 'action.disabled', transition: 'background-color 150ms' }} />
            </ButtonBase>
          ))}
        </Stack>
        <Stack direction="row" spacing={1}>
          {step > 0 ? (
            <DuncitButton size="small" onClick={() => setStep(step - 1)} data-testid="calendars-help-back">
              {t('liteWeb.calendars.help.back')}
            </DuncitButton>
          ) : null}
          <DuncitButton size="small" variant="contained" onClick={last ? close : () => setStep(step + 1)} data-testid="calendars-help-next">
            {last ? t('liteWeb.calendars.help.done') : t('liteWeb.calendars.help.next')}
          </DuncitButton>
        </Stack>
      </Stack>
      <DuncitIconButton aria-label={t('liteWeb.calendars.help.close')} onClick={close} sx={{ position: 'absolute', top: 8, right: 8 }} data-testid="calendars-help-close">
        <CloseIcon fontSize="small" />
      </DuncitIconButton>
    </Card>
  );
}
