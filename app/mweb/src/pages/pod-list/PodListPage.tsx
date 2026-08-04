import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  CircularProgress,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { buildFeedRows, computeColumns, filterByQuery, rowForPodIndex } from '@duncit/virtual-scroll';
import type { PublicAd } from '../../components/ads/useActiveAds';
import { useVirtualRows } from '../../hooks/useVirtualRows';
import { useTranslation } from '../../i18n/useTranslation';
import { podUrl } from '../../utils/seoUrls';
import VirtualPodRows, { LIST_GAP } from './VirtualPodRows';

const CARD_WIDTH = 264;
const AD_EVERY = 4;
const POD_ROW_ESTIMATE = 430;
/** Stable default so an ad-less list does not rebuild its rows every render. */
const NO_ADS: PublicAd[] = [];
/** Any of these means the user took over — stop re-anchoring the ?from jump. */
const USER_INTENT_EVENTS = ['wheel', 'touchstart', 'pointerdown'] as const;

interface PodListPageProps {
  title: string;
  subtitle: string;
  icon: ReactNode;
  pods: any[];
  ads?: PublicAd[];
  loading: boolean;
  error?: { message: string } | null;
  emptyText: string;
  hostNameOf: (pod: any) => string | null;
  /** Filter trigger rendered beside the search box (category + price + date). */
  filterAction?: ReactNode;
}

/**
 * Shared "all pods" page (Happening nearby / Previous Pods): searchable,
 * windowed and infinite — rows mount ahead of the scroll until the list ends,
 * and `?from=N` jumps to where the home rail stopped.
 */
export default function PodListPage(props: Readonly<PodListPageProps>) {
  const { title, subtitle, icon, pods, ads = NO_ADS, loading, error, emptyText, hostNameOf, filterAction } = props;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [width, setWidth] = useState(0);
  const from = Number.parseInt(searchParams.get('from') ?? '', 10);

  // Same fields as the native twin (rule 27) so both surfaces match the same
  // pods for the same query.
  const filteredPods = useMemo(
    () =>
      filterByQuery(pods, query, (pod: any) => [
        pod.pod_title,
        pod.place_label,
        pod.place_detail,
        ...(pod.host_names ?? []),
      ]),
    [pods, query],
  );

  const searching = query.trim() !== '';
  const activeAds = searching ? NO_ADS : ads;
  const columns = computeColumns(width, CARD_WIDTH, LIST_GAP);
  const rows = useMemo(
    () =>
      buildFeedRows<any, PublicAd>({
        pods: filteredPods,
        ads: activeAds,
        columns,
        adEvery: AD_EVERY,
        adKeyOf: (ad, index) => `ad-${ad.id}-${index}`,
      }),
    [filteredPods, activeAds, columns],
  );

  const adEstimate = width > 0 ? Math.round((width * 9) / 16) : 220;
  const adsKey = activeAds.map((ad) => ad.id).join('|');
  const { listRef, range, measureRow, scrollToRow } = useVirtualRows({
    rowCount: rows.length,
    estimateOf: (row) => (rows[row]?.kind === 'ad' ? adEstimate : POD_ROW_ESTIMATE),
    gap: LIST_GAP,
    resetKey: `${columns}:${query}:${adsKey}`,
  });

  // Re-measure when the list branch actually mounts — on a cold load the first
  // commit renders the spinner, so a mount-only measure would keep width 0.
  const listMounted = pods.length > 0;
  useEffect(() => {
    const measure = () => setWidth(listRef.current?.clientWidth ?? 0);
    measure();
    globalThis.addEventListener('resize', measure);
    return () => globalThis.removeEventListener('resize', measure);
  }, [listRef, listMounted]);

  // "See all" continuation: land on the pod right after the home rail's cap.
  // Re-anchors when the row model shifts under the viewport (late-arriving ad
  // banners, measured heights replacing estimates) until the user takes over.
  const userTookOverRef = useRef(false);
  useEffect(() => {
    const markUserIntent = () => {
      userTookOverRef.current = true;
    };
    USER_INTENT_EVENTS.forEach((event) =>
      globalThis.addEventListener(event, markUserIntent, { passive: true }),
    );
    return () =>
      USER_INTENT_EVENTS.forEach((event) => globalThis.removeEventListener(event, markUserIntent));
  }, []);
  useEffect(() => {
    if (!Number.isFinite(from) || from <= 0 || searching) return undefined;
    if (width === 0 || pods.length <= from || userTookOverRef.current) return undefined;
    const anchor = () => {
      if (!userTookOverRef.current) scrollToRow(rowForPodIndex(rows, from));
    };
    anchor();
    const timer = globalThis.setTimeout(anchor, 300);
    return () => globalThis.clearTimeout(timer);
  }, [from, width, pods.length, rows, searching, scrollToRow]);

  let body: ReactNode;
  if (loading && pods.length === 0) {
    body = (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  } else if (error) {
    body = <Alert severity="error">{error.message}</Alert>;
  } else if (pods.length === 0) {
    body = <Alert severity="info">{emptyText}</Alert>;
  } else if (filteredPods.length === 0) {
    body = <Alert severity="info">{t('mweb.home.noSearchResults')}</Alert>;
  } else {
    body = (
      <VirtualPodRows
        rows={rows}
        range={range}
        listRef={listRef}
        measureRow={measureRow}
        hostNameOf={hostNameOf}
        onOpenPod={(pod) => navigate(podUrl(pod.club_slug, pod.pod_id))}
      />
    );
  }

  return (
    <Stack spacing={2} sx={{ p: { xs: 1.5, sm: 2 }, minHeight: '100%' }}>
      <Stack direction="row" spacing={1.25} alignItems="center">
        {icon}
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            {subtitle}
          </Typography>
        </Box>
      </Stack>
      <Stack direction="row" spacing={1} alignItems="center">
        <TextField
          size="small"
          fullWidth
          placeholder={t('mweb.home.searchPods')}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        {filterAction}
      </Stack>
      {body}
    </Stack>
  );
}
