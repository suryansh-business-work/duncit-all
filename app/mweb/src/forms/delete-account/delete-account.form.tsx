import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, InputAdornment, Stack } from '@mui/material';
import PinOutlinedIcon from '@mui/icons-material/PinOutlined';
import RhfTextField from '../components/RhfTextField';
import {
  deleteAccountDefaults,
  deleteAccountSchema,
  type DeleteAccountValues,
} from './delete-account.types';

interface Props {
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (values: DeleteAccountValues) => Promise<void> | void;
}

/** OTP step that confirms permanent account deletion. */
export function DeleteAccountForm({ loading, errorMessage, onSubmit }: Readonly<Props>) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { control, handleSubmit } = useForm<DeleteAccountValues>({
    defaultValues: deleteAccountDefaults,
    resolver: zodResolver(deleteAccountSchema),
    mode: 'onTouched',
  });

  const submit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await onSubmit(values);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Something went wrong');
    }
  });

  return (
    <form noValidate onSubmit={submit}>
      <Stack spacing={1.5}>
        <RhfTextField
          control={control}
          name="otp"
          label="6-digit OTP"
          required
          hint="6-digit code"
          placeholder="123456"
          inputProps={{ inputMode: 'numeric', maxLength: 6 }}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <PinOutlinedIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <Button
          type="submit"
          variant="contained"
          color="error"
          size="large"
          disabled={loading}
          data-testid="delete-account-submit"
          sx={{ borderRadius: 2, py: 1.1, fontWeight: 700, textTransform: 'none' }}
        >
          {loading ? 'Deleting…' : 'Delete my account'}
        </Button>
        {(submitError || errorMessage) && (
          <Alert severity="error">{submitError || errorMessage}</Alert>
        )}
      </Stack>
    </form>
  );
}
