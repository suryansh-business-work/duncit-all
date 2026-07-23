import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, Button, Chip, Divider, IconButton, Stack, TextField, Typography } from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import SendIcon from '@mui/icons-material/Send';
import { brandSchema, type BrandFormValues } from './schema';

interface FieldDef {
  name: keyof BrandFormValues & string;
  label: string;
  multiline?: boolean;
  required?: boolean;
}

const SECTIONS: Array<{ title: string; fields: FieldDef[] }> = [
  {
    title: 'Brand identity',
    fields: [
      { name: 'brand_name', label: 'Brand name', required: true },
      { name: 'tagline', label: 'Tagline' },
      { name: 'description', label: 'Description', multiline: true, required: true },
    ],
  },
  {
    title: 'Online presence',
    fields: [
      { name: 'website_url', label: 'Website' },
      { name: 'instagram_url', label: 'Instagram' },
    ],
  },
  {
    title: 'Contact',
    fields: [
      { name: 'contact_person', label: 'Contact person' },
      { name: 'contact_email', label: 'Contact email', required: true },
      { name: 'contact_phone', label: 'Contact phone' },
    ],
  },
  {
    title: 'Business & legal',
    fields: [
      { name: 'registered_business_name', label: 'Registered business name' },
      { name: 'gstin', label: 'GSTIN' },
      { name: 'pan', label: 'PAN' },
      { name: 'established_year', label: 'Established year' },
    ],
  },
  {
    title: 'Address',
    fields: [
      { name: 'address_line1', label: 'Address' },
      { name: 'city', label: 'City' },
      { name: 'state', label: 'State' },
      { name: 'postal_code', label: 'Postal code' },
      { name: 'country', label: 'Country' },
    ],
  },
  {
    title: 'Payout (optional)',
    fields: [
      { name: 'account_holder_name', label: 'Account holder name' },
      { name: 'account_number', label: 'Account number' },
      { name: 'ifsc_code', label: 'IFSC code' },
      { name: 'upi_id', label: 'UPI ID' },
    ],
  },
];

interface Props {
  defaultValues: BrandFormValues;
  busy: boolean;
  locked: boolean;
  onSave: (values: BrandFormValues) => void;
  onSubmitForReview: (values: BrandFormValues) => void;
  onPickImage: () => Promise<string | null>;
}

export default function EcommBrandForm({ defaultValues, busy, locked, onSave, onSubmitForReview, onPickImage }: Readonly<Props>) {
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<BrandFormValues>({
    resolver: zodResolver(brandSchema),
    defaultValues,
  });
  const [categoryDraft, setCategoryDraft] = useState('');

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const categories = watch('product_categories');
  const documents = watch('documents');
  const logo = watch('logo_url');
  const cover = watch('cover_image_url');
  const fieldError = (name: string): string | undefined => (errors as Record<string, { message?: string }>)[name]?.message;

  const addCategory = () => {
    const value = categoryDraft.trim();
    if (value && !categories.includes(value)) setValue('product_categories', [...categories, value].slice(0, 30));
    setCategoryDraft('');
  };
  const pickInto = async (field: 'logo_url' | 'cover_image_url') => {
    const url = await onPickImage();
    if (url) setValue(field, url);
  };
  const addDocument = async () => {
    const url = await onPickImage();
    if (url) setValue('documents', [...documents, { type: 'DOCUMENT', url }]);
  };

  return (
    <Stack spacing={2.5} component="form" onSubmit={handleSubmit(onSave)} noValidate>
      {SECTIONS.map((section) => (
        <Box key={section.title}>
          <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>{section.title}</Typography>
          <Stack spacing={2}>
            {section.fields.map((field) => (
              <TextField
                key={field.name}
                label={field.label}
                required={field.required}
                fullWidth
                disabled={locked}
                multiline={field.multiline}
                minRows={field.multiline ? 3 : undefined}
                error={!!fieldError(field.name)}
                helperText={fieldError(field.name)}
                {...register(field.name)}
              />
            ))}
          </Stack>
        </Box>
      ))}

      <Box>
        <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>Product categories</Typography>
        <Stack direction="row" spacing={1}>
          <TextField
            size="small"
            fullWidth
            disabled={locked}
            label="Add a category"
            value={categoryDraft}
            onChange={(e) => setCategoryDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCategory(); } }}
          />
          <Button onClick={addCategory} disabled={locked} variant="outlined">Add</Button>
        </Stack>
        <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1} sx={{ mt: 1 }}>
          {categories.map((category) => (
            <Chip
              key={category}
              label={category}
              onDelete={locked ? undefined : () => setValue('product_categories', categories.filter((c) => c !== category))}
            />
          ))}
        </Stack>
      </Box>

      <Box>
        <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>Brand media</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <MediaSlot label="Logo" url={logo} disabled={locked} onPick={() => pickInto('logo_url')} onClear={() => setValue('logo_url', '')} />
          <MediaSlot label="Cover image" url={cover} disabled={locked} onPick={() => pickInto('cover_image_url')} onClear={() => setValue('cover_image_url', '')} />
        </Stack>
      </Box>

      <Box>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="subtitle2" fontWeight={800}>Documents</Typography>
          <Button size="small" startIcon={<AddPhotoAlternateIcon />} onClick={addDocument} disabled={locked}>Add document</Button>
        </Stack>
        {documents.length === 0 ? (
          <Typography variant="caption" color="text.secondary">Brand registration, trademark, GST certificate, etc.</Typography>
        ) : (
          <Stack spacing={1}>
            {documents.map((doc, index) => (
              <Stack key={doc.url} direction="row" alignItems="center" spacing={1}>
                <TextField size="small" label="Type" value={doc.type} disabled={locked} onChange={(e) => setValue('documents', documents.map((d, i) => (i === index ? { ...d, type: e.target.value } : d)))} sx={{ width: 160 }} />
                <Typography variant="caption" color="text.secondary" noWrap sx={{ flex: 1, minWidth: 0 }}>{doc.url}</Typography>
                {!locked && (
                  <IconButton size="small" onClick={() => setValue('documents', documents.filter((_, i) => i !== index))}><DeleteIcon fontSize="small" /></IconButton>
                )}
              </Stack>
            ))}
          </Stack>
        )}
      </Box>

      {!locked && (
        <>
          <Divider />
          <Stack direction="row" spacing={1.5} justifyContent="flex-end">
            <Button type="submit" variant="outlined" disabled={busy}>Save draft</Button>
            <Button type="button" variant="contained" endIcon={<SendIcon />} disabled={busy} onClick={handleSubmit(onSubmitForReview)}>
              Submit for review
            </Button>
          </Stack>
        </>
      )}
    </Stack>
  );
}

function MediaSlot({ label, url, disabled, onPick, onClear }: Readonly<{ label: string; url: string; disabled: boolean; onPick: () => void; onClear: () => void }>) {
  return (
    <Box sx={{ flex: 1 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      {url && <Box component="img" src={url} alt={label} sx={{ display: 'block', width: '100%', maxHeight: 140, objectFit: 'cover', borderRadius: 1, my: 0.5 }} />}
      <Stack direction="row" spacing={1}>
        <Button size="small" startIcon={<UploadFileIcon />} variant="outlined" onClick={onPick} disabled={disabled}>{url ? 'Change' : 'Upload'}</Button>
        {url && !disabled && <Button size="small" color="error" onClick={onClear}>Remove</Button>}
      </Stack>
    </Box>
  );
}
