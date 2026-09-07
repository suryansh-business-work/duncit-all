import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, Chip, Stack } from '@mui/material';
import { PageHeader } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import RegionCanvas from './RegionCanvas';
import HostPodsDrawer from './HostPodsDrawer';
import {
  MY_REGION_TREE,
  NODE_KIND_KEYS,
  NODE_TONE,
  type Region,
  type RegionTreeEdge,
  type RegionTreeNode,
} from './queries';

interface TreeQueryData {
  myRegion: Region;
  myRegionTree: { nodes: RegionTreeNode[]; edges: RegionTreeEdge[] };
  publicFinanceSettings: { currency_symbol: string };
}

/** The legend's order IS the hierarchy — it doubles as the level key. */
const KINDS = ['REGION', 'CITY', 'LOCALITY', 'CLUB_ADMIN', 'HOST'] as const;

/**
 * Partners > Regional Club Admin > Region Structure.
 *
 * The whole patch on one canvas. Only the Club Admins are stored — every level
 * below them is read from the clubs they run and the pods those clubs hold, so
 * the tree is never stale and there is nothing to re-sync when a club moves.
 */
export default function RegionStructurePage() {
  const { t } = useTranslation();
  const [host, setHost] = useState<{ id: string; label: string } | null>(null);

  const { data, loading, error } = useQuery<TreeQueryData>(MY_REGION_TREE, {
    fetchPolicy: 'cache-and-network',
  });
  const currency = data?.publicFinanceSettings?.currency_symbol ?? '';

  const nodes = data?.myRegionTree.nodes ?? [];
  const edges = data?.myRegionTree.edges ?? [];
  const empty = !loading && nodes.length <= 1;

  return (
    <Box>
      <PageHeader
        title={data?.myRegion.region_name ?? t('partners.regional.structureTitle')}
        subtitle={t('partners.regional.structureSubtitle')}
        sx={{ mb: 2 }}
      />

      <Stack spacing={2}>
        {error && <Alert severity="error">{error.message}</Alert>}

        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          {KINDS.map((kind) => (
            <Chip
              key={kind}
              size="small"
              variant="outlined"
              color={NODE_TONE[kind] as 'primary'}
              label={t(NODE_KIND_KEYS[kind])}
            />
          ))}
        </Stack>

        {empty ? (
          <Alert severity="info">{t('partners.regional.emptyRegion')}</Alert>
        ) : (
          <Alert severity="info">{t('partners.regional.clickHostHint')}</Alert>
        )}

        <RegionCanvas
          nodes={nodes}
          edges={edges}
          onHostOpen={(id, label) => setHost({ id, label })}
        />
      </Stack>

      <HostPodsDrawer host={host} currency={currency} onClose={() => setHost(null)} />
    </Box>
  );
}
