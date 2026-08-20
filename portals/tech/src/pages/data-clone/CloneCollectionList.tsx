import { Chip, LinearProgress, List, ListItem, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { formatBytes } from '../server/format';
import type { CloneCollection, CloneCollectionStatus } from './queries';
import { formatDateTime } from '@duncit/app-settings';

type ChipColor = 'default' | 'info' | 'success' | 'error';

const STATUS_COLOR: Record<CloneCollectionStatus, ChipColor> = {
  PENDING: 'default',
  COPYING: 'info',
  DONE: 'success',
  FAILED: 'error',
};

const STATUS_KEY: Record<CloneCollectionStatus, string> = {
  PENDING: 'tech.dataClone.rowPending',
  COPYING: 'tech.dataClone.rowCopying',
  DONE: 'tech.dataClone.rowDone',
  FAILED: 'tech.dataClone.rowFailed',
};

/** Per-document progress, or indeterminate until the source count is known. */
function CollectionBar({ item }: Readonly<{ item: CloneCollection }>) {
  if (item.status !== 'COPYING') return null;
  if (item.sourceCount <= 0) return <LinearProgress sx={{ mt: 1 }} />;
  const value = Math.min(100, (item.copiedCount / item.sourceCount) * 100);
  return <LinearProgress variant="determinate" value={value} sx={{ mt: 1 }} />;
}

function CollectionRow({ item }: Readonly<{ item: CloneCollection }>) {
  const { t } = useTranslation();
  const counts = `${item.copiedCount.toLocaleString()} / ${item.sourceCount.toLocaleString()}`;
  return (
    <ListItem disableGutters sx={{ display: 'block', py: 1 }}>
      <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
        <Typography variant="body2" fontWeight={600} sx={{ flex: 1, minWidth: 0 }} noWrap>
          {item.name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {counts}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {formatBytes(item.bytes)}
        </Typography>
        <Chip size="small" color={STATUS_COLOR[item.status]} label={t(STATUS_KEY[item.status])} />
      </Stack>
      <CollectionBar item={item} />
      {item.error && (
        <Typography variant="caption" color="error.main">
          {item.error}
        </Typography>
      )}
    </ListItem>
  );
}

/** The collection-by-collection feed: one row per collection, in copy order. */
export default function CloneCollectionList({
  collections,
}: Readonly<{ collections: CloneCollection[] }>) {
  return (
    <List dense disablePadding>
      {collections.map((item) => (
        <CollectionRow key={item.name} item={item} />
      ))}
    </List>
  );
}
