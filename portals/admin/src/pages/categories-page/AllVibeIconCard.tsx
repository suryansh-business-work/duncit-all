import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Button,
  Paper,
  Snackbar,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import AppsIcon from '@mui/icons-material/Apps';
import MediaPickerField from '../../components/MediaPickerField';
import { BRANDING, UPDATE_BRANDING } from '../branding-page/queries';

const POSITIONS = ['TOP', 'LEFT', 'RIGHT', 'BOTTOM'] as const;
type Position = (typeof POSITIONS)[number];
interface Layout {
  position: Position;
  width: number;
  height: number;
}
const DEFAULT_LAYOUT: Layout = { position: 'TOP', width: 40, height: 40 };

const titleCase = (p: Position) => p[0] + p.slice(1).toLowerCase();

/**
 * "All" vibe-tab icon — the icon shown on the synthetic "All" tab that leads the
 * home "What's your vibe" tabber (mWeb + mobile). It has no Category document of
 * its own, so the icon + its layout (position/size) are stored on the Branding
 * singleton (`home_all_vibe_icon_url` / `home_all_vibe_icon_layout`).
 */
export default function AllVibeIconCard() {
  const { data } = useQuery(BRANDING, { fetchPolicy: 'cache-and-network' });
  const [updateMut] = useMutation(UPDATE_BRANDING, { refetchQueries: ['Branding'] });

  const savedIcon: string = data?.branding?.home_all_vibe_icon_url ?? '';
  const savedLayout: Layout | null = data?.branding?.home_all_vibe_icon_layout ?? null;

  const [value, setValue] = useState('');
  const [layout, setLayout] = useState<Layout>(DEFAULT_LAYOUT);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [opError, setOpError] = useState<string | null>(null);

  useEffect(() => {
    setValue(savedIcon);
    setLayout(savedLayout ?? DEFAULT_LAYOUT);
  }, [savedIcon, savedLayout]);

  const dirty =
    value !== savedIcon ||
    JSON.stringify(layout) !== JSON.stringify(savedLayout ?? DEFAULT_LAYOUT);

  const save = async () => {
    setBusy(true);
    setOpError(null);
    try {
      await updateMut({
        variables: {
          input: {
            home_all_vibe_icon_url: value,
            // Pick only the input fields — the layout loaded from the query
            // carries Apollo's __typename, which CategoryIconLayoutInput rejects.
            home_all_vibe_icon_layout: {
              position: layout.position,
              width: layout.width,
              height: layout.height,
            },
          },
        },
      });
      setToast('Saved');
    } catch (e: any) {
      setOpError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        <AppsIcon color="primary" />
        <Stack>
          <Typography variant="subtitle1" fontWeight={700}>
            &quot;All&quot; tab icon
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Icon + layout for the leading &quot;All&quot; tab in the home &quot;What&apos;s your
            vibe&quot; tabber. Applies to mWeb and the mobile app.
          </Typography>
        </Stack>
      </Stack>

      <MediaPickerField
        label="All tab icon"
        value={value}
        onChange={setValue}
        folder="/categories/all"
        accept="image/*"
        helperText="Square transparent PNG/SVG, ~96×96px — shown full-bleed, no background."
      />

      <Stack spacing={1.5} sx={{ mt: 2 }}>
        <Typography variant="subtitle2">Icon layout</Typography>
        <ToggleButtonGroup
          value={layout.position}
          exclusive
          size="small"
          onChange={(_event, next: Position | null) => {
            if (next) setLayout((l) => ({ ...l, position: next }));
          }}
        >
          {POSITIONS.map((p) => (
            <ToggleButton key={p} value={p}>
              {titleCase(p)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <Stack direction="row" spacing={2}>
          <TextField
            label="Width"
            type="number"
            value={layout.width}
            onChange={(e) => setLayout((l) => ({ ...l, width: Number(e.target.value) || 0 }))}
            helperText="px"
            sx={{ maxWidth: 140 }}
          />
          <TextField
            label="Height"
            type="number"
            value={layout.height}
            onChange={(e) => setLayout((l) => ({ ...l, height: Number(e.target.value) || 0 }))}
            helperText="px"
            sx={{ maxWidth: 140 }}
          />
        </Stack>
      </Stack>

      {opError && (
        <Alert severity="error" sx={{ mt: 1.5 }}>
          {opError}
        </Alert>
      )}

      <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1.5 }}>
        <Button variant="contained" onClick={save} disabled={busy || !dirty}>
          {busy ? 'Saving…' : 'Save'}
        </Button>
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
