import { useFormContext, type FieldValues } from 'react-hook-form';
import { Box, Typography } from '@mui/material';
import { RhfSelect, RhfTextField } from '@duncit/forms';
import { HR_CONTACT_LIMITS } from '@duncit/forms/schemas';
import { useTranslation } from '@duncit/shell';
import { HR_EMPLOYEE_LIMITS as L, HR_GENDERS, HR_GENDER_KEYS, hrOptions } from '@duncit/utils';
import DayField from './DayField';

const grid = { display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } };
const phoneGrid = { display: 'grid', gap: 1, gridTemplateColumns: '96px 1fr' };

/** Name, gender, birth date, contact details and emergency contact. `prefix` is the group path ('personal.' or ''). */
export default function PersonalFields({ prefix = '' }: Readonly<{ prefix?: string }>) {
  const { t } = useTranslation();
  const { control } = useFormContext<FieldValues>();
  const n = (field: string) => `${prefix}${field}`;
  const genders = [{ value: '', label: t('hrEmployee.profile.notSet') }, ...hrOptions(HR_GENDERS, HR_GENDER_KEYS, t)];
  const input = (testId: string, maxLength?: number) => ({ htmlInput: { maxLength, 'data-testid': testId } });

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Box sx={grid}>
        <RhfTextField control={control} name={n('first_name')} label={t('hrEmployee.field.firstName')} required slotProps={input('hr-first-name', L.nameMax)} />
        <RhfTextField control={control} name={n('last_name')} label={t('hrEmployee.field.lastName')} required slotProps={input('hr-last-name', L.nameMax)} />
        <RhfSelect control={control} name={n('gender')} label={t('hrEmployee.field.gender')} options={genders} />
        <DayField name={n('date_of_birth')} label={t('hrEmployee.field.dateOfBirth')} hint={t('hrEmployee.hint.dateOfBirth', { vars: { age: L.minAgeYears } })} maxDate={new Date()} testId="hr-dob" />
        <RhfTextField control={control} name={n('personal_email')} label={t('hrEmployee.field.personalEmail')} type="email" slotProps={input('hr-personal-email')} />
        <Box sx={phoneGrid}>
          <RhfTextField control={control} name={n('phone_extension')} label={t('hrEmployee.field.dialCode')} slotProps={input('hr-phone-ext', 5)} />
          <RhfTextField control={control} name={n('phone_number')} label={t('hrEmployee.field.phone')} type="tel" slotProps={input('hr-phone', 15)} />
        </Box>
        <RhfTextField control={control} name={n('current_address')} label={t('hrEmployee.field.currentAddress')} multiline minRows={2} slotProps={input('hr-current-address', HR_CONTACT_LIMITS.addressMax)} />
        <RhfTextField control={control} name={n('permanent_address')} label={t('hrEmployee.field.permanentAddress')} multiline minRows={2} slotProps={input('hr-permanent-address', HR_CONTACT_LIMITS.addressMax)} />
      </Box>
      <Typography variant="subtitle2" component="h3">{t('hrEmployee.profile.emergencyTitle')}</Typography>
      <Box sx={grid}>
        <RhfTextField control={control} name={n('emergency_name')} label={t('hrEmployee.field.emergencyName')} slotProps={input('hr-emergency-name', HR_CONTACT_LIMITS.nameMax)} />
        <RhfTextField control={control} name={n('emergency_relation')} label={t('hrEmployee.field.emergencyRelation')} slotProps={input('hr-emergency-relation', HR_CONTACT_LIMITS.relationMax)} />
        <Box sx={phoneGrid}>
          <RhfTextField control={control} name={n('emergency_phone_extension')} label={t('hrEmployee.field.dialCode')} slotProps={input('hr-emergency-ext', 5)} />
          <RhfTextField control={control} name={n('emergency_phone_number')} label={t('hrEmployee.field.emergencyPhone')} type="tel" slotProps={input('hr-emergency-phone', 15)} />
        </Box>
      </Box>
    </Box>
  );
}
