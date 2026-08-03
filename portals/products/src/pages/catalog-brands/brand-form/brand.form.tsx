import { useEffect } from 'react';
import { useForm, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, Button, Stack, Typography } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import {
  brandInitialValues,
  brandSchema,
  MAX_PRODUCT_CATEGORIES,
  type BrandFormValues,
} from './brand.types';

export { brandSchema };

interface BrandFieldDef {
  name: keyof BrandFormValues;
  label: string;
  hint?: string;
  multiline?: boolean;
  /** Span both columns of the two-column grid. */
  full?: boolean;
  required?: boolean;
}

interface BrandFieldGroup {
  title: string;
  fields: BrandFieldDef[];
}

/** Every field of the server `EcommBrandInput`, grouped the way the brand was captured. */
const BRAND_FIELD_GROUPS: BrandFieldGroup[] = [
  {
    title: 'Brand',
    fields: [
      { name: 'brand_name', label: 'Brand name', required: true, hint: 'Shown in the marketplace' },
      { name: 'tagline', label: 'Tagline' },
      { name: 'description', label: 'Description', multiline: true, full: true },
      {
        name: 'product_categories',
        label: 'Product categories',
        full: true,
        hint: `Comma separated, up to ${MAX_PRODUCT_CATEGORIES}`,
      },
      { name: 'logo_url', label: 'Logo URL' },
      { name: 'cover_image_url', label: 'Cover image URL' },
      { name: 'website_url', label: 'Website URL' },
      { name: 'instagram_url', label: 'Instagram URL' },
    ],
  },
  {
    title: 'Contact',
    fields: [
      { name: 'contact_person', label: 'Contact person' },
      { name: 'contact_email', label: 'Contact email' },
      { name: 'contact_phone', label: 'Contact phone', hint: '6-15 digits' },
    ],
  },
  {
    title: 'Business & legal',
    fields: [
      { name: 'registered_business_name', label: 'Registered business name' },
      { name: 'established_year', label: 'Established year', hint: '4-digit year' },
      { name: 'gstin', label: 'GSTIN' },
      { name: 'pan', label: 'PAN' },
    ],
  },
  {
    title: 'Address',
    fields: [
      { name: 'address_line1', label: 'Address line 1', full: true },
      { name: 'city', label: 'City' },
      { name: 'state', label: 'State' },
      { name: 'postal_code', label: 'Postal code' },
      { name: 'country', label: 'Country' },
    ],
  },
  {
    title: 'Payout',
    fields: [
      { name: 'account_holder_name', label: 'Account holder name' },
      { name: 'account_number', label: 'Account number' },
      { name: 'ifsc_code', label: 'IFSC code' },
      { name: 'upi_id', label: 'UPI ID' },
    ],
  },
];

const gridTwo = {
  display: 'grid',
  columnGap: 2,
  rowGap: 1,
  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
};

interface FieldProps {
  control: Control<BrandFormValues>;
  field: BrandFieldDef;
}

function BrandFormField({ control, field }: Readonly<FieldProps>) {
  const minRows = field.multiline ? 3 : undefined;
  const span = field.full ? { gridColumn: { sm: '1 / -1' } } : undefined;
  return (
    <RhfTextField
      control={control}
      name={field.name}
      label={field.label}
      size="small"
      required={field.required}
      hint={field.hint ?? ' '}
      multiline={field.multiline}
      minRows={minRows}
      sx={span}
    />
  );
}

interface Props {
  initialValues?: BrandFormValues;
  saving?: boolean;
  onSubmit: (values: BrandFormValues) => Promise<void> | void;
}

/**
 * Full `EcommBrandInput` editor for one brand, saved through
 * `adminUpdateEcommBrand`. It never sends a status — approving a brand grants
 * the owner the E-commerce Manager role and belongs to Brands Review.
 */
export default function BrandForm({ initialValues, saving, onSubmit }: Readonly<Props>) {
  const { control, handleSubmit, reset } = useForm<BrandFormValues>({
    defaultValues: initialValues ?? brandInitialValues,
    resolver: zodResolver(brandSchema),
    mode: 'onTouched',
  });

  useEffect(() => {
    reset(initialValues ?? brandInitialValues);
  }, [initialValues, reset]);

  const submit = handleSubmit(async (values) => {
    await onSubmit(values);
  });

  return (
    <form noValidate onSubmit={submit}>
      <Stack spacing={3}>
        {BRAND_FIELD_GROUPS.map((group) => (
          <Stack key={group.title} spacing={1}>
            <Typography variant="subtitle2" fontWeight={700}>
              {group.title}
            </Typography>
            <Box sx={gridTwo}>
              {group.fields.map((field) => (
                <BrandFormField key={field.name} control={control} field={field} />
              ))}
            </Box>
          </Stack>
        ))}
        <Button type="submit" variant="contained" disabled={saving} sx={{ alignSelf: 'flex-start' }}>
          {saving ? 'Saving…' : 'Save brand details'}
        </Button>
      </Stack>
    </form>
  );
}
