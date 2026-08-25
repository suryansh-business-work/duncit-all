import { JSX, useEffect, useState } from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Button, Chip, Stack, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import { useFormContext, useFormState } from 'react-hook-form';
import { useClubFormData } from './context';
import BasicSection from './sections/BasicSection';
import MediaSection from './sections/MediaSection';
import LinksSection from './sections/LinksSection';
import ContentSection from './sections/ContentSection';
import AdminsSection from './sections/AdminsSection';
import { SECTION_OF, type ClubFormValues } from './types';
import { useTranslation } from './i18n/useTranslation';
import type { Translate } from './i18n/useTranslation';

interface SectionDef {
  id: string;
  label: string;
  render: () => JSX.Element;
}

function buildSections(showAdmins: boolean, t: Translate): SectionDef[] {
  const list: SectionDef[] = [
    { id: 'basic', label: t('clubForm.clubSections.basicInformation'), render: () => <BasicSection /> },
    { id: 'media', label: t('clubForm.clubSections.mediaAndMoments'), render: () => <MediaSection /> },
    { id: 'links', label: t('clubForm.clubSections.venuesAndCommunityLinks'), render: () => <LinksSection /> },
    { id: 'content', label: t('clubForm.clubSections.pageContentWhoWeArePerks'), render: () => <ContentSection /> },
  ];
  if (showAdmins) list.push({ id: 'admins', label: t('clubForm.common.clubAdmin'), render: () => <AdminsSection /> });
  return list;
}

export default function ClubSections() {
  const { t } = useTranslation();
  const { config } = useClubFormData();
  const { control } = useFormContext<ClubFormValues>();
  const { errors } = useFormState({ control });
  const sections = buildSections(config.showAdmins, t).map((section, index) => ({
    ...section,
    title: `${index + 1}. ${section.label}`,
  }));

  const [expanded, setExpanded] = useState<Set<string>>(new Set(['basic']));
  const errorKeys = Object.keys(errors).join(',');
  const errorCount = (id: string) => Object.keys(errors).filter((key) => SECTION_OF[key] === id).length;

  // Auto-expand every section with a validation error after a failed save.
  useEffect(() => {
    if (!errorKeys) return;
    const withErrors = new Set(errorKeys.split(',').map((key) => SECTION_OF[key]).filter(Boolean));
    if (withErrors.size > 0) setExpanded((prev) => new Set([...prev, ...withErrors]));
  }, [errorKeys]);

  const allOpen = expanded.size === sections.length;
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
      <Stack
        direction="row"
        spacing={1}
        sx={{
          justifyContent: "flex-end",
          mb: 1
        }}>
        <Button size="small" startIcon={<UnfoldMoreIcon />} onClick={expandAll} disabled={allOpen}>
          Expand all
        </Button>
        <Button size="small" startIcon={<UnfoldLessIcon />} onClick={collapseAll} disabled={expanded.size === 0}>
          Collapse all
        </Button>
      </Stack>
      {sections.map((section) => (
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
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" spacing={1} sx={{
              alignItems: "center"
            }}>
              <Typography variant="subtitle1" sx={{
                fontWeight: 600
              }}>{section.title}</Typography>
              {errorCount(section.id) > 0 && (
                <Chip size="small" color="error" label={`${errorCount(section.id)} required`} />
              )}
            </Stack>
          </AccordionSummary>
          <AccordionDetails>{section.render()}</AccordionDetails>
        </Accordion>
      ))}
    </>
  );
}
