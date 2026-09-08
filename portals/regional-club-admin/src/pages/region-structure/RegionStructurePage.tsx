import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import { PageHeader } from '@duncit/ui';
import { useTranslation } from '../../i18n';
import { RegionDrillDrawer, useDrillStack } from '../drill';
import RegionCanvas from './RegionCanvas';
import CanvasToolbar from './CanvasToolbar';
import { matchingNodeIds } from './search';
import { useRegionView } from './useRegionView';
import {
  MY_REGION_TREE,
  NODE_KIND_KEYS,
  NODE_TONE,
  type Region,
  type RegionNodeKind,
  type RegionTreeEdge,
  type RegionTreeNode,
} from '../queries';

interface TreeQueryData {
  myRegion: Region;
  myRegionTree: { nodes: RegionTreeNode[]; edges: RegionTreeEdge[] };
  publicFinanceSettings: { currency_symbol: string };
}

/** The legend's order IS the hierarchy — it doubles as the level key. */
const KINDS = ['REGION', 'CITY', 'LOCALITY', 'CLUB_ADMIN', 'HOST'] as const;

/** Full screen is a CSS mode rather than the Fullscreen API: MUI renders its
 * drawers and dialogs into a portal on `document.body`, which the API's
 * fullscreen element does not contain — the drill-down would open behind the
 * canvas and look like a dead click. */
const FULL_SCREEN_SX = {
  position: 'fixed',
  inset: 0,
  zIndex: (theme: { zIndex: { drawer: number } }) => theme.zIndex.drawer + 1,
  borderRadius: 0,
} as const;

/**
 * Regional Club Admin > Region Structure.
 *
 * The whole patch on one canvas. Only the Club Admins are stored — every level
 * below them is read from the clubs they run and the pods those clubs hold, so
 * the tree is never stale and there is nothing to re-sync when a club moves.
 */
export default function RegionStructurePage() {
  const { t } = useTranslation();
  const [fullScreen, setFullScreen] = useState(false);
  const { direction, setDirection, search, setSearch } = useRegionView();
  const drill = useDrillStack();

  const { data, loading, error } = useQuery<TreeQueryData>(MY_REGION_TREE, {
    fetchPolicy: 'cache-and-network',
  });
  const currency = data?.publicFinanceSettings?.currency_symbol ?? '';

  const nodes = useMemo(() => data?.myRegionTree.nodes ?? [], [data]);
  const edges: RegionTreeEdge[] = data?.myRegionTree.edges ?? [];
  const empty = !loading && nodes.length <= 1;
  const drawing = loading && nodes.length === 0;

  const { ids: matched, hits } = useMemo(() => matchingNodeIds(nodes, search), [nodes, search]);

  // Escape leaves full screen, because a fixed overlay with no chrome around it
  // has no other obvious way out.
  useEffect(() => {
    if (!fullScreen) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFullScreen(false);
    };
    globalThis.addEventListener('keydown', onKey);
    return () => globalThis.removeEventListener('keydown', onKey);
  }, [fullScreen]);

  const openNode = (kind: RegionNodeKind, refId: string, label: string) => {
    if (kind === 'HOST') drill.open({ kind: 'HOST_PODS', id: refId, label });
    else drill.open({ kind: 'CLUBS', id: refId, label });
  };

  return (
    <Box>
      {!fullScreen && (
        <PageHeader
          title={data?.myRegion.region_name ?? t('partners.regional.structureTitle')}
          subtitle={t('partners.regional.structureSubtitle')}
          sx={{ mb: 2 }}
        />
      )}

      <Stack spacing={2}>
        {error && !fullScreen && <Alert severity="error">{error.message}</Alert>}

        {!fullScreen && (
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
        )}

        {!fullScreen && !empty && (
          <Alert severity="info">{t('partners.regional.clickHostHint')}</Alert>
        )}
        {!fullScreen && empty && <Alert severity="info">{t('partners.regional.emptyRegion')}</Alert>}

        <CanvasToolbar
          search={search}
          onSearch={setSearch}
          direction={direction}
          onDirection={setDirection}
          hits={hits}
          total={nodes.length}
        />

        {search && hits === 0 && !drawing && (
          <Alert severity="warning">{t('partners.regional.noCanvasMatch')}</Alert>
        )}

        <Box
          sx={{
            height: fullScreen ? '100vh' : { xs: 480, md: 620 },
            border: 1,
            borderColor: 'divider',
            borderRadius: 2,
            overflow: 'hidden',
            position: 'relative',
            // The canvas paints its own surface; without this it borrows the
            // page's and the minimap's contrast collapses in dark mode.
            bgcolor: 'background.default',
            ...(fullScreen ? FULL_SCREEN_SX : {}),
          }}
        >
          {drawing ? (
            <Stack
              spacing={1.5}
              sx={{ height: '100%', alignItems: 'center', justifyContent: 'center' }}
            >
              <CircularProgress size={28} />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {t('partners.regional.loadingRegion')}
              </Typography>
            </Stack>
          ) : (
            <RegionCanvas
              nodes={nodes}
              edges={edges}
              direction={direction}
              matched={matched}
              fullScreen={fullScreen}
              onToggleFullScreen={() => setFullScreen((on) => !on)}
              onOpenNode={openNode}
            />
          )}
        </Box>
      </Stack>

      <RegionDrillDrawer
        stack={drill.stack}
        currency={currency}
        onPush={drill.push}
        onPop={drill.pop}
        onClose={drill.close}
      />
    </Box>
  );
}
