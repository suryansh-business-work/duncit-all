import { Accordion, AccordionDetails, AccordionSummary, Button, Stack, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import BasicInfoSection from './BasicInfoSection';
import MediaSection from './MediaSection';
import WhenWhereSection from './WhenWhereSection';
import AboutSection from './AboutSection';
import OffersSection from './OffersSection';
import PerksSection from './PerksSection';
import PaymentChargesSection from './PaymentChargesSection';

export const SECTIONS = [
  { id: 'basic', title: '1. Basic Information', body: 'BasicInfoSection' as const },
  { id: 'media', title: '2. Media Uploads', body: 'MediaSection' as const },
  { id: 'when', title: '3. When, Where & Map', body: 'WhenWhereSection' as const },
  { id: 'about', title: '4. About this Pod', body: 'AboutSection' as const },
  { id: 'offers', title: '5. What This Pod Offers', body: 'OffersSection' as const },
  { id: 'perks', title: '6. Available Perks', body: 'PerksSection' as const },
  { id: 'payment', title: '7. Payment & Place Charges', body: 'PaymentChargesSection' as const },
];

interface Props {
  expanded: Set<string>;
  onToggle: (id: string, open: boolean) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  clubs: any[];
  filteredLocations: any[];
  zoneOptions: string[];
  users: any[];
  userName: (id: string) => string;
  finance?: { platform_fee_pct: number; gst_pct: number; currency_symbol?: string };
}

export default function PodFormSections({
  expanded,
  onToggle,
  onExpandAll,
  onCollapseAll,
  clubs,
  filteredLocations,
  zoneOptions,
  users,
  userName,
  finance,
}: Props) {
  const allOpen = expanded.size === SECTIONS.length;
  return (
    <>
      <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mb: 1 }}>
        <Button
          size="small"
          startIcon={<UnfoldMoreIcon />}
          onClick={onExpandAll}
          disabled={allOpen}
          aria-label="Expand all sections"
        >
          Expand all
        </Button>
        <Button
          size="small"
          startIcon={<UnfoldLessIcon />}
          onClick={onCollapseAll}
          disabled={expanded.size === 0}
          aria-label="Collapse all sections"
        >
          Collapse all
        </Button>
      </Stack>
      {SECTIONS.map((sec) => (
        <Accordion
          key={sec.id}
          expanded={expanded.has(sec.id)}
          onChange={(_, v) => onToggle(sec.id, v)}
          disableGutters
          square
          sx={{
            '&:before': { display: 'none' },
            mb: 1.5,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1.5,
            overflow: 'hidden',
            boxShadow: 'none',
            '&.Mui-expanded': { mb: 1.5 },
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1" fontWeight={600}>
              {sec.title}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            {sec.body === 'BasicInfoSection' && (
              <BasicInfoSection users={users} userName={userName} />
            )}
            {sec.body === 'MediaSection' && <MediaSection />}
            {sec.body === 'WhenWhereSection' && (
              <WhenWhereSection
                clubs={clubs}
                filteredLocations={filteredLocations}
                zoneOptions={zoneOptions}
              />
            )}
            {sec.body === 'AboutSection' && <AboutSection />}
            {sec.body === 'OffersSection' && <OffersSection />}
            {sec.body === 'PerksSection' && <PerksSection />}
            {sec.body === 'PaymentChargesSection' && (
              <PaymentChargesSection finance={finance} />
            )}
          </AccordionDetails>
        </Accordion>
      ))}
    </>
  );
}
