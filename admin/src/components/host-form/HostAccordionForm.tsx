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
import { useFormikContext, getIn } from 'formik';
import DateField from '../DateField';
import HostBankAccountSection from './HostBankAccountSection';
import HostIdentitySection from './HostIdentitySection';
import HostVerificationSection from './HostVerificationSection';
import { getHostDobMaxDate, getHostDobMinDate } from '../../utils/hostDob';
import type { HostCreateValues, HostEditValues } from '../../forms/host.form';

export type HostAccordionMode = 'create' | 'edit';

interface UserOption {
  user_id: string;
  full_name?: string | null;
  email?: string | null;
  phone_number?: string | null;
}

interface Props {
  mode: HostAccordionMode;
  userOptions?: UserOption[];
}

type PanelKey = 'personal' | 'identity' | 'verification' | 'bank';
const ALL_PANELS: PanelKey[] = ['personal', 'identity', 'verification', 'bank'];

type Values = HostCreateValues & Partial<HostEditValues>;

/**
 * Unified Host form with accordion sections so Create + Edit share the same
 * layout. Sections: Personal / Identity / Verification.
 *
 * In create-on-behalf mode the admin picks an existing user and the personal
 * details auto-fill from that user's profile.
 */
export default function HostAccordionForm({ mode, userOptions }: Props) {
  const formik = useFormikContext<Values>();
  const { values, errors, touched, submitCount, handleBlur, handleChange, setFieldValue } = formik;

  const [expanded, setExpanded] = useState<Set<PanelKey>>(new Set(['personal']));
  const allExpanded = useMemo(() => ALL_PANELS.every((p) => expanded.has(p)), [expanded]);

  const toggle = (panel: PanelKey) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(panel)) next.delete(panel);
      else next.add(panel);
      return next;
    });
  const expandAll = () => setExpanded(new Set(ALL_PANELS));
  const collapseAll = () => setExpanded(new Set());

  const hasError = (name: string) => {
    const value = getIn(values, name);
    const hasValue = Array.isArray(value) ? value.length > 0 : String(value ?? '').length > 0;
    return Boolean(
      getIn(errors, name) && (submitCount > 0 || getIn(touched, name) || hasValue),
    );
  };

  const tfProps = (name: string) => ({
    name,
    value: getIn(values, name) ?? '',
    onChange: handleChange,
    onBlur: handleBlur,
    error: hasError(name),
    helperText: hasError(name) ? (getIn(errors, name) as string) : ' ',
    fullWidth: true,
    size: 'small' as const,
  });

  const handlePickUser = (next: UserOption | null) => {
    setFieldValue('target_user_id', next?.user_id ?? '');
    if (next) {
      setFieldValue('step1.full_name', next.full_name ?? values.step1.full_name);
      setFieldValue('step1.email', next.email ?? values.step1.email);
      setFieldValue('step1.phone', next.phone_number ?? values.step1.phone);
    }
  };

  const selectedUser =
    mode === 'create' && userOptions
      ? userOptions.find((u) => u.user_id === values.target_user_id) ?? null
      : null;

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" justifyContent="flex-end">
        <Button
          size="small"
          startIcon={allExpanded ? <UnfoldLessIcon /> : <UnfoldMoreIcon />}
          onClick={allExpanded ? collapseAll : expandAll}
        >
          {allExpanded ? 'Collapse all' : 'Expand all'}
        </Button>
      </Stack>

      <Accordion expanded={expanded.has('personal')} onChange={() => toggle('personal')} disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">Personal</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1.5}>
            {mode === 'create' && userOptions && (
              <Autocomplete
                options={userOptions}
                getOptionLabel={(option) =>
                  `${option.full_name ?? ''} · ${option.email ?? option.phone_number ?? ''}`.trim()
                }
                value={selectedUser}
                isOptionEqualToValue={(a, b) => a.user_id === b.user_id}
                onChange={(_event, value) => handlePickUser(value)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Link to existing user"
                    size="small"
                    required
                    error={hasError('target_user_id')}
                    helperText={
                      hasError('target_user_id')
                        ? (errors.target_user_id as string)
                        : 'Personal details auto-fill from this user.'
                    }
                  />
                )}
              />
            )}
            <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
              <TextField label="Full name" required {...tfProps('step1.full_name')} />
              <TextField label="Email" type="email" required {...tfProps('step1.email')} />
              <TextField label="Phone" required {...tfProps('step1.phone')} />
              <DateField
                size="small"
                label="DOB"
                value={values.step1.dob}
                onChange={(iso) => setFieldValue('step1.dob', iso)}
                error={hasError('step1.dob')}
                helperText={hasError('step1.dob') ? (getIn(errors, 'step1.dob') as string) : ' '}
                minDate={getHostDobMinDate()}
                maxDate={getHostDobMaxDate()}
              />
            </Box>
          </Stack>
        </AccordionDetails>
      </Accordion>

      <Accordion expanded={expanded.has('identity')} onChange={() => toggle('identity')} disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">Identity</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1.5}>
            <HostIdentitySection />
          </Stack>
        </AccordionDetails>
      </Accordion>

      <Accordion
        expanded={expanded.has('verification')}
        onChange={() => toggle('verification')}
        disableGutters
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">Verification</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1.5}>
            <HostVerificationSection />
          </Stack>
        </AccordionDetails>
      </Accordion>

      <Accordion expanded={expanded.has('bank')} onChange={() => toggle('bank')} disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">Bank Account Verification</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1.5}>
            <HostBankAccountSection />
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Stack>
  );
}
