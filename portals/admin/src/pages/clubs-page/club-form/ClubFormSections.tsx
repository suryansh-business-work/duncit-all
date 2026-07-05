import { Accordion, AccordionDetails, AccordionSummary, Button, Chip, Stack, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import BasicClubSection from './BasicClubSection';
import ClubMediaSection from './ClubMediaSection';
import ClubVenueLinksSection from './ClubVenueLinksSection';
import ClubContentSection from './ClubContentSection';
import { SECTION_OF, type ClubErrors } from './clubValidation';
import type { ClubForm } from '../queries';

export const SECTIONS = [
  { id: 'basic', title: '1. Basic Information' },
  { id: 'media', title: '2. Media & Moments' },
  { id: 'venues', title: '3. Venues & Community Links' },
  { id: 'content', title: '4. Page Content (Who We Are, Perks, FAQs…)' },
];

interface Props {
  form: ClubForm;
  setForm: (f: ClubForm | ((prev: ClubForm) => ClubForm)) => void;
  expanded: Set<string>;
  onToggle: (id: string, open: boolean) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  errors: ClubErrors;
  superCats: any[];
  allCats: any[];
  locations: any[];
}

export default function ClubFormSections(props: Readonly<Props>) {
  const allOpen = props.expanded.size === SECTIONS.length;
  const errorCount = (id: string) =>
    Object.keys(props.errors).filter((key) => SECTION_OF[key] === id).length;
  return (
    <>
      <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mb: 1 }}>
        <Button size="small" startIcon={<UnfoldMoreIcon />} onClick={props.onExpandAll} disabled={allOpen}>Expand all</Button>
        <Button size="small" startIcon={<UnfoldLessIcon />} onClick={props.onCollapseAll} disabled={props.expanded.size === 0}>Collapse all</Button>
      </Stack>
      {SECTIONS.map((section) => (
        <Accordion key={section.id} expanded={props.expanded.has(section.id)} onChange={(_, open) => props.onToggle(section.id, open)} disableGutters square sx={{ '&:before': { display: 'none' }, mb: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden', boxShadow: 'none', '&.Mui-expanded': { mb: 1.5 } }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="subtitle1" fontWeight={600}>{section.title}</Typography>
              {errorCount(section.id) > 0 && (
                <Chip size="small" color="error" label={`${errorCount(section.id)} required`} />
              )}
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            {section.id === 'basic' && <BasicClubSection form={props.form} setForm={props.setForm} errors={props.errors} superCats={props.superCats} allCats={props.allCats} locations={props.locations} />}
            {section.id === 'media' && <ClubMediaSection form={props.form} setForm={props.setForm} errors={props.errors} />}
            {section.id === 'venues' && <ClubVenueLinksSection form={props.form} setForm={props.setForm} errors={props.errors} />}
            {section.id === 'content' && <ClubContentSection form={props.form} setForm={props.setForm} errors={props.errors} />}
          </AccordionDetails>
        </Accordion>
      ))}
    </>
  );
}