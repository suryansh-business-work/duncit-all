import { gql, useMutation } from '@apollo/client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Card, CardContent, Stack, Step, StepLabel, Stepper } from '@mui/material';
import type { Path } from 'react-hook-form';
import MediaPickerDialog from '../../../components/MediaPickerDialog';
import { parseApiError } from '@duncit/utils';
import type { ProductListingValues } from './list-products.types';
import { productListingSchema } from './list-products.schema';
import { StepBody } from './list-products.form-ui';

export { productListingSchema } from './list-products.schema';

const PRODUCT_FIELDS = `
  id
  product_name
  listing_review_status
  listing_review_notes
  images
  image_url
  inventory_count
  unit_cost
  brand_id
  super_category_id
  category_id
  sub_category_id
`;

const SUBMIT_PRODUCT_LISTING = gql`
  mutation SubmitProductListing($input: ProductListingInput!) {
    submitProductListing(input: $input) { ${PRODUCT_FIELDS} }
  }
`;

const UPDATE_PRODUCT_LISTING = gql`
  mutation UpdateMyProductListing($product_doc_id: ID!, $input: ProductListingInput!) {
    updateMyProductListing(product_doc_id: $product_doc_id, input: $input) { ${PRODUCT_FIELDS} }
  }
`;

const emptyValues: ProductListingValues = {
  super_category_id: '',
  category_id: '',
  sub_category_id: '',
  product_name: '',
  image_urls: [],
  description: '',
  size_label: '',
  height_cm: '',
  weight_kg: '',
  color: '#000000',
  inventory_count: '',
  unit_cost: '',
  variants: [],
  commission_pct: 15,
  delivery_target: 'HOST',
};

const steps = ['Category', 'Product details', 'Inventory', 'Commission', 'Delivery', 'Preview'];
const stepFields: Path<ProductListingValues>[][] = [['super_category_id', 'category_id', 'sub_category_id'], ['product_name', 'image_urls', 'description'], ['size_label', 'height_cm', 'weight_kg', 'color', 'inventory_count', 'unit_cost', 'variants'], ['commission_pct'], ['delivery_target'], []];

interface Props {
  brandId: string;
  product?: any;
  onSaved?: () => void;
}

