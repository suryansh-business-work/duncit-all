import type { JSX } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Badge,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FilterListIcon from '@mui/icons-material/FilterList';
import { DuncitButton } from '@duncit/buttons';
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
import { useTranslation } from '@duncit/app-settings';

type Translate = ReturnType<typeof useTranslation>['t'];

interface Props {
  state: AudienceFilterState;
  onChange: (next: AudienceFilterState) => void;
  options: AudienceFilterOptions;
}

const sections = (t: Translate): { title: string; Body: (p: Readonly<SectionProps>) => JSX.Element }[] => [
  { title: t('marketing.common.people'), Body: PeopleSection },
  { title: t('marketing.common.location'), Body: LocationSection },
  { title: t('marketing.targetAudience.reachability'), Body: ReachSection },
  { title: t('marketing.targetAudience.account'), Body: AccountSection },
  { title: t('marketing.targetAudience.activity'), Body: ActivitySection },
];

/**
 * The audience filters, as a panel beside the table rather than a popover per
 * column. Micro-targeting means combining eight or ten conditions at once, and
 * a column popover only ever shows you one of them.
 */
export default function FilterSidebar({ state, onChange, options }: Readonly<Props>) {
  const { t } = useTranslation();
  const count = activeFilterCount(state);
  const set: SectionProps['set'] = (key, value) => onChange({ ...state, [key]: value });

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }} data-testid="audience-filters">
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: "center",
          px: 2,
          py: 1.5,
          borderBottom: 1,
          borderColor: 'divider'
        }}>
        <Badge badgeContent={count} color="primary">
          <FilterListIcon fontSize="small" />
        </Badge>
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 800,
            flex: 1
          }}>
          {t('marketing.targetAudience.filters')}
        </Typography>
        <DuncitButton size="small" disabled={count === 0} onClick={() => onChange(EMPTY_FILTERS)}>
          {t('marketing.common.reset')}
        </DuncitButton>
      </Stack>

      {sections(t).map(({ title, Body }, index) => (
        <Accordion key={title} defaultExpanded={index === 0} disableGutters elevation={0} square>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="body2" sx={{
              fontWeight: 700
            }}>
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
