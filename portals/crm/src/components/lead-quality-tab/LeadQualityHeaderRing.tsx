import { useSearchParams } from 'react-router';
import { Box, Skeleton } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { TAB_PARAM, tabIds } from '@duncit/tabs';
import type { CrmLeadEntityType } from '../../api/crm.types';
import QualityScoreRing from '../lead-quality/QualityScoreRing';
import { QUALITY_TAB, useLeadQualityDetails } from './useLeadQuality';

interface Props {
  entity: CrmLeadEntityType;
  leadId: string;
}

/** LeadTabs' strip id prefix, so the ring can move focus onto the tab it opens. */
const LEAD_TABS_PREFIX = 'lead';
/** The large ring's diameter (QualityScoreRing size="large"), so the placeholder does not shift the header. */
const RING_SIZE = (theme: Theme) => theme.spacing(12);

/**
 * The large score ring in a lead detail page's header. It reads the same
 * result as the Quality Score tab; a click selects that tab (in the URL, like
 * every tab switch) and moves focus to it. A failed load shows nothing here —
 * the tab itself carries the error and its retry.
 */
export default function LeadQualityHeaderRing({ entity, leadId }: Readonly<Props>) {
  const { details, loading } = useLeadQualityDetails(entity, leadId, 'cache-and-network');
  const [searchParams, setSearchParams] = useSearchParams();

  if (loading && !details) {
    return <Skeleton variant="circular" sx={{ width: RING_SIZE, height: RING_SIZE, flexShrink: 0 }} data-testid="lead-quality-header-loading" />;
  }
  if (!details) return null;

  const openTab = () => {
    const next = new URLSearchParams(searchParams);
    next.set(TAB_PARAM, QUALITY_TAB);
    setSearchParams(next, { replace: true });
    document.getElementById(tabIds(LEAD_TABS_PREFIX, QUALITY_TAB).tabId)?.focus();
  };
  const { result } = details;
  return (
    <Box sx={{ flexShrink: 0 }} data-testid="lead-quality-header-ring">
      <QualityScoreRing size="large" score={result?.score ?? null} tone={result?.tone} label={result?.classification_label} onClick={openTab} />
    </Box>
  );
}
