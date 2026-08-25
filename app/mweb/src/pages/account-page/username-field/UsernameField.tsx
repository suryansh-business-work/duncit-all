import { useEffect } from 'react';
import { useController, type Control } from 'react-hook-form';
import { CircularProgress, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import AlternateEmailIcon from '@mui/icons-material/AlternateEmail';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import {
  buildUsernameLabels,
  canSaveUsername,
  isUsernameError,
  normalizeUsername,
  profileUrl,
  usernameStatus,
  type UsernameStatus,
} from '@duncit/utils';
import { useUsernameCheck } from './useUsernameCheck';
import type { AccountEditValues } from '../account-edit/account-edit.types';
import { useTranslation } from '../../../i18n/useTranslation';

interface Props {
  /** react-hook-form control from Edit profile's `useForm`. */
  control: Control<AccountEditValues>;
  /** The handle the account has now, or null for one that predates handles. */
  current: string | null;
  /** Hands the decided status back so Save can be gated on it. */
  onStatusChange: (status: UsernameStatus) => void;
}

/**
 * Edit profile → Username.
 *
 * The field sits in the profile form rather than in a card of its own, and it
 * shares that form's Save: a handle that is half-typed, taken or still being
 * checked disables it, so the only handle that can ever reach the server is one
 * the server has just said yes to.
 *
 * Underneath it renders the LINK the handle produces rather than describing it
 * — `/u/<handle>` is the whole reason anybody edits this, and seeing the new
 * address before saving is what makes the warning about old links land.
 */
export default function UsernameField({ control, current, onStatusChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = buildUsernameLabels(t);
  const { field } = useController({ control, name: 'username' });

  const typed = normalizeUsername(field.value);
  const check = useUsernameCheck(typed, current);
  const status = usernameStatus({
    value: typed,
    current,
    checking: check.checking,
    available: check.available,
    reason: check.reason,
  });

  useEffect(() => {
    onStatusChange(status);
  }, [onStatusChange, status]);

  // The link previews the handle being typed once it is usable, and otherwise
  // the one that works today. Hoisted so the branch sits at nesting zero.
  const linkHandle = canSaveUsername(status) ? typed : current;
  const link = linkHandle ? profileUrl(globalThis.window.location.origin, linkHandle) : '';
  const statusLine = labels.status(status, typed);

  return (
    <Stack spacing={0.5}>
      <TextField
        {...field}
        value={field.value ?? ''}
        onChange={(event) => field.onChange(normalizeUsername(event.target.value))}
        label={labels.label}
        placeholder={labels.placeholder}
        size="small"
        fullWidth
        error={isUsernameError(status)}
        helperText={statusLine || labels.hint}
        slotProps={{
          inputLabel: { shrink: true },
          htmlInput: { autoCapitalize: 'none', autoCorrect: 'off', spellCheck: false },
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <AlternateEmailIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                {check.checking && <CircularProgress size={16} />}
                {status === 'AVAILABLE' && (
                  <CheckCircleOutlinedIcon fontSize="small" color="success" />
                )}
              </InputAdornment>
            ),
          },
        }}
      />
      {link && (
        <Stack spacing={0.25} sx={{ px: 0.5 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {labels.linkLabel}
          </Typography>
          <Typography
            variant="body2"
            data-testid="username-link-preview"
            sx={{ fontWeight: 600, wordBreak: 'break-all' }}
          >
            {link}
          </Typography>
        </Stack>
      )}
    </Stack>
  );
}
