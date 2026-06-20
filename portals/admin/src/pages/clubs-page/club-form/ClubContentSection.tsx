import { Divider, Stack } from '@mui/material';
import BulletListField from './BulletListField';
import FaqListField from './FaqListField';
import type { ClubForm } from '../queries';

interface Props {
  form: ClubForm;
  setForm: (f: ClubForm | ((prev: ClubForm) => ClubForm)) => void;
}

/** Club Detail page content authored by admins (shown as bullets / FAQs). */
export default function ClubContentSection({ form, setForm }: Readonly<Props>) {
  return (
    <Stack spacing={2.5}>
      <BulletListField
        label="Who We Are"
        helperText="Short intro lines about the club's identity."
        value={form.who_we_are}
        onChange={(value) => setForm((prev) => ({ ...prev, who_we_are: value }))}
      />
      <Divider />
      <BulletListField
        label="What We Do"
        helperText="The activities/experiences the club runs."
        value={form.what_we_do}
        onChange={(value) => setForm((prev) => ({ ...prev, what_we_do: value }))}
      />
      <Divider />
      <BulletListField
        label="Perks"
        helperText="Benefits members get."
        value={form.perks}
        onChange={(value) => setForm((prev) => ({ ...prev, perks: value }))}
      />
      <Divider />
      <BulletListField
        label="Values"
        helperText="What the club stands for."
        value={form.values}
        onChange={(value) => setForm((prev) => ({ ...prev, values: value }))}
      />
      <Divider />
      <FaqListField
        value={form.faqs}
        onChange={(value) => setForm((prev) => ({ ...prev, faqs: value }))}
      />
    </Stack>
  );
}
