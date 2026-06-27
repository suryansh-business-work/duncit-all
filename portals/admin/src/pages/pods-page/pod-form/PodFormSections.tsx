import { Accordion, AccordionDetails, AccordionSummary, Button, FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import { useFormikContext } from 'formik';
import BasicInfoSection from './BasicInfoSection';
import MediaSection from './MediaSection';
import WhenWhereSection from './WhenWhereSection';
import MeetingSection from './MeetingSection';
import AboutSection from './AboutSection';
import OffersSection from './OffersSection';
import PerksSection from './PerksSection';
import PaymentChargesSection from './PaymentChargesSection';
import DuncitProductsSection from './DuncitProductsSection';
import type { PodForm } from '../queries';
import { useFeatureFlag } from '../../../hooks/useFeatureFlag';

type SectionBody =
  | 'BasicInfoSection'
  | 'WhenWhereSection'
  | 'MeetingSection'
  | 'AboutSection'
  | 'OffersSection'
  | 'PerksSection'
  | 'DuncitProductsSection'
  | 'PaymentChargesSection';
type SectionConfig = { id: string; label: string; body: SectionBody };

export const SECTION_IDS = ['basic', 'when', 'meeting', 'about', 'offers', 'perks', 'products', 'payment'];

function getSections(podMode: PodForm['pod_mode'], showProducts: boolean) {
  const productSections: SectionConfig[] = podMode === 'VIRTUAL' || !showProducts
    ? []
    : [{ id: 'products', label: 'Approved Products', body: 'DuncitProductsSection' }];
  const base: SectionConfig[] = [
    { id: 'basic', label: 'Basic Information', body: 'BasicInfoSection' },
    podMode === 'VIRTUAL'
      ? { id: 'meeting', label: 'Meeting Details', body: 'MeetingSection' }
      : { id: 'when', label: 'When, Where & Map', body: 'WhenWhereSection' },
    { id: 'about', label: 'About this Pod', body: 'AboutSection' },
    { id: 'offers', label: 'What This Pod Offers', body: 'OffersSection' },
    { id: 'perks', label: 'Available Perks', body: 'PerksSection' },
    ...productSections,
    { id: 'payment', label: 'Payment & Charges', body: 'PaymentChargesSection' },
  ];
  return base.map((section, index) => ({
    ...section,
    title: `${index + 1}. ${section.label}`,
  }));
}

interface Props {
  expanded: Set<string>;
  onToggle: (id: string, open: boolean) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  clubs: any[];
  venues: any[];
  inventoryProducts: any[];
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
  venues,
  inventoryProducts,
  users,
  userName,
  finance,
}: Readonly<Props>) {
  const { values, setFieldValue } = useFormikContext<PodForm>();
  const showProducts = useFeatureFlag('is_product_visible');
  const sections = getSections(values.pod_mode, showProducts);
  const expandableSections = sections.filter((section) => section.id !== 'products' || values.products_enabled);
  const allOpen = expandableSections.every((section) => expanded.has(section.id));
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
      <MediaSection />
      {sections.map((sec) => (
        <Accordion
          key={sec.id}
          expanded={sec.id === 'products' ? values.products_enabled && expanded.has(sec.id) : expanded.has(sec.id)}
          onChange={(_, open) => {
            if (sec.id === 'products' && !values.products_enabled) return;
            onToggle(sec.id, open);
          }}
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
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ width: '100%' }}>
              <Typography variant="subtitle1" fontWeight={600}>{sec.title}</Typography>
              {sec.id === 'products' && (
                <FormControlLabel
                  onClick={(event) => event.stopPropagation()}
                  onFocus={(event) => event.stopPropagation()}
                  control={
                    <Switch
                      checked={values.products_enabled}
                      onChange={(event) => {
                        setFieldValue('products_enabled', event.target.checked);
                        onToggle('products', event.target.checked);
                      }}
                    />
                  }
                  label="Enable"
                />
              )}
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            {sec.body === 'BasicInfoSection' && (
              <BasicInfoSection clubs={clubs} users={users} userName={userName} />
            )}
            {sec.body === 'WhenWhereSection' && (
              <WhenWhereSection clubs={clubs} venues={venues} />
            )}
            {sec.body === 'MeetingSection' && <MeetingSection />}
            {sec.body === 'AboutSection' && <AboutSection />}
            {sec.body === 'OffersSection' && <OffersSection />}
            {sec.body === 'PerksSection' && <PerksSection />}
            {sec.body === 'DuncitProductsSection' && values.products_enabled && (
              <DuncitProductsSection products={inventoryProducts} />
            )}
            {sec.body === 'PaymentChargesSection' && (
              <PaymentChargesSection finance={finance} inventoryProducts={inventoryProducts} />
            )}
          </AccordionDetails>
        </Accordion>
      ))}
    </>
  );
}
