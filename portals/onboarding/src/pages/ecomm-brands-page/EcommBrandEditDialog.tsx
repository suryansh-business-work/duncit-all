import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import { ADMIN_UPDATE_ECOMM_BRAND, STATUSES } from './queries';
import EcommBrandEditFields, { type BrandValues, type DocEntry } from './EcommBrandEditFields';

interface Props {
  brand: any | null;
  onClose: () => void;
  onSaved: () => void;
}

const blankValues: BrandValues = {
  brand_name: '', logo_url: '', cover_image_url: '', tagline: '', description: '',
  product_categories: '', website_url: '', instagram_url: '', contact_person: '',
  contact_email: '', contact_phone: '', registered_business_name: '', gstin: '', pan: '',
  established_year: '', address_line1: '', city: '', state: '', postal_code: '', country: '',
  account_holder_name: '', account_number: '', ifsc_code: '', upi_id: '',
};

const str = (value: unknown) => (value == null ? '' : String(value));

export default function EcommBrandEditDialog({ brand, onClose, onSaved }: Readonly<Props>) {
  const [values, setValues] = useState<BrandValues>(blankValues);
  const [docs, setDocs] = useState<DocEntry[]>([]);
  const [status, setStatus] = useState('DRAFT');
  const [error, setError] = useState('');
  const docId = useRef(0);
  const [updateBrand, state] = useMutation(ADMIN_UPDATE_ECOMM_BRAND);

  useEffect(() => {
    if (!brand) return;
    setValues({
      brand_name: str(brand.brand_name),
      logo_url: str(brand.logo_url),
      cover_image_url: str(brand.cover_image_url),
      tagline: str(brand.tagline),
      description: str(brand.description),
      product_categories: (brand.product_categories ?? []).join(', '),
      website_url: str(brand.website_url),
      instagram_url: str(brand.instagram_url),
      contact_person: str(brand.contact_person),
      contact_email: str(brand.contact_email),
      contact_phone: str(brand.contact_phone),
      registered_business_name: str(brand.registered_business_name),
      gstin: str(brand.gstin),
      pan: str(brand.pan),
      established_year: str(brand.established_year),
      address_line1: str(brand.address_line1),
      city: str(brand.city),
      state: str(brand.state),
      postal_code: str(brand.postal_code),
      country: str(brand.country),
      account_holder_name: str(brand.account_holder_name),
      account_number: str(brand.account_number),
      ifsc_code: str(brand.ifsc_code),
      upi_id: str(brand.upi_id),
    });
    setDocs(
      (brand.documents ?? []).map((doc: any) => {
        docId.current += 1;
        return { id: `doc-${docId.current}`, type: str(doc.type), url: str(doc.url) };
      }),
    );
    setStatus(brand.status ?? 'DRAFT');
    setError('');
  }, [brand]);

  const addDoc = () => {
    docId.current += 1;
    setDocs((current) => [...current, { id: `doc-${docId.current}`, type: 'GST Certificate', url: '' }]);
  };

  const buildInput = () => {
    const established = Number.parseInt(values.established_year, 10);
    return {
      brand_name: values.brand_name.trim(),
      logo_url: values.logo_url.trim(),
      cover_image_url: values.cover_image_url.trim(),
      tagline: values.tagline.trim(),
      description: values.description.trim(),
      product_categories: values.product_categories.split(',').map((c) => c.trim()).filter(Boolean),
      website_url: values.website_url.trim(),
      instagram_url: values.instagram_url.trim(),
      contact_person: values.contact_person.trim(),
      contact_email: values.contact_email.trim(),
      contact_phone: values.contact_phone.trim(),
      registered_business_name: values.registered_business_name.trim(),
      gstin: values.gstin.trim().toUpperCase(),
      pan: values.pan.trim().toUpperCase(),
      established_year: Number.isNaN(established) ? null : established,
      address_line1: values.address_line1.trim(),
      city: values.city.trim(),
      state: values.state.trim(),
      postal_code: values.postal_code.trim(),
      country: values.country.trim(),
      account_holder_name: values.account_holder_name.trim(),
      account_number: values.account_number.trim(),
      ifsc_code: values.ifsc_code.trim().toUpperCase(),
      upi_id: values.upi_id.trim(),
      documents: docs.filter((doc) => doc.type && doc.url).map((doc) => ({ type: doc.type, url: doc.url })),
    };
  };

  const save = async () => {
    if (!brand) return;
    setError('');
    try {
      await updateBrand({ variables: { id: brand.id, input: buildInput(), status } });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save brand');
    }
  };

  return (
    <Dialog open={!!brand} onClose={state.loading ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle>Edit Brand</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <EcommBrandEditFields
            values={values}
            setValues={setValues}
            docs={docs}
            setDocs={setDocs}
            addDoc={addDoc}
          />
          <TextField
            select
            label="Status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            sx={{ maxWidth: 280 }}
          >
            {STATUSES.filter(Boolean).map((item) => (
              <MenuItem key={item} value={item}>
                {item}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={state.loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={save}
          disabled={state.loading}
          startIcon={state.loading ? <CircularProgress size={14} /> : undefined}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
