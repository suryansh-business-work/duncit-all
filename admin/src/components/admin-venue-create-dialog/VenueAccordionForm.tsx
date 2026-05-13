import { useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Autocomplete,
  Box,
  Button,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import VenueDetailsSection from './VenueDetailsSection';
import VenueDocsSection from './VenueDocsSection';
import VenueOwnerSection from './VenueOwnerSection';
import type { DocEntry, Step1, Step3 } from './queries';
import { getVenueError, type VenueValidationErrors } from './venue.form';

export type VenueAccordionMode = 'create' | 'edit';

interface OwnerUser {
  user_id: string;
  full_name?: string | null;
  email?: string | null;
  phone_number?: string | null;
}

interface Props {
  mode: VenueAccordionMode;
  s1: Step1;
  setS1: (next: Step1) => void;
  docs: DocEntry[];
  setDocs: (next: DocEntry[]) => void;
  s2: { gstin: string; pan: string };
  setS2: (next: { gstin: string; pan: string }) => void;
  /** Owner step — for create-on-behalf this can be hidden and admin auto-fills. */
  s3?: Step3;
  setS3?: (next: Step3) => void;
  /** Owner user picker — only shown in create mode. */
  owner?: OwnerUser | null;
  setOwner?: (next: OwnerUser | null) => void;
  ownerOptions?: OwnerUser[];
  locations: any[];
  /** Toggle whether the Owner section is rendered (default true). */
  showOwnerSection?: boolean;
  errors?: VenueValidationErrors;
}

type PanelKey = 'details' | 'documents' | 'owner';

const ALL_PANELS: PanelKey[] = ['details', 'documents', 'owner'];

/**
 * Unified Venue form with accordion sections so Create + Edit share the
 * same layout. Sections: Details / Documents / Owner.
 *
 * In create-on-behalf mode the admin picks an existing owner user, and the
 * Owner details section is auto-filled from that user — admins do not have
 * to retype name/email/phone for the venue owner.
 */
export default function VenueAccordionForm({
  mode,
  s1,
  setS1,
  docs,
  setDocs,
  s2,
  setS2,
  s3,
  setS3,
  owner,
  setOwner,
  ownerOptions,
  locations,
  showOwnerSection = true,
  errors,
}: Props) {
  const [expanded, setExpanded] = useState<Set<PanelKey>>(new Set(['details']));
  const allExpanded = useMemo(
    () => ALL_PANELS.every((p) => expanded.has(p)),
    [expanded],
  );

  const toggle = (panel: PanelKey) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(panel)) next.delete(panel);
      else next.add(panel);
      return next;
    });
  };
  const expandAll = () => setExpanded(new Set(ALL_PANELS));
  const collapseAll = () => setExpanded(new Set());

  // Auto-fill owner details from selected user when admin picks one (create mode).
  const handleOwnerPick = (next: OwnerUser | null) => {
    setOwner?.(next);
    if (next && setS3) {
      setS3({
        owner_name: next.full_name ?? '',
        owner_email: next.email ?? '',
        owner_phone: next.phone_number ?? '',
        owner_dob: s3?.owner_dob ?? '',
        owner_address: s3?.owner_address ?? '',
      });
    }
  };

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" justifyContent="flex-end" spacing={1}>
        <Button
          size="small"
          startIcon={allExpanded ? <UnfoldLessIcon /> : <UnfoldMoreIcon />}
          onClick={allExpanded ? collapseAll : expandAll}
        >
          {allExpanded ? 'Collapse all' : 'Expand all'}
        </Button>
      </Stack>

      <Accordion expanded={expanded.has('details')} onChange={() => toggle('details')} disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">Venue details</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <VenueDetailsSection s1={s1} setS1={setS1} locations={locations} errors={errors} />
        </AccordionDetails>
      </Accordion>

      <Accordion expanded={expanded.has('documents')} onChange={() => toggle('documents')} disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">Documents</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <VenueDocsSection docs={docs} setDocs={setDocs} s2={s2} setS2={setS2} errors={errors} />
        </AccordionDetails>
      </Accordion>

      {showOwnerSection && (
        <Accordion expanded={expanded.has('owner')} onChange={() => toggle('owner')} disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">Owner details</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              {mode === 'create' && ownerOptions && setOwner && (
                <Autocomplete
                  options={ownerOptions}
                  getOptionLabel={(option) =>
                    `${option.full_name ?? ''} · ${option.email ?? option.phone_number ?? ''}`.trim()
                  }
                  value={owner ?? null}
                  isOptionEqualToValue={(a, b) => a.user_id === b.user_id}
                  onChange={(_event, value) => handleOwnerPick(value)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Pick an existing user as owner"
                      size="small"
                      error={!!getVenueError(errors, 'owner_user_id')}
                      helperText={
                        getVenueError(errors, 'owner_user_id') ||
                        "Admin auto-fills the owner from the selected user — you don't need to retype these details."
                      }
                    />
                  )}
                />
              )}
              {s3 && setS3 ? (
                <VenueOwnerSection s3={s3} setS3={setS3} errors={errors} />
              ) : (
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Owner details are managed by the admin and saved automatically.
                  </Typography>
                </Box>
              )}
            </Stack>
          </AccordionDetails>
        </Accordion>
      )}
    </Stack>
  );
}
