import { useMemo, useEffect } from 'react';
import { useForm, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import {
  brandInitialValues,
  brandSchema,
  MAX_PRODUCT_CATEGORIES,
  type BrandFormValues,
} from './brand.types';
import { useTranslation } from '@duncit/shell';

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
type Translate = ReturnType<typeof useTranslation>['t'];

/** Group headings, field labels and hints are copy, so the layout is built
 *  from the active catalogue rather than frozen at module load. */
const brandFieldGroups = (t: Translate): BrandFieldGroup[] => [
  {
    title: t('products.brandForm.section'),
    fields: [
      { name: 'brand_name', label: t('products.brandForm.brandName'), required: true, hint: 'Shown in the marketplace' },
      { name: 'tagline', label: t('products.brandForm.tagline') },
      { name: 'description', label: t('shell.common.description'), multiline: true, full: true },
      {
        name: 'product_categories',
        label: t('products.brandForm.categories'),
        full: true,
        hint: `Comma separated, up to ${MAX_PRODUCT_CATEGORIES}`,
      },
      { name: 'logo_url', label: t('products.brandForm.logoUrl') },
      { name: 'cover_image_url', label: t('products.brandForm.coverUrl') },
      { name: 'website_url', label: t('products.brandForm.websiteUrl') },
      { name: 'instagram_url', label: t('products.brandForm.instagramUrl') },
    ],
  },
  {
    title: t('products.brandForm.contactSection'),
    fields: [
      { name: 'contact_person', label: t('products.brandForm.contactPerson') },
      { name: 'contact_email', label: t('products.brandForm.contactEmail') },
      { name: 'contact_phone', label: t('products.brandForm.contactPhone'), hint: '6-15 digits' },
    ],
  },
  {
    title: t('products.brandForm.businessSection'),
    fields: [
      { name: 'registered_business_name', label: t('products.brandForm.registeredName') },
      { name: 'established_year', label: t('products.brandForm.establishedYear'), hint: '4-digit year' },
      { name: 'gstin', label: 'GSTIN' },
      { name: 'pan', label: 'PAN' },
    ],
  },
  {
    title: t('products.brandForm.address'),
    fields: [
      { name: 'address_line1', label: t('products.brandForm.addressLine1'), full: true },
      { name: 'city', label: t('products.brandForm.city') },
      { name: 'state', label: t('products.brandForm.state') },
      { name: 'postal_code', label: t('products.brandForm.postalCode') },
      { name: 'country', label: t('products.brandForm.country') },
    ],
  },
  {
    title: t('products.brandForm.payoutSection'),
    fields: [
      { name: 'account_holder_name', label: t('products.brandForm.accountHolder') },
      { name: 'account_number', label: t('products.brandForm.accountNumber') },
      { name: 'ifsc_code', label: t('products.brandForm.ifsc') },
      { name: 'upi_id', label: t('products.brandForm.upi') },
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
  const { t } = useTranslation();
  const groups = useMemo(() => brandFieldGroups(t), [t]);
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
        {groups.map((group) => (
          <Stack key={group.title} spacing={1}>
            <Typography variant="subtitle2" sx={{
              fontWeight: 700
            }}>
              {group.title}
            </Typography>
            <Box sx={gridTwo}>
              {group.fields.map((field) => (
                <BrandFormField key={field.name} control={control} field={field} />
              ))}
            </Box>
          </Stack>
        ))}
        <DuncitButton type="submit" variant="contained" disabled={saving} sx={{ alignSelf: 'flex-start' }}>
          {saving ? 'Saving…' : 'Save brand details'}
        </DuncitButton>
      </Stack>
    </form>
  );
}
