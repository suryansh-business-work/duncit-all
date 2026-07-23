import { Divider, Stack } from '@mui/material';
import { useFormContext, useFormState } from 'react-hook-form';
import BulletListField from '../components/BulletListField';
import FaqListField from '../components/FaqListField';
import type { ClubFormValues } from '../types';

/** Club Detail page content authored by admins (bullets + FAQs). */
export default function ContentSection() {
  const { control } = useFormContext<ClubFormValues>();
  const { errors } = useFormState({ control });

  return (
    <Stack spacing={2.5}>
      <BulletListField
        name="who_we_are"
        label="Who We Are"
        required
        helperText="Short intro lines about the club's identity — add at least one."
        error={errors.who_we_are?.message}
      />
      <Divider />
      <BulletListField
        name="what_we_do"
        label="What We Do"
        required
        helperText="The activities/experiences the club runs — add at least one."
        error={errors.what_we_do?.message}
      />
      <Divider />
      <BulletListField
        name="perks"
        label="Perks"
        required
        helperText="Benefits members get — add at least one."
        error={errors.perks?.message}
      />
      <Divider />
      <BulletListField
        name="values"
        label="Values"
        required
        helperText="What the club stands for — add at least one."
        error={errors.values?.message}
      />
      <Divider />
      <FaqListField />
    </Stack>
  );
}
