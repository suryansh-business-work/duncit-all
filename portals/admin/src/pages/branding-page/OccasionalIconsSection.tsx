import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Button, Paper, Snackbar, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CelebrationIcon from '@mui/icons-material/Celebration';
import OccasionalIconRowFields from './OccasionalIconRowFields';
import { OCCASIONAL_ICONS, UPDATE_OCCASIONAL_ICONS, type OccasionalIconRow } from './queries';

/** Slugs the native app ships bundled art for — keep in step with
 * app/mobile-app/src/assets/occasion-icons.ts. */
const BUNDLED_SLUGS = ['diwali', 'new-year', 'christmas', 'holi'] as const;

/** Rows are edited positionally and a slug may be blank or duplicated while
 * typing, so each carries a client-only uid for a stable React key. */
type EditableRow = OccasionalIconRow & { uid: string };

const newUid = () => globalThis.crypto.randomUUID();

const blankRow = (sortOrder: number): EditableRow => ({
  uid: newUid(),
  slug: '',
  label: '',
  starts_at: '',
  ends_at: '',
  icon_url: '',
  fallback_icon: 'occasion',
  is_active: true,
  sort_order: sortOrder,
});

/**
 * Occasional icons — festive windows that swap the apps' icons by date. Which
 * one is active is decided by the APPLICATION clock (Settings → Time zone &
 * source), so a custom time also previews an upcoming occasion.
 */
export default function OccasionalIconsSection() {
  const { data } = useQuery(OCCASIONAL_ICONS, { fetchPolicy: 'cache-and-network' });
  const [save] = useMutation(UPDATE_OCCASIONAL_ICONS, { refetchQueries: ['OccasionalIcons'] });

  const [rows, setRows] = useState<EditableRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const saved: OccasionalIconRow[] | undefined = data?.branding?.occasional_icons;
  useEffect(() => {
    if (saved) setRows(saved.map((r) => ({ ...r, uid: newUid() })));
  }, [saved]);

  const update = (index: number, patch: Partial<OccasionalIconRow>) =>
    setRows((current) => current.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  const remove = (index: number) => setRows((current) => current.filter((_, i) => i !== index));

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      // Pick only the input fields — rows loaded from the query carry Apollo's
      // __typename, which OccasionalIconInput rejects.
      const input = rows
        .filter((r) => r.slug.trim() && r.starts_at && r.ends_at)
        .map((r) => ({
          slug: r.slug.trim().toLowerCase(),
          label: r.label,
          starts_at: new Date(r.starts_at).toISOString(),
          ends_at: new Date(r.ends_at).toISOString(),
          icon_url: r.icon_url,
          fallback_icon: r.fallback_icon,
          is_active: r.is_active,
          sort_order: r.sort_order,
        }));
      await save({ variables: { input } });
      setToast('Occasional icons saved');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        <CelebrationIcon color="primary" />
        <Stack>
          <Typography variant="subtitle1" fontWeight={700}>
            Occasional icons
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Festive windows that swap the apps&apos; icons by date. The active window is picked
            using the app clock (Settings → Time zone &amp; source).
          </Typography>
        </Stack>
      </Stack>

      <Stack spacing={2}>
        {rows.length === 0 && (
          <Alert severity="info">No occasions yet — add one to schedule a festive icon.</Alert>
        )}
        {rows.map((row, index) => (
          <OccasionalIconRowFields
            key={row.uid}
            row={row}
            index={index}
            bundledSlugs={BUNDLED_SLUGS}
            onChange={update}
            onRemove={remove}
          />
        ))}

        {err && <Alert severity="error">{err}</Alert>}

        <Stack direction="row" justifyContent="space-between">
          <Button
            startIcon={<AddIcon />}
            onClick={() => setRows((current) => [...current, blankRow(current.length)])}
          >
            Add occasion
          </Button>
          <Button variant="contained" onClick={submit} disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </Stack>
      </Stack>

      <Snackbar
        open={!!toast}
        autoHideDuration={2500}
        onClose={() => setToast(null)}
        message={toast ?? ''}
      />
    </Paper>
  );
}
