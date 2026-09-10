import { Box, Chip, Link, Paper, Stack, Typography } from '@mui/material';

export interface VenueReviewSummaryProps {
  active: any;
}

/**
 * What the reviewer is looking at: the venue's type, capacity, tax ids, the
 * category it hosts in, where it is, and its uploaded documents. Read-only —
 * hoisted out of the dialog so that file stays a list of panels (rule 9).
 */
export default function VenueReviewSummary({ active }: Readonly<VenueReviewSummaryProps>) {
  const documents = active?.documents ?? [];
  const capacityItems = active?.capacity_items ?? [];
  const locationLine =
    [active?.locality, active?.city, active?.state, active?.country].filter(Boolean).join(', ') || '—';
  const categoryPath = [
    active?.venue_category?.super_category_name,
    active?.venue_category?.category_name,
    active?.venue_category?.sub_category_name,
  ]
    .filter(Boolean)
    .join(' › ');

  return (
    <>
      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1, mb: 1 }}>
          {active?.venue_type && <Chip size="small" variant="outlined" label={active.venue_type} />}
          {typeof active?.capacity === 'number' && (
            <Chip size="small" variant="outlined" label={`Capacity ${active.capacity}`} />
          )}
          <Chip size="small" variant="outlined" label={`GSTIN ${active?.gstin || '—'}`} />
          <Chip size="small" variant="outlined" label={`PAN ${active?.pan || '—'}`} />
        </Stack>
        {categoryPath && (
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            Hosts in: <strong>{categoryPath}</strong>
          </Typography>
        )}
        {capacityItems.length > 0 && (
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1, mb: 1 }}>
            {capacityItems.map((item: any) => (
              <Chip key={item.label} size="small" label={`${item.label}: ${item.capacity}`} />
            ))}
          </Stack>
        )}
        <Typography variant="body2">
          {locationLine}
          {active?.postal_code ? ` · PIN ${active.postal_code}` : ''}
        </Typography>
      </Paper>

      {documents.length > 0 && (
        <Box>
          <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 800 }}>
            Documents
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1, mt: 0.5 }}>
            {documents.map((doc: any) => (
              <Chip
                key={doc.url}
                size="small"
                component={Link}
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                clickable
                label={doc.type}
                variant="outlined"
              />
            ))}
          </Stack>
        </Box>
      )}
    </>
  );
}
