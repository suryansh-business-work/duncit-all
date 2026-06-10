import { useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ActivityLogsSection from './ActivityLogsSection';
import AdvancedSettingsSection from './AdvancedSettingsSection';
import BasicInfoSection from './BasicInfoSection';
import DeliveryAvailabilitySection from './DeliveryAvailabilitySection';
import InventoryManagementSection from './InventoryManagementSection';
import MediaBrandingSection from './MediaBrandingSection';
import PricingTaxSection from './PricingTaxSection';
import SupplierDetailsSection from './SupplierDetailsSection';

const SECTIONS = [
  { id: 'basic', label: 'Basic info' },
  { id: 'pricing', label: 'Pricing & tax' },
  { id: 'inventory', label: 'Inventory management' },
  { id: 'supplier', label: 'Supplier details' },
  { id: 'delivery', label: 'Delivery & availability' },
  { id: 'media', label: 'Media & branding' },
  { id: 'advanced', label: 'Advanced settings' },
  { id: 'activity', label: 'Activity & analytics' },
];

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
  const [expanded, setExpanded] = useState<string>('basic');
  return (
    <>
      {SECTIONS.map((sec) => (
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
