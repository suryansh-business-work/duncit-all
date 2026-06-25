import { Box, Button, IconButton, MenuItem, Stack, TextField, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import MediaPickerField from '../../components/MediaPickerField';
import { DOC_TYPES } from './queries';

export interface DocEntry {
  id: string;
  type: string;
  url: string;
}

export interface BrandValues {
  brand_name: string;
  logo_url: string;
  cover_image_url: string;
  tagline: string;
  description: string;
  product_categories: string;
  website_url: string;
  instagram_url: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  registered_business_name: string;
  gstin: string;
  pan: string;
  established_year: string;
  address_line1: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  upi_id: string;
}

interface Props {
  values: BrandValues;
  setValues: (next: BrandValues) => void;
  docs: DocEntry[];
  setDocs: (next: DocEntry[]) => void;
  addDoc: () => void;
}

const grid2 = { display: 'grid', columnGap: 1.5, rowGap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } };

export default function EcommBrandEditFields({ values, setValues, docs, setDocs, addDoc }: Readonly<Props>) {
  const set = (key: keyof BrandValues) => (value: string) => setValues({ ...values, [key]: value });
  const field = (key: keyof BrandValues, label: string) => (
    <TextField size="small" label={label} value={values[key]} onChange={(e) => set(key)(e.target.value)} />
  );

  return (
    <Stack spacing={2.5}>
      <Stack spacing={1.5}>
        <Typography variant="subtitle2" fontWeight={700}>Brand</Typography>
        <Box sx={grid2}>
          {field('brand_name', 'Brand name')}
          {field('tagline', 'Tagline')}
        </Box>
        <TextField size="small" label="Description" value={values.description} onChange={(e) => set('description')(e.target.value)} multiline minRows={2} />
        <TextField size="small" label="Product categories" value={values.product_categories} onChange={(e) => set('product_categories')(e.target.value)} helperText="Comma separated categories." />
        <Box sx={grid2}>
          <MediaPickerField label="Logo" value={values.logo_url} onChange={set('logo_url')} folder="/ecomm/brands" />
          <MediaPickerField label="Cover image" value={values.cover_image_url} onChange={set('cover_image_url')} folder="/ecomm/brands" />
        </Box>
        <Box sx={grid2}>
          {field('website_url', 'Website URL')}
          {field('instagram_url', 'Instagram URL')}
        </Box>
      </Stack>

      <Stack spacing={1.5}>
        <Typography variant="subtitle2" fontWeight={700}>Contact</Typography>
        <Box sx={grid2}>
          {field('contact_person', 'Contact person')}
          {field('contact_email', 'Contact email')}
          {field('contact_phone', 'Contact phone')}
        </Box>
      </Stack>

      <Stack spacing={1.5}>
        <Typography variant="subtitle2" fontWeight={700}>Business & legal</Typography>
        <Box sx={grid2}>
          {field('registered_business_name', 'Registered business name')}
          {field('established_year', 'Established year')}
          {field('gstin', 'GSTIN')}
          {field('pan', 'PAN')}
        </Box>
      </Stack>

      <Stack spacing={1.5}>
        <Typography variant="subtitle2" fontWeight={700}>Address</Typography>
        <TextField size="small" label="Address line 1" value={values.address_line1} onChange={(e) => set('address_line1')(e.target.value)} />
        <Box sx={grid2}>
          {field('city', 'City')}
          {field('state', 'State')}
          {field('postal_code', 'Postal code')}
          {field('country', 'Country')}
        </Box>
      </Stack>

      <Stack spacing={1.5}>
        <Typography variant="subtitle2" fontWeight={700}>Payout</Typography>
        <Box sx={grid2}>
          {field('account_holder_name', 'Account holder name')}
          {field('account_number', 'Account number')}
          {field('ifsc_code', 'IFSC code')}
          {field('upi_id', 'UPI ID')}
        </Box>
      </Stack>

      <Stack spacing={1.5}>
        <Typography variant="subtitle2" fontWeight={700}>Documents</Typography>
        {docs.map((doc) => (
          <Box
            key={doc.id}
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '180px minmax(0, 1fr) auto' },
              columnGap: 1.25,
              rowGap: 1,
              alignItems: 'flex-start',
            }}
          >
            <TextField
              select
              size="small"
              label="Type"
              value={doc.type}
              onChange={(e) => setDocs(docs.map((x) => (x.id === doc.id ? { ...x, type: e.target.value } : x)))}
            >
              {DOC_TYPES.map((t) => (
                <MenuItem key={t} value={t}>{t}</MenuItem>
              ))}
            </TextField>
            <Box sx={{ flex: 1 }}>
              <MediaPickerField
                label="File"
                value={doc.url}
                onChange={(url) => setDocs(docs.map((x) => (x.id === doc.id ? { ...x, url } : x)))}
                folder="/ecomm/brands/docs"
              />
            </Box>
            <IconButton onClick={() => setDocs(docs.filter((x) => x.id !== doc.id))}>
              <DeleteIcon />
            </IconButton>
          </Box>
        ))}
        <Button onClick={addDoc} sx={{ alignSelf: 'flex-start' }}>Add document</Button>
      </Stack>
    </Stack>
  );
}
