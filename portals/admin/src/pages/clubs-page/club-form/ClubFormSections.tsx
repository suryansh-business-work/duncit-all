import { Accordion, AccordionDetails, AccordionSummary, Button, Stack, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import BasicClubSection from './BasicClubSection';
import ClubMediaSection from './ClubMediaSection';
import ClubVenueLinksSection from './ClubVenueLinksSection';
import type { ClubForm } from '../queries';

export const SECTIONS = [
  { id: 'basic', title: '1. Basic Information' },
  { id: 'media', title: '2. Media & Moments' },
  { id: 'venues', title: '3. Venues & Community Links' },
];

interface Props {
  form: ClubForm;
  setForm: (f: ClubForm | ((prev: ClubForm) => ClubForm)) => void;
  expanded: Set<string>;
  onToggle: (id: string, open: boolean) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  superCats: any[];
  allCats: any[];
  venues: any[];
}

export default function ClubFormSections(props: Readonly<Props>) {
  const allOpen = props.expanded.size === SECTIONS.length;
  return (
    <>
      <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mb: 1 }}>
        <Button size="small" startIcon={<UnfoldMoreIcon />} onClick={props.onExpandAll} disabled={allOpen}>Expand all</Button>
        <Button size="small" startIcon={<UnfoldLessIcon />} onClick={props.onCollapseAll} disabled={props.expanded.size === 0}>Collapse all</Button>
      </Stack>
      {SECTIONS.map((section) => (
        <Accordion key={section.id} expanded={props.expanded.has(section.id)} onChange={(_, open) => props.onToggle(section.id, open)} disableGutters square sx={{ '&:before': { display: 'none' }, mb: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden', boxShadow: 'none', '&.Mui-expanded': { mb: 1.5 } }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1" fontWeight={600}>{section.title}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {section.id === 'basic' && <BasicClubSection form={props.form} setForm={props.setForm} superCats={props.superCats} allCats={props.allCats} />}
            {section.id === 'media' && <ClubMediaSection form={props.form} setForm={props.setForm} />}
            {section.id === 'venues' && <ClubVenueLinksSection form={props.form} setForm={props.setForm} venues={props.venues} />}
          </AccordionDetails>
        </Accordion>
      ))}
    </>
  );
}