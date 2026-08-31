import { useMemo, useState } from 'react';
import { useForm , type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, InputAdornment, Stack } from '@mui/material';
import PinOutlinedIcon from '@mui/icons-material/PinOutlined';
import { DuncitButton } from '@duncit/buttons';
import RhfTextField from '../components/RhfTextField';
import {
  deleteAccountDefaults,
  makeDeleteAccountSchema,
  type DeleteAccountValues,
} from './delete-account.types';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (values: DeleteAccountValues) => Promise<void> | void;
}

/** Confirms the emailed code and sends the deletion request. */
export function DeleteAccountForm({ loading, errorMessage, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const schema = useMemo(() => makeDeleteAccountSchema(t), [t]);
  const { control, handleSubmit } = useForm<DeleteAccountValues, any, DeleteAccountValues>({
    defaultValues: deleteAccountDefaults,
    resolver: zodResolver(schema) as unknown as Resolver<DeleteAccountValues, any, DeleteAccountValues>,
    mode: 'onTouched',
  });

  const submit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await onSubmit(values);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : t('mweb.common.somethingWentWrong'));
    }
  });

  return (
    <form noValidate onSubmit={submit}>
      <Stack spacing={1.5}>
        <RhfTextField
          control={control}
          name="otp"
          label={t('mweb.account.deletion.otpLabel')}
          required
          hint={t('mweb.account.deletion.otpHint')}
          placeholder={t('mweb.account.deletion.otpPlaceholder')}
          digitsOnly
          slotProps={{ input: {
            startAdornment: (
              <InputAdornment position="start">
                <PinOutlinedIcon fontSize="small" />
              </InputAdornment>
            ),
          }, htmlInput: { inputMode: 'numeric', maxLength: 6 } }}
          size="small"
          
        />
        <RhfTextField
          control={control}
          name="reason"
          label={t('mweb.account.deletion.reasonLabel')}
          hint={t('mweb.account.deletion.reasonHint')}
          placeholder={t('mweb.account.deletion.reasonPlaceholder')}
          multiline
          minRows={2}
          size="small"
        />
        <DuncitButton
          type="submit"
          variant="contained"
          color="error"
          size="large"
          disabled={loading}
          data-testid="delete-account-submit"
          sx={{ borderRadius: '16px', py: 1.1, fontWeight: 700, textTransform: 'none' }}
        >
          {loading ? t('mweb.account.deletion.submitting') : t('mweb.account.deletion.submit')}
        </DuncitButton>
        {(submitError || errorMessage) && (
          <Alert severity="error">{submitError || errorMessage}</Alert>
        )}
      </Stack>
    </form>
  );
}
