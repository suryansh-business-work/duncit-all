import { useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Autocomplete,
  Box,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import { DuncitButton } from '@duncit/buttons';
import { useFormContext, useWatch } from 'react-hook-form';
import DateField from '../DateField';
import HostBankAccountSection from './HostBankAccountSection';
import HostIdentitySection from './HostIdentitySection';
import HostVerificationSection from './HostVerificationSection';
import { useHostFieldProps } from './useHostFieldProps';
import { getHostDobMaxDate, getHostDobMinDate } from '../../utils/hostDob';
import type { HostCreateValues, HostEditValues } from '../../forms/host.form';
import { useTranslation } from '@duncit/app-settings';

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
export default function HostAccordionForm({ mode, userOptions }: Readonly<Props>) {
  const { t } = useTranslation();
  const { control, setValue, getValues } = useFormContext<Values>();
  const { hasError, errorMessage, tfProps } = useHostFieldProps();
  const targetUserId = useWatch({ control, name: 'target_user_id' });
  const dob = useWatch({ control, name: 'step1.dob' });

  const [expanded, setExpanded] = useState<Set<PanelKey>>(new Set(['personal']));
  const allExpanded = useMemo(() => ALL_PANELS.every((p) => expanded.has(p)), [expanded]);

  const toggle = (panel: PanelKey) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(panel)) {
        next.delete(panel);
      } else {
        next.add(panel);
      }
      return next;
    });
  const expandAll = () => setExpanded(new Set(ALL_PANELS));
  const collapseAll = () => setExpanded(new Set());

  const opts = { shouldValidate: true, shouldDirty: true } as const;
  const handlePickUser = (next: UserOption | null) => {
    setValue('target_user_id', next?.user_id ?? '', opts);
    if (next) {
      const current = getValues('step1');
      setValue('step1.full_name', next.full_name ?? current.full_name, opts);
      setValue('step1.email', next.email ?? current.email, opts);
      setValue('step1.phone', next.phone_number ?? current.phone, opts);
    }
  };

  const selectedUser =
    mode === 'create' && userOptions
      ? userOptions.find((u) => u.user_id === targetUserId) ?? null
      : null;

  const targetUserHelper = hasError('target_user_id')
    ? errorMessage('target_user_id')
    : 'Personal details auto-fill from this user.';

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" sx={{
        justifyContent: "flex-end"
      }}>
        <DuncitButton
          size="small"
          startIcon={allExpanded ? <UnfoldLessIcon /> : <UnfoldMoreIcon />}
          onClick={allExpanded ? collapseAll : expandAll}
        >
          {allExpanded ? 'Collapse all' : 'Expand all'}
        </DuncitButton>
      </Stack>

      <Accordion expanded={expanded.has('personal')} onChange={() => toggle('personal')} disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">{t('onboarding.hostForm.personal')}</Typography>
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
                    label={t('onboarding.hostForm.linkToExistingUser')}
                    size="small"
                    required
                    error={hasError('target_user_id')}
                    helperText={targetUserHelper}
                  />
                )}
              />
            )}
            <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
              <TextField label={t('onboarding.common.fullName')} required {...tfProps('step1.full_name')} />
              <TextField label={t('shell.common.email')} type="email" required {...tfProps('step1.email')} />
              <TextField label={t('shell.common.phone')} required {...tfProps('step1.phone', '6–15 digits, optional + prefix')} />
              <DateField
                size="small"
                label="DOB"
                value={dob ?? ''}
                onChange={(iso) => setValue('step1.dob', iso, opts)}
                error={hasError('step1.dob')}
                helperText={hasError('step1.dob') ? errorMessage('step1.dob') : ' '}
                minDate={getHostDobMinDate()}
                maxDate={getHostDobMaxDate()}
              />
            </Box>
          </Stack>
        </AccordionDetails>
      </Accordion>

      <Accordion expanded={expanded.has('identity')} onChange={() => toggle('identity')} disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">{t('onboarding.common.identity')}</Typography>
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
          <Typography variant="subtitle1">{t('shell.nav.verification')}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1.5}>
            <HostVerificationSection />
          </Stack>
        </AccordionDetails>
      </Accordion>

      <Accordion expanded={expanded.has('bank')} onChange={() => toggle('bank')} disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">{t('onboarding.common.bankAccountVerification')}</Typography>
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
