import { useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  FormControlLabel,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { usePodFormData } from './context';
import MediaField from './components/MediaField';
import BasicSection from './sections/BasicSection';
import WhenWhereSection from './sections/WhenWhereSection';
import MeetingSection from './sections/MeetingSection';
import AboutSection from './sections/AboutSection';
import OffersSection from './sections/OffersSection';
import PerksSection from './sections/PerksSection';
import ProductsSection from './sections/ProductsSection';
import PaymentSection from './sections/PaymentSection';
import type { PodFormValues } from './types';

type SectionId = 'basic' | 'when' | 'meeting' | 'about' | 'offers' | 'perks' | 'products' | 'payment';
interface SectionDef {
  id: SectionId;
  label: string;
  render: () => JSX.Element;
}

function buildSections(isVirtual: boolean, showProducts: boolean): SectionDef[] {
  const list: SectionDef[] = [
    { id: 'basic', label: 'Basic Information', render: () => <BasicSection /> },
    isVirtual
      ? { id: 'meeting', label: 'Meeting Details', render: () => <MeetingSection /> }
      : { id: 'when', label: 'When, Where & Map', render: () => <WhenWhereSection /> },
    { id: 'about', label: 'About this Pod', render: () => <AboutSection /> },
    { id: 'offers', label: 'What This Pod Offers', render: () => <OffersSection /> },
    { id: 'perks', label: 'Available Perks', render: () => <PerksSection /> },
  ];
  if (showProducts && !isVirtual) {
    list.push({ id: 'products', label: 'Approved Products', render: () => <ProductsSection /> });
  }
  list.push({ id: 'payment', label: 'Payment & Charges', render: () => <PaymentSection /> });
  return list;
}

export default function PodSections() {
  const { config, onPickImage } = usePodFormData();
  const { control, setValue, formState: { errors } } = useFormContext<PodFormValues>();
  const podMode = useWatch({ control, name: 'pod_mode' });
  const productsEnabled = useWatch({ control, name: 'products_enabled' });
  const isVirtual = podMode === 'VIRTUAL';
  const sections = buildSections(isVirtual, config.showProducts).map((section, index) => ({
    ...section,
    title: `${index + 1}. ${section.label}`,
  }));

  const [expanded, setExpanded] = useState<Set<string>>(new Set(['basic']));
  const expandable = sections.filter((section) => section.id !== 'products' || productsEnabled);
  const allOpen = expandable.length > 0 && expandable.every((section) => expanded.has(section.id));

  const toggleOne = (id: string, open: boolean) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  const expandAll = () => setExpanded(new Set(sections.map((section) => section.id)));
  const collapseAll = () => setExpanded(new Set());

  return (
    <>
      <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mb: 1 }}>
        <Button size="small" startIcon={<UnfoldMoreIcon />} onClick={expandAll} disabled={allOpen} aria-label="Expand all sections">
          Expand all
        </Button>
        <Button size="small" startIcon={<UnfoldLessIcon />} onClick={collapseAll} disabled={expanded.size === 0} aria-label="Collapse all sections">
          Collapse all
        </Button>
      </Stack>
      <Controller
        control={control}
        name="media_text"
        render={({ field }) => (
          <MediaField
            label="Images & videos"
            value={field.value}
            onChange={field.onChange}
            onPickImage={onPickImage}
            error={errors.media_text?.message}
            helperText="Cover image first; rest become a gallery."
          />
        )}
      />
      {sections.map((section) => {
        const isProducts = section.id === 'products';
        return (
          <Accordion
            key={section.id}
            expanded={isProducts ? productsEnabled && expanded.has(section.id) : expanded.has(section.id)}
            onChange={(_, open) => {
              if (isProducts && !productsEnabled) return;
              toggleOne(section.id, open);
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
                <Typography variant="subtitle1" fontWeight={600}>{section.title}</Typography>
                {isProducts && (
                  <FormControlLabel
                    onClick={(event) => event.stopPropagation()}
                    onFocus={(event) => event.stopPropagation()}
                    control={
                      <Switch
                        checked={productsEnabled}
                        onChange={(event) => {
                          setValue('products_enabled', event.target.checked);
                          toggleOne('products', event.target.checked);
                        }}
                      />
                    }
                    label="Enable"
                  />
                )}
              </Stack>
            </AccordionSummary>
            <AccordionDetails>{(!isProducts || productsEnabled) && section.render()}</AccordionDetails>
          </Accordion>
        );
      })}
    </>
  );
}
