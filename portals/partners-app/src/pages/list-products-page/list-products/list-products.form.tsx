import { gql, useMutation } from '@apollo/client';
import { useEffect, useState } from 'react';
import { useForm, type Path } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Card, CardContent, Stack, Step, StepContent, StepLabel, Stepper } from '@mui/material';
import MediaPickerDialog from '../../../components/MediaPickerDialog';
import { parseApiError } from '@duncit/utils';
import { ModerationBlockedDialog } from '@duncit/ui';
import type { ProductListingValues } from './list-products.types';
import { productListingSchema } from './list-products.schema';
import { productToValues, toSubmitInput } from './list-products.map';
import { StepBody } from './list-products.form-ui';
import StepActions from './StepActions';
import { useAutoVariants } from './useAutoVariants';
import { useProductModeration } from './useProductModeration';

export { productListingSchema } from './list-products.schema';

const PRODUCT_FIELDS = `
  id
  product_name
  listing_review_status
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

const steps = ['Category', 'Product', 'Variants', 'Commission', 'Delivery', 'Preview'];
const stepFields: Path<ProductListingValues>[][] = [
  ['categories'],
  ['product_name'],
  ['variants'],
  ['commission_pct'],
  ['delivery_target', 'pickup_location_id', 'free_delivery_above'],
  [],
];

interface Props {
  brandId: string;
  product?: any;
  onSaved?: () => void;
}

export default function ListProductsForm({ brandId, product = null, onSaved }: Readonly<Props>) {
  const [submitProduct, submitState] = useMutation(SUBMIT_PRODUCT_LISTING);
  const [updateProduct, updateState] = useMutation(UPDATE_PRODUCT_LISTING);
  const [activeStep, setActiveStep] = useState(0);
  const [pickerIndex, setPickerIndex] = useState<number | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const moderation = useProductModeration(steps);
  const loading = submitState.loading || updateState.loading || moderation.moderating;
  const editing = Boolean(product?.id);

  const { control, handleSubmit, reset, trigger, watch, getValues, setValue, setError } = useForm<ProductListingValues>({
    resolver: zodResolver(productListingSchema),
    defaultValues: productToValues(product),
    mode: 'onBlur',
  });
  useAutoVariants(control, getValues, setValue);

  useEffect(() => {
    reset(productToValues(product));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  const onSubmit = handleSubmit(async (values) => {
    setApiError(null);
    try {
      const clean = await moderation.check({ values, setError, onJumpToStep: setActiveStep });
      if (!clean) return;
      const input = toSubmitInput(values, brandId);
      const variables = editing ? { product_doc_id: product.id, input } : { input };
      await (editing ? updateProduct : submitProduct)({ variables });
      setSubmitted(true);
      setActiveStep(steps.length - 1);
      if (!editing) reset(productToValues(null));
      onSaved?.();
    } catch (error) {
      setApiError(parseApiError(error));
    }
  });

  const next = async () => {
    const valid = await trigger(stepFields[activeStep]);
    if (valid) setActiveStep((step) => Math.min(step + 1, steps.length - 1));
  };

  const addVariantImage = (url: string) => {
    if (pickerIndex === null) return;
    const path = `variants.${pickerIndex}.image_urls` as Path<ProductListingValues>;
    const current = (watch(path) as string[] | undefined) ?? [];
    setValue(path, Array.from(new Set([...current, url])) as never, { shouldValidate: true });
    setPickerIndex(null);
  };

  const saveLabel = editing ? 'Update listing' : 'Submit for approval';
  const submitLabel = loading ? 'Saving...' : saveLabel;

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        <Stack spacing={2.25} component="form" onSubmit={onSubmit}>
          {submitted && (
            <Alert severity="success">
              Product {editing ? 'updated' : 'submitted'}. Products portal approval is required before it shows in matching
              pods.
            </Alert>
          )}
          {apiError && <Alert severity="error">{apiError}</Alert>}
          <Stepper activeStep={activeStep} orientation="vertical">
            {steps.map((label, index) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
                <StepContent>
                  {activeStep === index && (
                    <Stack spacing={2.25}>
                      <StepBody
                        step={index}
                        brandId={brandId}
                        control={control}
                        watch={watch}
                        setValue={setValue}
                        onPickImage={setPickerIndex}
                      />
                      <StepActions
                        isFirst={index === 0}
                        isLast={index === steps.length - 1}
                        loading={loading}
                        moderating={moderation.moderating}
                        submitLabel={submitLabel}
                        onBack={() => setActiveStep((step) => step - 1)}
                        onNext={next}
                      />
                    </Stack>
                  )}
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </Stack>
      </CardContent>
      <MediaPickerDialog
        open={pickerIndex !== null}
        onClose={() => setPickerIndex(null)}
        onPicked={addVariantImage}
        folder="/partner-products"
        title="Upload variant image"
        accept="image/*"
      />
      <ModerationBlockedDialog
        violations={moderation.blocked}
        onJump={(step) => {
          setActiveStep(step);
          moderation.closeBlocked();
        }}
        onClose={moderation.closeBlocked}
        description="Our AI check found content that breaks the community guidelines, so the product was not submitted. Fix the items below and try again."
      />
    </Card>
  );
}
