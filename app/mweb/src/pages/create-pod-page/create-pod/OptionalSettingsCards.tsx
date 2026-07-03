import { useState, type ReactNode } from 'react';
import { Controller } from 'react-hook-form';
import {
  Box, Button, Card, CardActionArea, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, Stack, TextField, Typography,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import ChipArrayField from './fields/ChipArrayField';
import type { CreatePodForm } from './create-pod.types';

type PanelKey = 'info' | 'offers' | 'perks';

const PANELS: { key: PanelKey; title: string; subtitle: string; icon: ReactNode }[] = [
  { key: 'info', title: 'Additional Info', subtitle: 'Rules, requirements, or what to bring.', icon: <InfoOutlinedIcon fontSize="small" /> },
  { key: 'offers', title: 'Offers', subtitle: 'Discounts / promos', icon: <LocalOfferOutlinedIcon fontSize="small" /> },
  { key: 'perks', title: 'Perks', subtitle: 'Member benefits', icon: <StarBorderIcon fontSize="small" /> },
];

interface CardProps {
  panel: (typeof PANELS)[number];
  summary: string;
  onOpen: () => void;
}

function SettingCard({ panel, summary, onOpen }: Readonly<CardProps>) {
  const filled = summary !== 'Add';
  return (
    <Card variant="outlined" sx={{ borderRadius: 2.5, height: '100%' }}>
      <CardActionArea onClick={onOpen} sx={{ p: 1.5, height: '100%' }} aria-label={panel.title}>
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Box sx={{ display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: '50%', bgcolor: 'primary.main', color: 'primary.contrastText' }}>
            {panel.icon}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" fontWeight={900} noWrap>{panel.title}</Typography>
            <Typography variant="caption" color="text.secondary" noWrap>{panel.subtitle}</Typography>
          </Box>
          {filled ? <Chip label={summary} size="small" color="primary" /> : <ChevronRightIcon color="action" />}
        </Stack>
      </CardActionArea>
    </Card>
  );
}

function PanelBody({ panelKey, form }: Readonly<{ panelKey: PanelKey; form: CreatePodForm }>) {
  if (panelKey === 'info') {
    return (
      <TextField
        label="Pod info / additional notes"
        fullWidth
        multiline
        minRows={3}
        autoFocus
        helperText="Logistics, what to bring, parking notes, etc."
        {...form.register('pod_info')}
      />
    );
  }
  const name = panelKey === 'offers' ? 'what_this_pod_offers' : 'available_perks';
  const placeholder = panelKey === 'offers' ? 'e.g. Coaching, Snacks' : 'e.g. Free parking, Goodies';
  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <ChipArrayField label="" value={field.value} onChange={field.onChange} error={fieldState.error?.message} placeholder={placeholder} />
      )}
    />
  );
}

/** Step 1 "Optional settings": three tap-to-edit cards (Additional Info, Offers,
 * Perks) that open a dialog over the matching form field(s). */
export default function OptionalSettingsCards({ form }: Readonly<{ form: CreatePodForm }>) {
  const [active, setActive] = useState<PanelKey | null>(null);
  const info = form.watch('pod_info');
  const offers = form.watch('what_this_pod_offers');
  const perks = form.watch('available_perks');

  const summaryFor = (key: PanelKey): string => {
    if (key === 'info') return info.trim() ? 'Added' : 'Add';
    const list = key === 'offers' ? offers : perks;
    return list.length > 0 ? `${list.length} added` : 'Add';
  };
  const activePanel = PANELS.find((panel) => panel.key === active) ?? null;

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 900, letterSpacing: '0.1em' }}>
        OPTIONAL SETTINGS
      </Typography>
      <Stack spacing={1.25} sx={{ mt: 1 }}>
        <SettingCard panel={PANELS[0]} summary={summaryFor('info')} onOpen={() => setActive('info')} />
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25 }}>
          <SettingCard panel={PANELS[1]} summary={summaryFor('offers')} onOpen={() => setActive('offers')} />
          <SettingCard panel={PANELS[2]} summary={summaryFor('perks')} onOpen={() => setActive('perks')} />
        </Box>
      </Stack>

      <Dialog open={!!active} onClose={() => setActive(null)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900, pr: 6 }}>
          {activePanel?.title}
          <IconButton aria-label="Close" onClick={() => setActive(null)} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>{active && <PanelBody panelKey={active} form={form} />}</DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setActive(null)} sx={{ fontWeight: 800 }}>Done</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
