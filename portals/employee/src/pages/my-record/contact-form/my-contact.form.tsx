import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, Stack, Typography } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { HR_CONTACT_LIMITS as L, hrContactValuesFrom, makeHrContactSchema } from '@duncit/forms/schemas';
import { useTranslation } from '@duncit/shell';
import type { MyContactFormProps, MyContactFormValues, MyContactOutput } from './my-contact.types';

const grid = { display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } };
const phoneGrid = { display: 'grid', gap: 1, gridTemplateColumns: '96px 1fr' };

/**
 * The contact details an employee keeps up to date themselves — the same
 * rules as the HR console's personal form (`makeHrContactSchema`) and the
 * server. Name, job, pay and bank details change only through HR.
 */
export default function MyContactForm({ personal, readOnly, onSubmit }: Readonly<MyContactFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeHrContactSchema(t), [t]);
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting, isDirty },
  } = useForm<MyContactFormValues, unknown, MyContactOutput>({ resolver: zodResolver(schema), defaultValues: hrContactValuesFrom(personal) });

  useEffect(() => reset(hrContactValuesFrom(personal)), [personal, reset]);
  const input = (testId: string, maxLength?: number) => ({ htmlInput: { maxLength, 'data-testid': testId } });

  return (
    <Stack spacing={2} component="form" noValidate onSubmit={handleSubmit(async (values) => {
        await onSubmit(values);
      })} data-testid="my-contact-form">
      <Box sx={grid}>
        <RhfTextField control={control} name="personal_email" label={t('hrEmployee.field.personalEmail')} type="email" disabled={readOnly} slotProps={input('my-contact-email')} />
        <Box sx={phoneGrid}>
          <RhfTextField control={control} name="phone_extension" label={t('hrEmployee.field.dialCode')} disabled={readOnly} slotProps={input('my-contact-ext', 5)} />
          <RhfTextField control={control} name="phone_number" label={t('hrEmployee.field.phone')} type="tel" disabled={readOnly} slotProps={input('my-contact-phone', 15)} />
        </Box>
        <RhfTextField control={control} name="current_address" label={t('hrEmployee.field.currentAddress')} multiline minRows={2} disabled={readOnly} slotProps={input('my-contact-current', L.addressMax)} />
        <RhfTextField control={control} name="permanent_address" label={t('hrEmployee.field.permanentAddress')} multiline minRows={2} disabled={readOnly} slotProps={input('my-contact-permanent', L.addressMax)} />
      </Box>
      <Typography variant="subtitle2" component="h3">{t('hrEmployee.profile.emergencyTitle')}</Typography>
      <Box sx={grid}>
        <RhfTextField control={control} name="emergency_name" label={t('hrEmployee.field.emergencyName')} disabled={readOnly} slotProps={input('my-contact-emergency-name', L.nameMax)} />
        <RhfTextField control={control} name="emergency_relation" label={t('hrEmployee.field.emergencyRelation')} disabled={readOnly} slotProps={input('my-contact-emergency-relation', L.relationMax)} />
        <Box sx={phoneGrid}>
          <RhfTextField control={control} name="emergency_phone_extension" label={t('hrEmployee.field.dialCode')} disabled={readOnly} slotProps={input('my-contact-emergency-ext', 5)} />
          <RhfTextField control={control} name="emergency_phone_number" label={t('hrEmployee.field.emergencyPhone')} type="tel" disabled={readOnly} slotProps={input('my-contact-emergency-phone', 15)} />
        </Box>
      </Box>
      {!readOnly && (
        <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
          <DuncitButton type="submit" variant="contained" startIcon={<SaveIcon />} disabled={isSubmitting || !isDirty} data-testid="my-contact-save">
            {t('hrEmployee.self.save')}
          </DuncitButton>
        </Stack>
      )}
    </Stack>
  );
}
