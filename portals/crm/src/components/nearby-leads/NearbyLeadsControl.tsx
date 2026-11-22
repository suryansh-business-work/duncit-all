import { useState } from 'react';
import { Chip, Dialog, DialogContent, DialogTitle, IconButton, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CancelIcon from '@mui/icons-material/Cancel';
import NearMeIcon from '@mui/icons-material/NearMe';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { NearbyLeads, NearbySearch } from '../../hooks/useNearbyLeads';
import { NearbyLeadsForm, type NearbyLeadsFormValues } from '../../forms/nearby-leads';
import NearbyScanView from './NearbyScanView';

const TITLE_ID = 'nearby-leads-title';

/** "Within 5 km of you" / "Within 5 km of Bandra, Mumbai". */
function chipLabel(search: NearbySearch, t: ReturnType<typeof useTranslation>['t']) {
  const km = search.radius_km;
  if (search.source === 'me') return t('crm.nearby.chipMine', { vars: { km } });
  const place = search.area ? `${search.area}, ${search.city}` : search.city;
  return t('crm.nearby.chipPlace', { vars: { km, place } });
}

/**
 * Leads listing toolbar › Nearby leads. A button opens the search; while a
 * search is on, a chip names it (click to change it, remove to list every
 * lead again).
 */
export default function NearbyLeadsControl({ nearby }: Readonly<{ nearby: NearbyLeads }>) {
  const { t } = useTranslation();
  const { search, scan, start, clear } = nearby;
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'form' | 'scan'>('form');

  const openSearch = () => {
    setView('form');
    setOpen(true);
  };
  const submit = (values: NearbyLeadsFormValues) => {
    setView('scan');
    start(values);
  };
  const close = () => setOpen(false);

  return (
    <>
      {search ? (
        <Chip
          icon={<NearMeIcon />}
          color="primary"
          variant="outlined"
          label={chipLabel(search, t)}
          onClick={openSearch}
          onDelete={clear}
          deleteIcon={<CancelIcon aria-label={t('crm.nearby.clear')} />}
          data-testid="nearby-chip"
        />
      ) : (
        <DuncitButton size="small" variant="outlined" startIcon={<NearMeIcon />} onClick={openSearch} data-testid="nearby-open">
          {t('crm.nearby.button')}
        </DuncitButton>
      )}
      <Dialog open={open} onClose={close} fullWidth maxWidth="xs" aria-labelledby={TITLE_ID}>
        <DialogTitle id={TITLE_ID} sx={{ pr: 6 }}>
          {t('crm.nearby.title')}
          <IconButton aria-label={t('shell.common.close')} onClick={close} sx={{ position: 'absolute', right: (theme) => theme.spacing(1), top: (theme) => theme.spacing(1) }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {view === 'form' ? (
            <Stack spacing={2}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {t('crm.nearby.intro')}
              </Typography>
              <NearbyLeadsForm initialValues={search ?? undefined} onSubmit={submit} />
            </Stack>
          ) : (
            <NearbyScanView
              scan={scan}
              radiusKm={search?.radius_km ?? 0}
              onChangeSearch={() => setView('form')}
              onViewLeads={close}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
