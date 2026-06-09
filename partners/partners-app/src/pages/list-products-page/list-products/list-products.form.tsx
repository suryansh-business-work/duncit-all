import { gql, useMutation } from '@apollo/client';
import { useState } from 'react';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { Alert, Button, Card, CardContent, Stack, Step, StepLabel, Stepper } from '@mui/material';
import MediaPickerDialog from '../../../components/media-picker-dialog/MediaPickerDialog';
import { parseApiError } from '../../../utils/parseApiError';
import type { ProductListingValues } from './list-products.types';
import { StepBody } from './list-products.form-ui';

const PRODUCT_FIELDS = `
  id
  product_name
  listing_review_status
  listing_review_notes
  images
  image_url
  inventory_count
  unit_cost
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

export const productListingSchema = yup.object({
  is_duncit_delivery_partner: yup.boolean().required('Delivery partner status is required'),
  product_name: yup.string().trim().min(3, 'Product title is too short').max(160).required('Product title is required'),
  image_urls: yup.array().of(yup.string().trim().url('Use valid image URLs')).min(1, 'At least one product image is required').required(),
  description: yup.string().trim().min(20, 'Description must be at least 20 characters').max(2000).required('Description is required'),
  size_label: yup.string().trim().max(120).required('Size is required'),
  height_cm: yup.number().typeError('Height is required').min(0.1).max(1000).required('Height is required'),
  weight_kg: yup.number().typeError('Weight is required').min(0.01).max(1000).required('Weight is required'),
  color: yup.string().trim().max(80).required('Color is required'),
  inventory_count: yup.number().typeError('Inventory is required').integer().min(1).required('Inventory is required'),
  unit_cost: yup.number().typeError('Price is required').min(1).required('Price is required'),
  commission_pct: yup.number().min(5, 'Commission starts at 5%').max(50, 'Commission cannot exceed 50%').required(),
  delivery_target: yup.string().oneOf(['HOST', 'VENUE']).required('Delivery target is required'),
});

const emptyValues: ProductListingValues = {
  is_duncit_delivery_partner: false,
  product_name: '',
  image_urls: [],
  description: '',
  size_label: '',
  height_cm: '',
  weight_kg: '',
  color: '',
  inventory_count: '',
  unit_cost: '',
  commission_pct: 15,
  delivery_target: 'HOST',
};

const steps = ['Delivery partner', 'Product details', 'Inventory', 'Commission', 'Delivery', 'Preview'];
const stepFields = [['is_duncit_delivery_partner'], ['product_name', 'image_urls', 'description'], ['size_label', 'height_cm', 'weight_kg', 'color', 'inventory_count', 'unit_cost'], ['commission_pct'], ['delivery_target'], []];

interface Props {
  product?: any | null;
  onSaved?: () => void;
}

export default function ListProductsForm({ product = null, onSaved }: Readonly<Props>) {
  const [submitProduct, submitState] = useMutation(SUBMIT_PRODUCT_LISTING);
  const [updateProduct, updateState] = useMutation(UPDATE_PRODUCT_LISTING);
  const [activeStep, setActiveStep] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const loading = submitState.loading || updateState.loading;
  const editing = Boolean(product?.id);

  const formik = useFormik<ProductListingValues>({
    initialValues: productToValues(product),
    enableReinitialize: true,
    validationSchema: productListingSchema,
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: async (values, helpers) => {
      setApiError(null);
      try {
        const variables = editing ? { product_doc_id: product.id, input: toSubmitInput(values) } : { input: toSubmitInput(values) };
        await (editing ? updateProduct : submitProduct)({ variables });
        setSubmitted(true);
        setActiveStep(5);
        if (!editing) helpers.resetForm({ values: emptyValues });
        onSaved?.();
      } catch (error) {
        setApiError(parseApiError(error));
      }
    },
  });

  const next = async () => {
    const fields = stepFields[activeStep];
    formik.setTouched(fields.reduce((acc, name) => ({ ...acc, [name]: true }), formik.touched), true);
    const errors = await formik.validateForm();
    if (fields.some((name) => Boolean((errors as any)[name]))) return;
    setActiveStep((step) => Math.min(step + 1, steps.length - 1));
  };
  const addImage = (url: string) => formik.setFieldValue('image_urls', Array.from(new Set([...formik.values.image_urls, url])));

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        <Stack spacing={2.25} component="form" onSubmit={formik.handleSubmit}>
          <Stepper activeStep={activeStep} alternativeLabel sx={{ display: { xs: 'none', sm: 'flex' } }}>
            {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
          </Stepper>
          {submitted && <Alert severity="success">Product {editing ? 'updated' : 'submitted'}. Admin approval is required before hosts can select it.</Alert>}
          {apiError && <Alert severity="error">{apiError}</Alert>}
          <StepBody step={activeStep} formik={formik} onImageClick={() => setPickerOpen(true)} />
          <Stack direction="row" spacing={1} justifyContent="space-between">
            <Button disabled={activeStep === 0 || loading} onClick={() => setActiveStep((step) => step - 1)}>Back</Button>
            {activeStep < steps.length - 1 ? <Button variant="contained" onClick={next}>Next</Button> : <Button type="submit" variant="contained" disabled={loading}>{loading ? 'Saving...' : editing ? 'Update listing' : 'Submit for approval'}</Button>}
          </Stack>
        </Stack>
      </CardContent>
      <MediaPickerDialog open={pickerOpen} onClose={() => setPickerOpen(false)} onPicked={(url) => { addImage(url); setPickerOpen(false); }} folder="/partner-products" title="Upload product image" accept="image/*" />
    </Card>
  );
}

function productToValues(product?: any | null): ProductListingValues {
  if (!product) return emptyValues;
  const image_urls = Array.from(new Set([product.image_url, ...(product.images ?? [])].filter(Boolean)));
  return { ...emptyValues, ...product, image_urls };
}

function toSubmitInput(values: ProductListingValues) {
  return { ...values, image_url: values.image_urls[0] ?? '', images: values.image_urls, height_cm: Number(values.height_cm), weight_kg: Number(values.weight_kg), inventory_count: Number(values.inventory_count), unit_cost: Number(values.unit_cost) };
}