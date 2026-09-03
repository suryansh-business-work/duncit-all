import { JSX, useState } from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Stack, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import { DuncitButton } from '@duncit/buttons';
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
import { useTranslation } from './i18n/useTranslation';
import type { Translate } from './i18n/useTranslation';

type SectionId = 'basic' | 'when' | 'meeting' | 'about' | 'offers' | 'perks' | 'products' | 'payment';
interface SectionDef {
  id: SectionId;
  label: string;
  render: () => JSX.Element;
}

/** Where and when the pod happens — absent in Auto Pod mode, where the venue
 * that enrols brings the slot (and so the date) with it. */
function whereSection(isVirtual: boolean, t: Translate): SectionDef {
  if (isVirtual) {
    return { id: 'meeting', label: t('podForm.podSections.meetingDetails'), render: () => <MeetingSection /> };
  }
  return { id: 'when', label: t('podForm.podSections.whenWhereAndMap'), render: () => <WhenWhereSection /> };
}

/**
 * An Auto Pod has no "where" section at all: a venue brings the slot to a
 * physical one, and the host brings the meeting link and window to a virtual
 * one when they assign themselves.
 */
function buildSections(isVirtual: boolean, showProducts: boolean, autoPod: boolean, t: Translate): SectionDef[] {
  const list: SectionDef[] = [
    { id: 'basic', label: t('podForm.podSections.basicInformation'), render: () => <BasicSection /> },
  ];
  if (!autoPod) list.push(whereSection(isVirtual, t));
  list.push(
    { id: 'about', label: t('podForm.podSections.aboutThisPod'), render: () => <AboutSection /> },
    { id: 'offers', label: t('podForm.podSections.whatThisPodOffers'), render: () => <OffersSection /> },
    { id: 'perks', label: t('podForm.podSections.availablePerks'), render: () => <PerksSection /> },
  );
  // Products match the pod's category — its club's, or the one an Auto Pod
  // carries itself — and a virtual pod has nowhere to hand them out.
  if (showProducts && !isVirtual) {
    list.push({ id: 'products', label: t('podForm.podSections.approvedProducts'), render: () => <ProductsSection /> });
  }
  // An Auto Pod's template carries no economics — the host prices it at
  // assignment — and the rest of this section (place charges, the
  // venue-priced projection) needs a venue.
  if (!autoPod) {
    list.push({ id: 'payment', label: t('podForm.podSections.paymentAndCharges'), render: () => <PaymentSection /> });
  }
  return list;
}

export default function PodSections() {
  const { t } = useTranslation();
  const { config, onPickImage, onPickVideo } = usePodFormData();
  const { control, formState: { errors } } = useFormContext<PodFormValues>();
  const podMode = useWatch({ control, name: 'pod_mode' });
  const isVirtual = podMode === 'VIRTUAL';
  const sections = buildSections(isVirtual, config.showProducts, !!config.autoPod, t).map((section, index) => ({
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
    <Stack spacing={2}>
      <Stack
        direction="row"
        spacing={1}
        sx={{
          justifyContent: "flex-end"
        }}>
        <DuncitButton size="small" startIcon={<UnfoldMoreIcon />} onClick={expandAll} disabled={allOpen} aria-label={t('podForm.podSections.expandAllSections')}>
          {t('podForm.podSections.expandAll')}
        </DuncitButton>
        <DuncitButton size="small" startIcon={<UnfoldLessIcon />} onClick={collapseAll} disabled={expanded.size === 0} aria-label={t('podForm.podSections.collapseAllSections')}>
          {t('podForm.podSections.collapseAll')}
        </DuncitButton>
      </Stack>
      <Controller
        control={control}
        name="media_text"
        render={({ field }) => (
          <MediaField
            label={t('podForm.podSections.imagesAndVideos')}
            value={field.value}
            onChange={field.onChange}
            onPickImage={onPickImage}
            required
            error={errors.media_text?.message}
            helperText={t('podForm.podSections.coverImageFirstRestBecomeA')}
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
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1.5,
              overflow: 'hidden',
              boxShadow: 'none',
            }}
          >
            {/* The products section used to carry an "Enable" switch that both
                gated this accordion and drove `products_enabled`. Attaching a
                product IS enabling them now, so the switch is gone and the flag
                is derived in buildPodInput — this section opens like any other. */}
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1" sx={{
                fontWeight: 600
              }}>{section.title}</Typography>
            </AccordionSummary>
            <AccordionDetails>{section.render()}</AccordionDetails>
          </Accordion>
        );
      })}
    </Stack>
  );
}
