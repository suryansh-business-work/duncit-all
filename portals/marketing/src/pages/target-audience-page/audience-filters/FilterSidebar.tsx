import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Badge,
  Button,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FilterListIcon from '@mui/icons-material/FilterList';
import { activeFilterCount } from './buildFilters';
import {
  AccountSection,
  ActivitySection,
  LocationSection,
  PeopleSection,
  ReachSection,
  type SectionProps,
} from './sections';
import { EMPTY_FILTERS, type AudienceFilterOptions, type AudienceFilterState } from './types';

interface Props {
  state: AudienceFilterState;
  onChange: (next: AudienceFilterState) => void;
  options: AudienceFilterOptions;
}

const SECTIONS: { title: string; Body: (p: Readonly<SectionProps>) => JSX.Element }[] = [
  { title: 'People', Body: PeopleSection },
  { title: 'Location', Body: LocationSection },
  { title: 'Reachability', Body: ReachSection },
  { title: 'Account', Body: AccountSection },
  { title: 'Activity', Body: ActivitySection },
];

/**
 * The audience filters, as a panel beside the table rather than a popover per
 * column. Micro-targeting means combining eight or ten conditions at once, and
 * a column popover only ever shows you one of them.
 */
export default function FilterSidebar({ state, onChange, options }: Readonly<Props>) {
  const count = activeFilterCount(state);
  const set: SectionProps['set'] = (key, value) => onChange({ ...state, [key]: value });

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }} data-testid="audience-filters">
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}
      >
        <Badge badgeContent={count} color="primary">
          <FilterListIcon fontSize="small" />
        </Badge>
        <Typography variant="subtitle2" fontWeight={800} sx={{ flex: 1 }}>
          Filters
        </Typography>
        <Button size="small" disabled={count === 0} onClick={() => onChange(EMPTY_FILTERS)}>
          Reset
        </Button>
      </Stack>

      {SECTIONS.map(({ title, Body }, index) => (
        <Accordion key={title} defaultExpanded={index === 0} disableGutters elevation={0} square>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="body2" fontWeight={700}>
              {title}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Body state={state} set={set} options={options} />
          </AccordionDetails>
        </Accordion>
      ))}
    </Paper>
  );
}
