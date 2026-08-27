import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, Chip, Divider, Stack, TextField, Typography } from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import SendIcon from '@mui/icons-material/Send';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { brandSchema, type BrandFormValues } from './schema';
import { useTranslation } from '@duncit/shell';

interface FieldDef {
  name: keyof BrandFormValues & string;
  label: string;
  multiline?: boolean;
  required?: boolean;
}

type Translate = ReturnType<typeof useTranslation>['t'];

const sections = (t: Translate): Array<{ title: string; fields: FieldDef[] }> =>[
  {
    title: t('partners.ecommBrandPage.brandIdentity'),
    fields: [
      { name: 'brand_name', label: t('partners.ecommBrandPage.brandName'), required: true },
      { name: 'tagline', label: t('partners.ecommBrandPage.tagline') },
      { name: 'description', label: t('shell.common.description'), multiline: true, required: true },
    ],
  },
  {
    title: t('partners.ecommBrandPage.onlinePresence'),
    fields: [
      { name: 'website_url', label: t('partners.ecommBrandPage.website') },
      { name: 'instagram_url', label: t('partners.ecommBrandPage.instagram') },
    ],
  },
  {
    title: t('partners.ecommBrandPage.contact'),
    fields: [
      { name: 'contact_person', label: t('partners.ecommBrandPage.contactPerson') },
      { name: 'contact_email', label: t('partners.ecommBrandPage.contactEmail'), required: true },
      { name: 'contact_phone', label: t('partners.ecommBrandPage.contactPhone') },
    ],
  },
  {
    title: t('partners.ecommBrandPage.businessAndLegal'),
    fields: [
      { name: 'registered_business_name', label: t('partners.ecommBrandPage.registeredBusinessName') },
      { name: 'gstin', label: 'GSTIN' },
      { name: 'pan', label: 'PAN' },
      { name: 'established_year', label: t('partners.ecommBrandPage.establishedYear') },
    ],
  },
  {
    title: t('partners.common.address'),
    fields: [
      { name: 'address_line1', label: t('partners.common.address') },
      { name: 'city', label: t('partners.common.city') },
      { name: 'state', label: t('partners.ecommBrandPage.state') },
      { name: 'postal_code', label: t('partners.ecommBrandPage.postalCode') },
      { name: 'country', label: t('partners.ecommBrandPage.country') },
    ],
  },
  {
    title: t('partners.ecommBrandPage.payoutOptional'),
    fields: [
      { name: 'account_holder_name', label: t('partners.common.accountHolderName') },
      { name: 'account_number', label: t('partners.common.accountNumber') },
      { name: 'ifsc_code', label: t('partners.common.ifscCode') },
      { name: 'upi_id', label: t('partners.common.upiId') },
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
  const { t } = useTranslation();
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
      {sections(t).map((section) => (
        <Box key={section.title}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 800,
              mb: 1
            }}>{section.title}</Typography>
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
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 800,
            mb: 1
          }}>{t('partners.ecommBrandPage.productCategories')}</Typography>
        <Stack direction="row" spacing={1}>
          <TextField
            size="small"
            fullWidth
            disabled={locked}
            label={t('partners.ecommBrandPage.addACategory')}
            value={categoryDraft}
            onChange={(e) => setCategoryDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCategory(); } }}
          />
          <DuncitButton onClick={addCategory} disabled={locked} variant="outlined">Add</DuncitButton>
        </Stack>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            flexWrap: "wrap",
            rowGap: 1,
            mt: 1
          }}>
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
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 800,
            mb: 1
          }}>{t('partners.ecommBrandPage.brandMedia')}</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <MediaSlot label={t('partners.ecommBrandPage.logo')} url={logo} disabled={locked} onPick={() => pickInto('logo_url')} onClear={() => setValue('logo_url', '')} />
          <MediaSlot label={t('partners.ecommBrandPage.coverImage')} url={cover} disabled={locked} onPick={() => pickInto('cover_image_url')} onClear={() => setValue('cover_image_url', '')} />
        </Stack>
      </Box>

      <Box>
        <Stack
          direction="row"
          sx={{
            alignItems: "center",
            justifyContent: "space-between",
            mb: 1
          }}>
          <Typography variant="subtitle2" sx={{
            fontWeight: 800
          }}>{t('shell.nav.documents')}</Typography>
          <DuncitButton size="small" startIcon={<AddPhotoAlternateIcon />} onClick={addDocument} disabled={locked}>{t('partners.ecommBrandPage.addDocument')}</DuncitButton>
        </Stack>
        {documents.length === 0 ? (
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>{t('partners.ecommBrandPage.brandRegistrationTrademarkGstCertificateEtc')}</Typography>
        ) : (
          <Stack spacing={1}>
            {documents.map((doc, index) => (
              <Stack key={doc.url} direction="row" spacing={1} sx={{
                alignItems: "center"
              }}>
                <TextField size="small" label={t('shell.common.type')} value={doc.type} disabled={locked} onChange={(e) => setValue('documents', documents.map((d, i) => (i === index ? { ...d, type: e.target.value } : d)))} sx={{ width: 160 }} />
                <Typography
                  variant="caption"
                  noWrap
                  sx={{
                    color: "text.secondary",
                    flex: 1,
                    minWidth: 0
                  }}>{doc.url}</Typography>
                {!locked && (
                  <DuncitIconButton size="small" onClick={() => setValue('documents', documents.filter((_, i) => i !== index))}><DeleteIcon fontSize="small" /></DuncitIconButton>
                )}
              </Stack>
            ))}
          </Stack>
        )}
      </Box>

      {!locked && (
        <>
          <Divider />
          <Stack direction="row" spacing={1.5} sx={{
            justifyContent: "flex-end"
          }}>
            <DuncitButton type="submit" variant="outlined" disabled={busy}>{t('partners.ecommBrandPage.saveDraft')}</DuncitButton>
            <DuncitButton type="button" variant="contained" endIcon={<SendIcon />} disabled={busy} onClick={handleSubmit(onSubmitForReview)}>
              Submit for review
            </DuncitButton>
          </Stack>
        </>
      )}
    </Stack>
  );
}

function MediaSlot({ label, url, disabled, onPick, onClear }: Readonly<{ label: string; url: string; disabled: boolean; onPick: () => void; onClear: () => void }>) {
  const { t } = useTranslation();
  return (
    <Box sx={{ flex: 1 }}>
      <Typography variant="caption" sx={{
        color: "text.secondary"
      }}>{label}</Typography>
      {url && <Box component="img" src={url} alt={label} sx={{ display: 'block', width: '100%', maxHeight: 140, objectFit: 'cover', borderRadius: 1, my: 0.5 }} />}
      <Stack direction="row" spacing={1}>
        <DuncitButton size="small" startIcon={<UploadFileIcon />} variant="outlined" onClick={onPick} disabled={disabled}>{url ? 'Change' : t('partners.becomeHostPage.upload')}</DuncitButton>
        {url && !disabled && <DuncitButton size="small" color="error" onClick={onClear}>{t('partners.ecommBrandPage.remove')}</DuncitButton>}
      </Stack>
    </Box>
  );
}
