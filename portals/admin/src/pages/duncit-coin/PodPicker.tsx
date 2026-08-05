import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { Autocomplete, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import { useDebouncedValue } from '@duncit/ui';
import {
  COIN_POD_BY_ID,
  COIN_POD_PICKER,
  POD_PICKER_PAGE_SIZE,
  POD_PICKER_SEARCH_SIZE,
  type PodOption,
} from './queries';

interface Props {
  /** The selected pod's document id, or '' for every pod. */
  value: string;
  onChange: (podDocId: string) => void;
}

const podLabel = (pod: PodOption) => pod.pod_title || pod.pod_id || pod.id;

/** `pod_id` is unique only within a club, so two clubs can both own a
 * "morning-run". The club qualifies it. */
const podCaption = (pod: PodOption) => [pod.club_slug, pod.pod_id].filter(Boolean).join(' / ');

/**
 * Server-searched pod filter for the coin ledger. Opens with the newest
 * {@link POD_PICKER_PAGE_SIZE} pods and re-queries the server as the admin
 * types, so the option list never has to hold every pod on the platform.
 */
export default function PodPicker({ value, onChange }: Readonly<Props>) {
  const [input, setInput] = useState('');
  const [chosen, setChosen] = useState<PodOption[]>([]);
  const term = useDebouncedValue(input.trim(), 300);

  // A deep link lands with a pod id and nothing to name it, so it is fetched by
  // id. Skipped once the pod is already in hand — picking one in the UI seeds
  // `chosen`, and the newest pods arrive with the search page anyway.
  const seeded = !value || chosen.some((pod) => pod.id === value);
  const { data: seedData } = useQuery(COIN_POD_BY_ID, {
    variables: { pod_doc_id: value },
    skip: seeded,
    fetchPolicy: 'cache-first',
  });
  const seedPod = seedData?.pod as PodOption | null | undefined;

  const { data, loading } = useQuery(COIN_POD_PICKER, {
    variables: {
      query: {
        search: term || null,
        page: 1,
        // Opens with ten; a search widens the window, so the pods past the
        // newest ten are reachable by typing rather than by scrolling.
        page_size: term ? POD_PICKER_SEARCH_SIZE : POD_PICKER_PAGE_SIZE,
        sort_by: 'pod_date_time',
        sort_dir: 'desc',
      },
    },
    fetchPolicy: 'cache-and-network',
  });
  const results = (data?.podsTable?.rows ?? []) as PodOption[];

  // Merge the picked (or deep-linked) pod with the fetched page so the
  // selection keeps its label once the search moves on and the server stops
  // returning it.
  const options = useMemo(() => {
    const map = new Map<string, PodOption>();
    const known = seedPod ? [seedPod, ...chosen] : chosen;
    for (const pod of [...known, ...results]) map.set(pod.id, pod);
    return [...map.values()];
  }, [seedPod, chosen, results]);

  // Memoised: MUI resets the input text whenever `value` changes identity, so a
  // fresh object every render would wipe what the admin is typing.
  const selected = useMemo(
    () => (value ? options.find((pod) => pod.id === value) ?? null : null),
    [options, value],
  );

  // A filter is active but not yet named. Saying "All pods" here would claim the
  // opposite of what the table beneath is showing.
  const resolving = !!value && !selected;
  const placeholder = resolving ? 'Loading pod…' : 'All pods — type to search';

  return (
    <Autocomplete
      options={options}
      value={selected}
      loading={loading || resolving}
      // The server already searched; letting MUI filter again hides matches.
      filterOptions={(opts) => opts}
      getOptionLabel={podLabel}
      isOptionEqualToValue={(option, val) => option.id === val.id}
      inputValue={input}
      onInputChange={(_, next) => setInput(next)}
      loadingText="Searching pods…"
      noOptionsText="No pods match that search."
      onChange={(_, next) => {
        setChosen(next ? [next] : []);
        onChange(next?.id ?? '');
      }}
      sx={{ minWidth: 280 }}
      renderOption={(optionProps, option) => (
        <li {...optionProps} key={option.id}>
          <Stack sx={{ minWidth: 0 }}>
            <Typography variant="body2" noWrap>
              {podLabel(option)}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {podCaption(option)}
            </Typography>
          </Stack>
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          size="small"
          label="Pod"
          placeholder={placeholder}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress size={16} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}
