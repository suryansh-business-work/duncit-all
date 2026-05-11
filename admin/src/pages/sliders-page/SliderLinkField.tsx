import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import {
  Autocomplete,
  Box,
  CircularProgress,
  FormHelperText,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import PublicIcon from '@mui/icons-material/Public';
import {
  SLIDER_CLUB_OPTIONS,
  SLIDER_POD_OPTIONS,
  type SliderForm,
  type SliderLinkTargetKind,
  type SliderLinkType,
} from './queries';

interface SliderLinkFieldProps {
  form: SliderForm;
  setForm: React.Dispatch<React.SetStateAction<SliderForm>>;
}

const isValidHttpUrl = (value: string) => {
  if (!value) return true;
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

interface TargetOption {
  id: string;
  label: string;
  slug: string;
}

export default function SliderLinkField({ form, setForm }: SliderLinkFieldProps) {
  const isInternal = form.link_type === 'INTERNAL';
  const isPodKind = form.link_target_kind === 'POD';

  const podsQuery = useQuery(SLIDER_POD_OPTIONS, {
    skip: !isInternal || !isPodKind,
    fetchPolicy: 'cache-first',
  });
  const clubsQuery = useQuery(SLIDER_CLUB_OPTIONS, {
    skip: !isInternal || isPodKind,
    fetchPolicy: 'cache-first',
  });

  const options: TargetOption[] = useMemo(() => {
    if (!isInternal) return [];
    if (isPodKind) {
      return (podsQuery.data?.pods ?? []).map((p: any) => ({
        id: p.id,
        label: p.pod_title,
        slug: p.pod_id,
      }));
    }
    return (clubsQuery.data?.clubs ?? []).map((c: any) => ({
      id: c.id,
      label: c.club_name,
      slug: c.club_id,
    }));
  }, [isInternal, isPodKind, podsQuery.data, clubsQuery.data]);

  const selected = options.find((o) => o.id === form.link_target_id) ?? null;
  const externalError = !isValidHttpUrl(form.link_url);

  const setType = (next: SliderLinkType) => {
    setForm((prev) => ({
      ...prev,
      link_type: next,
      // Clear the other side so we don't submit stale values.
      link_target_kind: next === 'INTERNAL' ? prev.link_target_kind || 'POD' : '',
      link_target_id: next === 'INTERNAL' ? prev.link_target_id : '',
      link_url: next === 'EXTERNAL' ? prev.link_url : '',
    }));
  };

  const setKind = (kind: SliderLinkTargetKind) => {
    setForm((prev) => ({ ...prev, link_target_kind: kind, link_target_id: '' }));
  };

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={form.link_type}
          onChange={(_e, v) => v && setType(v as SliderLinkType)}
        >
          <ToggleButton value="INTERNAL">
            <PublicIcon fontSize="small" sx={{ mr: 0.5 }} /> Internal
          </ToggleButton>
          <ToggleButton value="EXTERNAL">
            <LinkIcon fontSize="small" sx={{ mr: 0.5 }} /> External
          </ToggleButton>
        </ToggleButtonGroup>
        {isInternal && (
          <TextField
            select
            size="small"
            label="Target"
            value={form.link_target_kind || 'POD'}
            onChange={(e) => setKind(e.target.value as SliderLinkTargetKind)}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="POD">Pod</MenuItem>
            <MenuItem value="CLUB">Club</MenuItem>
          </TextField>
        )}
      </Stack>

      <Box sx={{ mt: 1.5 }}>
        {isInternal ? (
          <Autocomplete
            options={options}
            value={selected}
            loading={podsQuery.loading || clubsQuery.loading}
            getOptionLabel={(o) => o.label}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            onChange={(_, v) =>
              setForm((prev) => ({ ...prev, link_target_id: v?.id ?? '' }))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                fullWidth
                label={isPodKind ? 'Pick a pod' : 'Pick a club'}
                helperText="Tap on the slider in app will deep-link to this entity"
                required
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {(podsQuery.loading || clubsQuery.loading) && (
                        <CircularProgress size={16} />
                      )}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />
        ) : (
          <TextField
            fullWidth
            label="External URL"
            placeholder="https://…"
            value={form.link_url}
            onChange={(e) => setForm((prev) => ({ ...prev, link_url: e.target.value }))}
            error={externalError}
            helperText={
              externalError
                ? 'Enter a valid http(s) URL'
                : 'Opens in browser when the slider is tapped'
            }
          />
        )}
      </Box>
      {isInternal && !selected && form.link_target_id === '' && (
        <FormHelperText>Pick a target so the slider links somewhere.</FormHelperText>
      )}
    </Box>
  );
}
