import { useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { usePodFormData } from './context';
import MediaField from './components/MediaField';
import ReelField from './components/ReelField';
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
  const { config, onPickImage, onPickVideo } = usePodFormData();
  const { control, formState: { errors } } = useFormContext<PodFormValues>();
  const podMode = useWatch({ control, name: 'pod_mode' });
  const isVirtual = podMode === 'VIRTUAL';
  const sections = buildSections(isVirtual, config.showProducts).map((section, index) => ({
    ...section,
    title: `${index + 1}. ${section.label}`,
  }));

  const [expanded, setExpanded] = useState<Set<string>>(new Set(['basic']));
  const allOpen = sections.length > 0 && sections.every((section) => expanded.has(section.id));

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
            required
            error={errors.media_text?.message}
            helperText="Cover image first; rest become a gallery."
          />
        )}
      />
      {config.showReel && (
        <Controller
          control={control}
          name="reel_url"
          render={({ field }) => (
            <ReelField
              value={field.value}
              onChange={field.onChange}
              onPickVideo={onPickVideo}
              error={errors.reel_url?.message}
            />
          )}
        />
      )}
      {sections.map((section) => {
        return (
          <Accordion
            key={section.id}
            expanded={expanded.has(section.id)}
            onChange={(_, open) => toggleOne(section.id, open)}
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
            {/* The products section used to carry an "Enable" switch that both
                gated this accordion and drove `products_enabled`. Attaching a
                product IS enabling them now, so the switch is gone and the flag
                is derived in buildPodInput — this section opens like any other. */}
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1" fontWeight={600}>{section.title}</Typography>
            </AccordionSummary>
            <AccordionDetails>{section.render()}</AccordionDetails>
          </Accordion>
        );
      })}
    </>
  );
}
