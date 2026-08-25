import { useState } from 'react';
import { Box, Checkbox, FormControlLabel, FormHelperText, Typography } from '@mui/material';
import { requiredLabel } from '../../forms/components/requiredLabel';
import { useTranslation } from '../../i18n/useTranslation';
import type { Translate } from '../../i18n/fallback';
import PolicyAcceptanceDialog from './PolicyAcceptanceDialog';
import { isEveryPolicyAccepted } from './acceptance';
import type { SignupPolicy } from './useSignupPolicies';

interface Props {
  accepted: readonly string[];
  onChange: (ids: string[]) => void;
  /** The Zod message, once the form has been submitted without the gate passing. */
  error?: string;
  policies: readonly SignupPolicy[];
  loading: boolean;
  failed: boolean;
}

/*
  Guard clauses rather than a ternary chain (rule 26b): the Zod message wins once
  it exists, and until then the hint explains why the signup button is dead.
*/
function helperFor(
  t: Translate,
  error: string | undefined,
  complete: boolean,
): string | undefined {
  if (error) return error;
  if (complete) return undefined;
  return t('policyAcceptance.mustAcceptHint');
}

/**
 * The one checkbox on the signup form.
 *
 * Ticking it opens the dialog instead of setting a boolean — the tick is a
 * statement about every policy, so it is only ever recorded by accepting them.
 * Unticking clears the lot, because half a retraction is not one.
 */
export default function PolicyAcceptanceField({
  accepted,
  onChange,
  error,
  policies,
  loading,
  failed,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const complete = policies.length > 0 && isEveryPolicyAccepted(policies, accepted);
  const helper = helperFor(t, error, complete);

  // Legal can narrow the gate to nothing, and a checkbox that opens an empty
  // list is a dead end. The Zod rule follows the same list, so nothing is lost.
  if (!loading && !failed && policies.length === 0) return null;

  const handleToggle = (next: boolean) => {
    if (next) {
      setOpen(true);
      return;
    }
    onChange([]);
  };

  const handleClose = (ids: string[]) => {
    onChange(ids);
    setOpen(false);
  };

  return (
    <Box>
      <FormControlLabel
        sx={{ alignItems: 'flex-start', m: 0 }}
        control={
          <Checkbox
            checked={complete}
            onChange={(e) => handleToggle(e.target.checked)}
            sx={{ pt: 0.25 }}
          />
        }
        label={
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              pt: 1
            }}>
            {requiredLabel(t('policyAcceptance.checkboxLabel'), true)}
          </Typography>
        }
      />
      {helper && <FormHelperText error={!!error}>{helper}</FormHelperText>}
      <PolicyAcceptanceDialog
        open={open}
        policies={policies}
        loading={loading}
        failed={failed}
        accepted={accepted}
        onChange={onChange}
        onClose={handleClose}
      />
    </Box>
  );
}
