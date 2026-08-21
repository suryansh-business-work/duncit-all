import { useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useFormContext, useWatch } from 'react-hook-form';
import ActivityLogsSection from './ActivityLogsSection';
import AdvancedSettingsSection from './AdvancedSettingsSection';
import BasicInfoSection from './BasicInfoSection';
import DeliveryAvailabilitySection from './DeliveryAvailabilitySection';
import InventoryManagementSection from './InventoryManagementSection';
import MediaBrandingSection from './MediaBrandingSection';
import PricingTaxSection from './PricingTaxSection';
import SupplierDetailsSection from './SupplierDetailsSection';
import type { InventoryProductFormValues } from './types';
import { useTranslation } from '@duncit/shell';

type Translate = ReturnType<typeof useTranslation>['t'];

/** Section headings are copy, so the list is built from the active catalogue. */
const buildSections = (t: Translate) => [
  { id: 'basic', label: t('products.sections.basicInfo') },
  { id: 'pricing', label: t('products.sections.pricingTax') },
  { id: 'inventory', label: t('products.sections.inventoryManagement') },
  { id: 'supplier', label: t('products.sections.supplierDetails') },
  { id: 'delivery', label: t('products.sections.deliveryAvailability') },
  { id: 'media', label: t('products.sections.mediaBranding') },
  { id: 'advanced', label: t('products.sections.advancedSettings') },
  { id: 'activity', label: t('products.sections.activityAnalytics') },
];

/** Supplier details is Duncit procurement metadata — a brand-owned product is
 * supplied by the brand itself, so the section does not apply there. */
const isNotSupplier = (sec: { id: string }) => sec.id !== 'supplier';

interface ProductAccordionProps {
  isNew: boolean;
  categories: { id: string; name: string }[];
  logs: any[];
  movements: any[];
  analytics: any[];
  activityLoading: boolean;
  onError: (msg: string) => void;
}

export default function ProductAccordion({
  isNew,
  categories,
  logs,
  movements,
  analytics,
  activityLoading,
  onError,
}: Readonly<ProductAccordionProps>) {
  const { t } = useTranslation();
  const allSections = useMemo(() => buildSections(t), [t]);
  const [expanded, setExpanded] = useState<string>('basic');
  const { control } = useFormContext<InventoryProductFormValues>();
  const ownership = useWatch({ control, name: 'ownership' });
  const sections = ownership === 'BRAND' ? allSections.filter(isNotSupplier) : allSections;
  return (
    <>
      {sections.map((sec) => (
        <Accordion
          key={sec.id}
          expanded={expanded === sec.id}
          onChange={(_, v) => setExpanded(v ? sec.id : '')}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight={600}>{sec.label}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {sec.id === 'basic' && <BasicInfoSection categories={categories} />}
            {sec.id === 'pricing' && <PricingTaxSection />}
            {sec.id === 'inventory' && <InventoryManagementSection />}
            {sec.id === 'supplier' && <SupplierDetailsSection />}
            {sec.id === 'delivery' && <DeliveryAvailabilitySection />}
            {sec.id === 'media' && <MediaBrandingSection onError={onError} />}
            {sec.id === 'advanced' && <AdvancedSettingsSection onError={onError} />}
            {sec.id === 'activity' && (
              <ActivityLogsSection
                logs={logs}
                movements={movements}
                analytics={analytics}
                loading={activityLoading}
                isNew={isNew}
              />
            )}
          </AccordionDetails>
        </Accordion>
      ))}
    </>
  );
}
