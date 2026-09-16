import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Alert, Box, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { AI_FILL_LOCATION_AREAS } from './queries';
import type { LocForm, ZoneEdit } from './types';
import { useTranslation } from '@duncit/shell';

interface Props {
  form: LocForm;
  setForm: React.Dispatch<React.SetStateAction<LocForm>>;
  busy: boolean;
  updateZone: (idx: number, patch: Partial<ZoneEdit>) => void;
  addZone: () => void;
  removeZone: (idx: number) => void;
}

/** The location dialog's Localities / Areas editor, with AI fill. */
export default function LocationZonesField({
  form,
  setForm,
  busy,
  updateZone,
  addZone,
  removeZone,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [aiError, setAiError] = useState<string | null>(null);
  const [fillAreas, { loading: fillingAreas }] = useMutation<any>(AI_FILL_LOCATION_AREAS);
  // Scroll the freshly-added Area row into view so the user doesn't have to hunt
  // for it at the bottom of the dialog (B20).
  const lastZoneRef = useRef<HTMLDivElement | null>(null);
  const [justAdded, setJustAdded] = useState(false);

  // Stable per-row keys: zone rows have no id and their fields are edited in
  // place, so a content-based key would remount the input and drop focus.
  const rowKeys = useRef<number[]>([]);
  const keySeq = useRef(0);
  if (rowKeys.current.length !== form.zones.length) {
    while (rowKeys.current.length < form.zones.length) rowKeys.current.push(keySeq.current++);
    rowKeys.current.length = form.zones.length;
  }
  const zoneRows = form.zones.map((z, i) => ({
    z,
    index: i,
    key: rowKeys.current[i],
    isLast: i === form.zones.length - 1,
  }));

  const handleAddZone = () => {
    addZone();
    setJustAdded(true);
  };

  useEffect(() => {
    if (justAdded) {
      lastZoneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      setJustAdded(false);
    }
  }, [form.zones.length, justAdded]);

  const fillAreasWithAi = async () => {
    setAiError(null);
    if (!form.country.trim() || !form.state.trim() || !form.city.trim()) {
      setAiError(t('admin.locations.aiFillNeedsPlace'));
      return;
    }
    try {
      const result = await fillAreas({
        variables: {
          input: {
            country: form.country,
            state: form.state,
            city: form.city,
          },
        },
      });
      const parsed = JSON.parse(result.data?.aiFillLocationAreas || '{}');
      const zones = (parsed.zones ?? [])
        .map((zone: any) => ({
          zone_name: String(zone.zone_name ?? '').trim(),
          zone_code: '',
          pincode: String(zone.pincode ?? '').trim(),
        }))
        .filter((zone: ZoneEdit) => zone.zone_name && zone.pincode);
      if (zones.length === 0) throw new Error(t('admin.locations.aiFillEmpty'));
      setForm((prev) => ({
        ...prev,
        location_pincode: zones[0].pincode,
        zones,
      }));
    } catch (error: any) {
      setAiError(error?.message || t('admin.locations.aiFillFailed'));
    }
  };

  return (
    <Box>
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          mb: 1
        }}>
        <Typography variant="subtitle2">{t('admin.locations.localities')}</Typography>
        <Stack direction="row" spacing={1}>
          <DuncitButton
            size="small"
            color="secondary"
            variant="outlined"
            startIcon={
              fillingAreas ? <CircularProgress size={14} /> : <AutoAwesomeIcon fontSize="small" />
            }
            onClick={fillAreasWithAi}
            disabled={busy || fillingAreas}
          >
            {fillingAreas ? t('admin.locations.fillingWithAi') : t('admin.locations.fillWithAi')}
          </DuncitButton>
          <DuncitButton size="small" startIcon={<AddIcon />} onClick={handleAddZone}>
            {t('admin.locations.addArea')}
          </DuncitButton>
        </Stack>
      </Stack>
      {aiError && <Alert severity="error" sx={{ mb: 1 }}>{aiError}</Alert>}
      <Stack spacing={1.5}>
        {zoneRows.map(({ z, index, key, isLast }) => (
          <Stack
            key={key}
            ref={isLast ? lastZoneRef : undefined}
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            sx={{
              alignItems: { xs: 'stretch', sm: 'center' }
            }}
          >
            <TextField
              size="small"
              label={t('admin.locations.locality')}
              value={z.zone_name}
              onChange={(e) => updateZone(index, { zone_name: e.target.value })}
              sx={{ flex: 1 }}
            />
            <TextField
              size="small"
              label={t('admin.locations.pinCode')}
              value={z.pincode}
              onChange={(e) => updateZone(index, { pincode: e.target.value })}
              sx={{ width: { xs: '100%', sm: 140 } }}
            />
            <DuncitIconButton
              size="small"
              aria-label={t('shell.a11y.removeNamed', { vars: { name: z.zone_name || String(index + 1) } })}
              data-testid="location-form-remove-zone"
              onClick={() => removeZone(index)}
              disabled={form.zones.length === 1}
            >
              <RemoveCircleOutlineIcon />
            </DuncitIconButton>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
