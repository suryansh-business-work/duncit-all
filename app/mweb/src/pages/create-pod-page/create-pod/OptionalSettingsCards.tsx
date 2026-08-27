import { useState, type ReactNode } from 'react';
import { Controller } from 'react-hook-form';
import { Box, Card, CardActionArea, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import ChipArrayField from './fields/ChipArrayField';
import { useTranslation } from '../../../i18n/useTranslation';
import type { CreatePodForm } from './create-pod.types';

type PanelKey = 'info' | 'perks';

const PANELS: { key: PanelKey; titleKey: string; subtitleKey: string; icon: ReactNode }[] = [
  {
    key: 'info',
    titleKey: 'mweb.createPod.additionalInfoTitle',
    subtitleKey: 'mweb.createPod.additionalInfoSubtitle',
    icon: <InfoOutlinedIcon fontSize="small" />,
  },
  {
    key: 'perks',
    titleKey: 'mweb.createPod.perksTitle',
    subtitleKey: 'mweb.createPod.perksSubtitle',
    icon: <StarBorderIcon fontSize="small" />,
  },
];

interface CardProps {
  panel: (typeof PANELS)[number];
  title: string;
  subtitle: string;
  summary: string;
  /** True when the field behind the card already holds something. */
  filled: boolean;
  onOpen: () => void;
}

function SettingCard({ panel, title, subtitle, summary, filled, onOpen }: Readonly<CardProps>) {
  return (
    <Card variant="outlined" sx={{ borderRadius: '16px', height: '100%' }}>
      <CardActionArea onClick={onOpen} sx={{ p: 1.5, height: '100%' }} aria-label={title}>
        <Stack direction="row" spacing={1.25} sx={{
          alignItems: "center"
        }}>
          <Box sx={{ display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: '50%', bgcolor: 'primary.main', color: 'primary.contrastText' }}>
            {panel.icon}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" noWrap sx={{
              fontWeight: 700
            }}>{title}</Typography>
            <Typography variant="caption" noWrap sx={{
              color: "text.secondary"
            }}>{subtitle}</Typography>
          </Box>
          {filled ? <Chip label={summary} size="small" color="primary" /> : <ChevronRightIcon color="action" />}
        </Stack>
      </CardActionArea>
    </Card>
  );
}

function PanelBody({ panelKey, form }: Readonly<{ panelKey: PanelKey; form: CreatePodForm }>) {
  const { t } = useTranslation();
  if (panelKey === 'info') {
    return (
      <TextField
        label={t('mweb.createPod.podInfoLabel')}
        fullWidth
        multiline
        minRows={3}
        autoFocus
        helperText={t('mweb.createPod.podInfoHint')}
        {...form.register('pod_info')}
      />
    );
  }
  return (
    <Controller
      control={form.control}
      name="available_perks"
      render={({ field, fieldState }) => (
        <ChipArrayField label="" value={field.value} onChange={field.onChange} error={fieldState.error?.message} placeholder={t('mweb.createPod.perksPlaceholder')} />
      )}
    />
  );
}

/** Step 1 "Optional settings": three tap-to-edit cards (Additional Info, Offers,
 * Perks) that open a dialog over the matching form field(s). */
export default function OptionalSettingsCards({ form }: Readonly<{ form: CreatePodForm }>) {
  const [active, setActive] = useState<PanelKey | null>(null);
  const { t } = useTranslation();
  const info = form.watch('pod_info');
  const perks = form.watch('available_perks');

  const infoFilled = info.trim().length > 0;
  const perksFilled = perks.length > 0;
  const infoSummary = infoFilled ? t('mweb.createPod.summaryAdded') : t('mweb.createPod.summaryAdd');
  const perksSummary = perksFilled
    ? t('mweb.createPod.summaryCount', { vars: { count: perks.length } })
    : t('mweb.createPod.summaryAdd');
  const activePanel = PANELS.find((panel) => panel.key === active) ?? null;

  return (
    <Box>
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          fontWeight: 700,
          letterSpacing: '0.1em'
        }}>
        {t('mweb.createPod.optionalSettings')}
      </Typography>
      <Stack spacing={1.25} sx={{ mt: 1 }}>
        <SettingCard
          panel={PANELS[0]}
          title={t('mweb.createPod.additionalInfoTitle')}
          subtitle={t('mweb.createPod.additionalInfoSubtitle')}
          summary={infoSummary}
          filled={infoFilled}
          onOpen={() => setActive('info')}
        />
        <SettingCard
          panel={PANELS[1]}
          title={t('mweb.createPod.perksTitle')}
          subtitle={t('mweb.createPod.perksSubtitle')}
          summary={perksSummary}
          filled={perksFilled}
          onOpen={() => setActive('perks')}
        />
      </Stack>

      <Dialog open={!!active} onClose={() => setActive(null)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700, pr: 6 }}>
          {activePanel ? t(activePanel.titleKey) : null}
          <DuncitIconButton aria-label={t('mweb.auth.close')} onClick={() => setActive(null)} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <CloseIcon />
          </DuncitIconButton>
        </DialogTitle>
        <DialogContent>{active && <PanelBody panelKey={active} form={form} />}</DialogContent>
        <DialogActions>
          <DuncitButton variant="contained" onClick={() => setActive(null)} sx={{ fontWeight: 600 }}>{t('mweb.createPod.done')}</DuncitButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
