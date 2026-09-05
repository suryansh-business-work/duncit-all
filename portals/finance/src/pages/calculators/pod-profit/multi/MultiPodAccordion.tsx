import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import PodInputsCard from '../PodInputsCard';
import VenueHostCard from '../VenueHostCard';
import ResultsCard from '../ResultsCard';
import { formatRupees, type PodProfitInputs } from '../types';
import PodStat from './PodStat';
import type { MultiPodRow } from './types';

interface Props {
  row: MultiPodRow;
  expanded: boolean;
  onToggle: () => void;
  onRename: (name: string) => void;
  onInputChange: <K extends keyof PodProfitInputs>(key: K, value: PodProfitInputs[K]) => void;
  onRemove: () => void;
}

/**
 * One pod in the comparison.
 *
 * The header carries the four figures the whole screen is read for — Duncit
 * revenue, what the venue receives, what the host receives and the GST — so a
 * collapsed list still answers the question without opening anything.
 *
 * The remove action sits INSIDE the panel rather than in the summary row: an
 * `AccordionSummary` is itself a button, and a second button nested in it is
 * invalid markup that screen readers and keyboard users both trip over.
 */
export default function MultiPodAccordion({
  row,
  expanded,
  onToggle,
  onRename,
  onInputChange,
  onRemove,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { results } = row;
  return (
    <Accordion expanded={expanded} onChange={onToggle} disableGutters>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 1, md: 3 }}
          useFlexGap
          sx={{ width: '100%', alignItems: { md: 'center' }, flexWrap: 'wrap', pr: 1 }}
        >
          <Box sx={{ flex: 1, minWidth: 140 }}>
            <Typography variant="subtitle1" noWrap sx={{ fontWeight: 800 }}>
              {row.name}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t('finance.calculators.totalCollection')} {formatRupees(results.collection_total)}
            </Typography>
          </Box>
          <PodStat
            label={t('finance.calculators.duncitRevenue')}
            value={formatRupees(results.duncit_revenue_total)}
            tone="primary"
            size="sm"
          />
          <PodStat
            label={t('finance.calculators.venueReceives')}
            value={formatRupees(results.venue_receives)}
            tone="success"
            size="sm"
          />
          <PodStat
            label={t('finance.calculators.hostReceives')}
            value={formatRupees(results.host_receives)}
            tone={results.host_receives < 0 ? 'warning' : 'success'}
            size="sm"
          />
          <PodStat
            label={t('finance.calculators.gst')}
            value={formatRupees(results.gst_amount)}
            tone="warning"
            size="sm"
          />
        </Stack>
      </AccordionSummary>

      <AccordionDetails>
        <Stack spacing={2}>
          <TextField
            label={t('finance.calculators.podName')}
            size="small"
            value={row.name}
            onChange={(e) => onRename(e.target.value)}
            helperText={t('finance.calculators.podNameHint')}
            fullWidth
          />
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} sx={{ alignItems: 'flex-start' }}>
            <Stack spacing={2} sx={{ flex: 1, minWidth: 0, width: '100%' }}>
              <PodInputsCard inputs={row.inputs} onChange={onInputChange} />
              <VenueHostCard inputs={row.inputs} onChange={onInputChange} />
            </Stack>
            <Box sx={{ width: { xs: '100%', lg: 360 }, flexShrink: 0 }}>
              <ResultsCard results={results} />
            </Box>
          </Stack>
          <Divider />
          <Box>
            <DuncitButton
              color="error"
              size="small"
              startIcon={<DeleteOutlinedIcon />}
              onClick={onRemove}
            >
              {t('finance.calculators.removeThisPod')}
            </DuncitButton>
          </Box>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
