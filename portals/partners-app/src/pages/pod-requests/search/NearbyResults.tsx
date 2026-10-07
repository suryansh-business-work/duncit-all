import type { ReactNode } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { widerPodRequestRadius } from '@duncit/utils';
import NearbyResultCard, { type NearbyCardData } from './NearbyResultCard';
import SearchingNearby from './SearchingNearby';

interface Props {
  loading: boolean;
  error: string | null;
  items: readonly NearbyCardData[];
  radiusKm: number;
  /** True while a category filter narrows the search — offers "Try all categories". */
  filtered: boolean;
  searching: { title: string; hint: string; icon: ReactNode };
  emptyText: string;
  canRequest: boolean;
  onRequest: (item: NearbyCardData) => void;
  onRadius: (km: number) => void;
  onAllCategories: () => void;
}

/** The radar while searching, then the cards — or the two ways to widen an empty search. */
export default function NearbyResults(props: Readonly<Props>) {
  const { t } = useTranslation();
  const { loading, error, items, radiusKm, filtered, searching } = props;
  if (loading) return <SearchingNearby title={searching.title} hint={searching.hint} icon={searching.icon} />;
  if (error) return <Alert severity="error">{error}</Alert>;

  if (items.length === 0) {
    const wider = widerPodRequestRadius(radiusKm);
    return (
      <Card variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
        <Stack spacing={1.5} sx={{ alignItems: 'flex-start' }}>
          <Typography sx={{ color: 'text.secondary' }}>{props.emptyText}</Typography>
          <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: 'wrap' }}>
            {wider !== null && (
              <DuncitButton variant="contained" onClick={() => props.onRadius(wider)}>
                {t('podRequests.expandSearch', { vars: { km: wider } })}
              </DuncitButton>
            )}
            {filtered && (
              <DuncitButton variant="outlined" onClick={props.onAllCategories}>
                {t('podRequests.tryAllCategories')}
              </DuncitButton>
            )}
          </Stack>
        </Stack>
      </Card>
    );
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' },
      }}
    >
      {items.map((item) => (
        <NearbyResultCard key={item.id} item={item} canRequest={props.canRequest} onRequest={props.onRequest} />
      ))}
    </Box>
  );
}
