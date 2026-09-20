import { Stack, TextField, Typography } from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import DeleteIcon from '@mui/icons-material/Delete';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { BrandStepProps } from './step-types';

const DEFAULT_DOCUMENT_TYPE = 'DOCUMENT';

interface Props extends BrandStepProps {
  onPickImage: () => Promise<string | null>;
}

/** Step 7 — registration, trademark, GST certificate: at least one document for review. */
export default function DocumentsStep({ watch, setValue, locked, onPickImage }: Readonly<Props>) {
  const { t } = useTranslation();
  const documents = watch('documents');

  const add = async () => {
    const url = await onPickImage();
    if (url) setValue('documents', [...documents, { type: DEFAULT_DOCUMENT_TYPE, url }], { shouldDirty: true, shouldValidate: true });
  };
  const rename = (index: number, type: string) =>
    setValue(
      'documents',
      documents.map((doc, i) => (i === index ? { ...doc, type } : doc)),
      { shouldDirty: true },
    );
  const remove = (index: number) =>
    setValue(
      'documents',
      documents.filter((_, i) => i !== index),
      { shouldDirty: true },
    );

  return (
    <Stack spacing={2}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('partners.brandWizard.documents.intro')}
      </Typography>
      {documents.length === 0 ? (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('partners.brandWizard.documents.empty')}
        </Typography>
      ) : (
        <Stack spacing={1.5} data-testid="brand-wizard-document-list">
          {documents.map((doc, index) => (
            <Stack key={doc.url} direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
              <TextField
                size="small"
                label={t('partners.brandWizard.documents.typeLabel')}
                helperText={t('partners.brandWizard.documents.typeHint')}
                value={doc.type}
                disabled={locked}
                onChange={(event) => rename(index, event.target.value)}
                sx={{ width: 220 }}
              />
              <Typography variant="caption" noWrap sx={{ color: 'text.secondary', flex: 1, minWidth: 0, pt: 1.25 }}>
                {doc.url}
              </Typography>
              {!locked && (
                <DuncitIconButton
                  size="small"
                  aria-label={t('partners.registerVenuePage.removeDocument')}
                  onClick={() => remove(index)}
                  data-testid="brand-wizard-document-remove"
                >
                  <DeleteIcon fontSize="small" />
                </DuncitIconButton>
              )}
            </Stack>
          ))}
        </Stack>
      )}
      <DuncitButton
        size="small"
        variant="outlined"
        startIcon={<AddPhotoAlternateIcon />}
        onClick={add}
        disabled={locked}
        sx={{ alignSelf: 'flex-start' }}
        data-testid="brand-wizard-document-add"
      >
        {t('partners.ecommBrandPage.addDocument')}
      </DuncitButton>
    </Stack>
  );
}