export default function ListProductsForm({ brandId, product = null, onSaved }: Readonly<Props>) {
  const [submitProduct, submitState] = useMutation(SUBMIT_PRODUCT_LISTING);
  const [updateProduct, updateState] = useMutation(UPDATE_PRODUCT_LISTING);
  const [activeStep, setActiveStep] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const loading = submitState.loading || updateState.loading;
  const editing = Boolean(product?.id);

  const { control, handleSubmit, reset, trigger, watch, setValue, formState } = useForm<ProductListingValues>({
    resolver: zodResolver(productListingSchema),
    defaultValues: productToValues(product),
    mode: 'onBlur',
  });

  useEffect(() => {
    reset(productToValues(product));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  const onSubmit = handleSubmit(async (values) => {
    setApiError(null);
    try {
      const variables = editing ? { product_doc_id: product.id, input: toSubmitInput(values, brandId) } : { input: toSubmitInput(values, brandId) };
      await (editing ? updateProduct : submitProduct)({ variables });
      setSubmitted(true);
      setActiveStep(5);
      if (!editing) reset(emptyValues);
      onSaved?.();
    } catch (error) {
      setApiError(parseApiError(error));
    }
  });

  const next = async () => {
    const valid = await trigger(stepFields[activeStep]);
    if (!valid) return;
    setActiveStep((step) => Math.min(step + 1, steps.length - 1));
  };
  const addImage = (url: string) => setValue('image_urls', Array.from(new Set([...watch('image_urls'), url])), { shouldValidate: true });

  const superId = watch('super_category_id');
  const categoryId = watch('category_id');
  const subId = watch('sub_category_id');
  const category = {
    superId,
    categoryId,
    subId,
    errors: {
      super: formState.errors.super_category_id?.message,
      category: formState.errors.category_id?.message,
      sub: formState.errors.sub_category_id?.message,
    },
    onChange: (nextCascade: { superId: string; categoryId: string; subId: string }) => {
      setValue('super_category_id', nextCascade.superId, { shouldValidate: true });
      setValue('category_id', nextCascade.categoryId, { shouldValidate: true });
      setValue('sub_category_id', nextCascade.subId, { shouldValidate: true });
    },
  };

  const saveLabel = editing ? 'Update listing' : 'Submit for approval';
  const submitLabel = loading ? 'Saving...' : saveLabel;

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        <Stack spacing={2.25} component="form" onSubmit={onSubmit}>
          <Stepper activeStep={activeStep} alternativeLabel sx={{ display: { xs: 'none', sm: 'flex' } }}>
            {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
          </Stepper>
          {submitted && <Alert severity="success">Product {editing ? 'updated' : 'submitted'}. Products portal approval is required before it shows in matching pods.</Alert>}
          {apiError && <Alert severity="error">{apiError}</Alert>}
          <StepBody step={activeStep} control={control} watch={watch} setValue={setValue} onImageClick={() => setPickerOpen(true)} category={category} />
          <Stack direction="row" spacing={1} justifyContent="space-between">
            <Button disabled={activeStep === 0 || loading} onClick={() => setActiveStep((step) => step - 1)}>Back</Button>
            {activeStep < steps.length - 1 ? <Button variant="contained" onClick={next}>Next</Button> : <Button type="submit" variant="contained" disabled={loading}>{submitLabel}</Button>}
          </Stack>
        </Stack>
      </CardContent>
      <MediaPickerDialog open={pickerOpen} onClose={() => setPickerOpen(false)} onPicked={(url) => { addImage(url); setPickerOpen(false); }} folder="/partner-products" title="Upload product image" accept="image/*" />
    </Card>
  );
}

function productToValues(product?: any): ProductListingValues {
  if (!product) return emptyValues;
  const image_urls = Array.from(new Set([product.image_url, ...(product.images ?? [])].filter(Boolean)));
  // The first stored variant mirrors the flat fields; extras (index ≥ 1) are the
  // additional variant tabs the seller manages.
  const variants: ProductListingValues['variants'] = Array.isArray(product.variants)
    ? product.variants.slice(1).map((v: any) => ({
        option_label: v.option_label ?? '',
        color: v.color ?? '',
        size_label: v.size_label ?? '',
        unit_cost: v.unit_cost ?? '',
        inventory_count: v.inventory_count ?? '',
        image_urls: Array.isArray(v.images) ? v.images : [],
      }))
    : [];
  return { ...emptyValues, ...product, image_urls, variants };
}

// Build only the fields ProductListingInput accepts (an edited product carries
// extra fields like id/listing_* that the input would reject).
function toSubmitInput(values: ProductListingValues, brandId: string) {
  return {
    brand_id: brandId,
    super_category_id: values.super_category_id,
    category_id: values.category_id,
    sub_category_id: values.sub_category_id,
    product_name: values.product_name,
    image_url: values.image_urls[0] ?? '',
    images: values.image_urls,
    description: values.description,
    size_label: values.size_label,
    height_cm: Number(values.height_cm),
    weight_kg: Number(values.weight_kg),
    color: values.color,
    inventory_count: Number(values.inventory_count),
    unit_cost: Number(values.unit_cost),
    variants: buildVariants(values),
    commission_pct: values.commission_pct,
    delivery_target: values.delivery_target,
  };
}

// The flat fields are the primary variant; the seller's extra tabs follow. Dims
// are shared at the product level, so each variant inherits them.
function buildVariants(values: ProductListingValues) {
  const height_cm = Number(values.height_cm);
  const weight_kg = Number(values.weight_kg);
  const primary = {
    option_label: values.size_label || values.color || 'Default',
    color: values.color,
    size_label: values.size_label,
    unit_cost: Number(values.unit_cost),
    inventory_count: Number(values.inventory_count),
    images: values.image_urls,
    height_cm,
    weight_kg,
  };
  const extras = (values.variants ?? []).map((v) => ({
    option_label: v.option_label,
    color: v.color,
    size_label: v.size_label,
    unit_cost: Number(v.unit_cost),
    inventory_count: Number(v.inventory_count),
    images: v.image_urls,
    height_cm,
    weight_kg,
  }));
  return [primary, ...extras];
}
