import { Stack } from '@mui/material';
import CardGiftcardOutlinedIcon from '@mui/icons-material/CardGiftcardOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlined';
import type { Control } from 'react-hook-form';
import RhfTextField from '../../components/RhfTextField';
import { useTranslation } from '../../../i18n/useTranslation';
import DobYearField from '../DobYearField';
import { startIcon } from '../fieldProps';
import type { RegisterFormValues } from '../register.types';

interface Props {
  control: Control<RegisterFormValues>;
  /** Admin-configured minimum joining age (Admin > Settings). */
  minAge: number;
}

/**
 * Step one — who you are: name, birth year, and a friend's code.
 *
 * The referral code sits here rather than at the end because this is the step
 * a shared link lands on with the code already filled in; asking for it three
 * screens later would mean showing somebody a box that is already answered.
 */
export default function WhoStep({ control, minAge }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Stack spacing={1.5}>
      <RhfTextField
        control={control}
        name="name"
        label={t('mweb.signup.nameLabel')}
        required
        autoFocus
        placeholder={t('mweb.signup.namePlaceholder')}
        autoComplete="name"
        size="small"
        slotProps={{
          inputLabel: { shrink: true },
          input: startIcon(<PersonOutlineIcon fontSize="small" />),
        }}
      />
      <DobYearField control={control} minAge={minAge} />
      <RhfTextField
        control={control}
        name="referralCode"
        label={t('mweb.signup.referralLabel')}
        hint={t('mweb.signup.referralHint')}
        placeholder={t('mweb.referral.codePlaceholder')}
        size="small"
        slotProps={{
          inputLabel: { shrink: true },
          input: startIcon(<CardGiftcardOutlinedIcon fontSize="small" />),
          htmlInput: { style: { textTransform: 'uppercase' } },
        }}
      />
    </Stack>
  );
}
