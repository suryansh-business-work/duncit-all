import { Divider, FormHelperText, Stack } from '@mui/material';
import BulletListField from './BulletListField';
import FaqListField from './FaqListField';
import type { ClubForm } from '../queries';
import type { ClubErrors } from './clubValidation';

interface Props {
  form: ClubForm;
  setForm: (f: ClubForm | ((prev: ClubForm) => ClubForm)) => void;
  errors?: ClubErrors;
}

/** Club Detail page content authored by admins (shown as bullets / FAQs). */
export default function ClubContentSection({ form, setForm, errors }: Readonly<Props>) {
  return (
    <Stack spacing={2.5}>
      <div>
        <BulletListField
          label="Who We Are"
          helperText="Short intro lines about the club's identity — add at least one."
          value={form.who_we_are}
          onChange={(value) => setForm((prev) => ({ ...prev, who_we_are: value }))}
        />
        {errors?.who_we_are && <FormHelperText error>{errors.who_we_are}</FormHelperText>}
      </div>
      <Divider />
      <div>
        <BulletListField
          label="What We Do"
          helperText="The activities/experiences the club runs — add at least one."
          value={form.what_we_do}
          onChange={(value) => setForm((prev) => ({ ...prev, what_we_do: value }))}
        />
        {errors?.what_we_do && <FormHelperText error>{errors.what_we_do}</FormHelperText>}
      </div>
      <Divider />
      <div>
        <BulletListField
          label="Perks"
          helperText="Benefits members get — add at least one."
          value={form.perks}
          onChange={(value) => setForm((prev) => ({ ...prev, perks: value }))}
        />
        {errors?.perks && <FormHelperText error>{errors.perks}</FormHelperText>}
      </div>
      <Divider />
      <div>
        <BulletListField
          label="Values"
          helperText="What the club stands for — add at least one."
          value={form.values}
          onChange={(value) => setForm((prev) => ({ ...prev, values: value }))}
        />
        {errors?.values && <FormHelperText error>{errors.values}</FormHelperText>}
      </div>
      <Divider />
      <FaqListField
        value={form.faqs}
        onChange={(value) => setForm((prev) => ({ ...prev, faqs: value }))}
      />
    </Stack>
  );
}
