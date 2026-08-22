import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@apollo/client';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CircularProgress,
  InputAdornment,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AlternateEmailIcon from '@mui/icons-material/AlternateEmail';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import {
  buildUsernameLabels,
  canSaveUsername,
  isUsernameError,
  normalizeUsername,
  profileUrl,
  usernameStatus,
} from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { logs } from '@duncit/logs';
import { notifySuccess } from '../../../components/notify';
import { SET_MY_USERNAME } from './queries';
import { useUsernameCheck } from './useUsernameCheck';
import { usernameFormSchema, type UsernameFormValues } from './username.types';

interface Props {
  /** The handle the account has now, or null for one that predates handles. */
  current: string | null;
  /** Refetch the account after a successful save. */
  onSaved: () => void;
}

/**
 * Profile Settings → Username.
 *
 * The handle is what `/u/<username>` carries, so the field shows the link it
 * produces rather than describing it — that link is the only reason anybody
 * opens this section, and it is what they came to copy.
 */
export default function UsernameForm({ current, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = buildUsernameLabels(t);
  const [saveFailed, setSaveFailed] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);

  const { register, watch, handleSubmit, reset } = useForm<UsernameFormValues>({
    resolver: zodResolver(usernameFormSchema),
    mode: 'onChange',
    defaultValues: { username: current ?? '' },
  });

  const typed = normalizeUsername(watch('username'));
  const check = useUsernameCheck(typed, current);
  const status = usernameStatus({
    value: typed,
    current,
    checking: check.checking,
    available: check.available,
    reason: check.reason,
  });

  const [save, { loading: saving }] = useMutation(SET_MY_USERNAME);

  const onSubmit = async (values: UsernameFormValues) => {
    setSaveFailed(false);
    try {
      await save({ variables: { username: values.username } });
      reset({ username: values.username });
      setSavedOpen(true);
      onSaved();
    } catch (error) {
      // The server re-checks, so this is the race actually happening — somebody
      // took the handle between the check and the save.
      setSaveFailed(true);
      logs.mWeb.error('UsernameForm', 'setMyUsername', { error });
    }
  };

  // The link previews the handle being typed once it is usable, and otherwise
  // the one that works today. Hoisted so the branch sits at nesting zero.
  const linkHandle = canSaveUsername(status) ? typed : current;
  const link = linkHandle ? profileUrl(globalThis.window.location.origin, linkHandle) : '';
  const statusLine = labels.status(status, typed);
  const errored = isUsernameError(status);

  return (
    <Card variant="outlined" sx={{ borderRadius: '16px' }}>
      <CardContent>
        <Stack spacing={1.5} component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Stack spacing={0.25}>
            <Typography variant="subtitle1" fontWeight={700}>
              {labels.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {labels.subtitle}
            </Typography>
          </Stack>

          {saveFailed && <Alert severity="error">{labels.saveFailed}</Alert>}

          <TextField
            {...register('username')}
            label={labels.label}
            placeholder={labels.placeholder}
            size="small"
            fullWidth
            error={errored}
            helperText={statusLine || ' '}
            inputProps={{ autoCapitalize: 'none', autoCorrect: 'off', spellCheck: false }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <AlternateEmailIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  {check.checking && <CircularProgress size={16} />}
                  {status === 'AVAILABLE' && (
                    <CheckCircleOutlineIcon fontSize="small" color="success" />
                  )}
                </InputAdornment>
              ),
            }}
          />

          {link && (
            <Stack spacing={0.25}>
              <Typography variant="caption" color="text.secondary">
                {labels.linkLabel}
              </Typography>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="body2" sx={{ flex: 1, minWidth: 0, wordBreak: 'break-all' }}>
                  {link}
                </Typography>
                <Button
                  size="small"
                  startIcon={<ContentCopyIcon fontSize="small" />}
                  onClick={() => {
                    navigator.clipboard
                      .writeText(link)
                      .then(() => notifySuccess(labels.linkCopied))
                      .catch((error) =>
                        logs.mWeb.warn('UsernameForm', 'copyLink', { error }),
                      );
                  }}
                >
                  {labels.copyLink}
                </Button>
              </Stack>
            </Stack>
          )}

          <Button
            type="submit"
            variant="contained"
            disabled={!canSaveUsername(status) || saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ alignSelf: 'flex-start' }}
          >
            {labels.save}
          </Button>
        </Stack>
      </CardContent>

      <Snackbar
        open={savedOpen}
        autoHideDuration={2500}
        onClose={() => setSavedOpen(false)}
        message={labels.saved}
      />
    </Card>
  );
}
