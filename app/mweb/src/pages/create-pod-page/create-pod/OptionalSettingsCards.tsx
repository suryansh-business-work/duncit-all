import { useState, type ReactNode } from 'react';
import { Controller } from 'react-hook-form';
import {
  Box,
  CardActionArea,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitButton, DuncitRoundButton } from '@duncit/buttons';
import ChipArrayField from './fields/ChipArrayField';
import { useTranslation } from '../../../i18n/useTranslation';
import { SURFACE_SX } from '../../../theme';
import type { CreatePodForm } from './create-pod.types';

type PanelKey = 'info' | 'perks';

const PANELS: { key: PanelKey; titleKey: string; icon: ReactNode }[] = [
  { key: 'info', titleKey: 'mweb.createPod.additionalInfoTitle', icon: <InfoOutlinedIcon /> },
  { key: 'perks', titleKey: 'mweb.createPod.perksTitle', icon: <StarBorderIcon /> },
];

/** The "Added" / "2 added" pill on a filled row. */
const SUMMARY_CHIP_SX = { height: 26, minHeight: 26, fontSize: '0.75rem' } as const;

interface RowProps {
  panel: (typeof PANELS)[number];
  title: string;
  summary: string;
  /** True when the field behind the row already holds something. */
  filled: boolean;
  onOpen: () => void;
}

/** One tap-to-edit row of the list card: accent icon disc, title, and the
 * summary pill once filled (a chevron before). Native twin: the rows in
 * OptionalSettingsCards. */
function SettingRow({ panel, title, summary, filled, onOpen }: Readonly<RowProps>) {
  return (
    <CardActionArea onClick={onOpen} sx={{ px: 2, py: 1.75, borderRadius: 0 }} aria-label={title}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <Box
          sx={{
            display: 'grid',
            placeItems: 'center',
            width: 40,
            height: 40,
            flexShrink: 0,
            borderRadius: '50%',
            bgcolor: 'action.hover',
            color: 'secondary.main',
          }}
        >
          {panel.icon}
        </Box>
        <Typography noWrap sx={{ flex: 1, minWidth: 0, fontSize: '0.95rem', fontWeight: 600 }}>
          {title}
        </Typography>
        {filled ? (
          <Chip label={summary} size="small" color="primary" sx={SUMMARY_CHIP_SX} />
        ) : (
          <ChevronRightIcon sx={{ color: 'text.secondary' }} />
        )}
      </Stack>
    </CardActionArea>
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
    <Box sx={{ ...SURFACE_SX, overflow: 'hidden' }}>
      <SettingRow
        panel={PANELS[0]}
        title={t('mweb.createPod.additionalInfoTitle')}
        summary={infoSummary}
        filled={infoFilled}
        onOpen={() => setActive('info')}
      />
      <Divider />
      <SettingRow
        panel={PANELS[1]}
        title={t('mweb.createPod.perksTitle')}
        summary={perksSummary}
        filled={perksFilled}
        onOpen={() => setActive('perks')}
      />

      <Dialog open={!!active} onClose={() => setActive(null)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ pr: 7 }}>
          {activePanel ? t(activePanel.titleKey) : null}
          <DuncitRoundButton
            tone="surface"
            aria-label={t('mweb.auth.close')}
            onClick={() => setActive(null)}
            sx={{ position: 'absolute', right: 12, top: 12 }}
          >
            <CloseIcon />
          </DuncitRoundButton>
        </DialogTitle>
        <DialogContent>{active && <PanelBody panelKey={active} form={form} />}</DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <DuncitButton variant="contained" size="large" fullWidth onClick={() => setActive(null)}>
            {t('mweb.createPod.done')}
          </DuncitButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
