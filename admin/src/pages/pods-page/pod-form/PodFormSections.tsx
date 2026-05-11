import { Accordion, AccordionDetails, AccordionSummary, Button, FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import { useFormikContext } from 'formik';
import BasicInfoSection from './BasicInfoSection';
import MediaSection from './MediaSection';
import WhenWhereSection from './WhenWhereSection';
import AboutSection from './AboutSection';
import OffersSection from './OffersSection';
import PerksSection from './PerksSection';
import PaymentChargesSection from './PaymentChargesSection';
import DuncitProductsSection from './DuncitProductsSection';
import type { PodForm } from '../queries';

export const SECTIONS = [
  { id: 'basic', title: '1. Basic Information', body: 'BasicInfoSection' as const },
  { id: 'when', title: '2. When, Where & Map', body: 'WhenWhereSection' as const },
  { id: 'about', title: '3. About this Pod', body: 'AboutSection' as const },
  { id: 'offers', title: '4. What This Pod Offers', body: 'OffersSection' as const },
  { id: 'perks', title: '5. Available Perks', body: 'PerksSection' as const },
  { id: 'products', title: '6. Duncit Products', body: 'DuncitProductsSection' as const },
  { id: 'payment', title: '7. Payment & Place Charges', body: 'PaymentChargesSection' as const },
];

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
}: Props) {
  const { values, setFieldValue } = useFormikContext<PodForm>();
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
      <MediaSection />
      {SECTIONS.map((sec) => (
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
              <BasicInfoSection users={users} userName={userName} />
            )}
            {sec.body === 'WhenWhereSection' && (
              <WhenWhereSection clubs={clubs} venues={venues} />
            )}
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
