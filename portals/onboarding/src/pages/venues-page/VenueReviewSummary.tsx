import { Fragment } from 'react';
import { Box, Chip, Link, Paper, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { venueCategoryPaths } from '@duncit/utils';

export interface VenueReviewSummaryProps {
  active: any;
}

/**
 * What the reviewer is looking at: the venue's type, capacity, tax ids, every
 * category it hosts in, where it is, and its uploaded documents. Read-only —
 * hoisted out of the dialog so that file stays a list of panels (rule 9).
 */
export default function VenueReviewSummary({ active }: Readonly<VenueReviewSummaryProps>) {
  const { t } = useTranslation();
  const documents = active?.documents ?? [];
  const capacityItems = active?.capacity_items ?? [];
  const locationLine =
    [active?.locality, active?.city, active?.state, active?.country].filter(Boolean).join(', ') || '—';
  const categoryPaths = venueCategoryPaths(active);

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
        {categoryPaths.length > 0 && (
          <Typography variant="body2" sx={{ mb: 0.5 }} data-testid="venue-review-categories">
            {t('onboarding.venues.hostsIn')}{' '}
            {categoryPaths.map((path, index) => (
              <Fragment key={path}>
                {index > 0 && ', '}
                <strong>{path}</strong>
              </Fragment>
            ))}
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
          <Typography variant="overline" component="h3" sx={{ color: 'text.secondary', fontWeight: 800 }}>
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
