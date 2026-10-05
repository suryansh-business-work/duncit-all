import { Controller, useFieldArray, type UseFormReturn } from 'react-hook-form';
import { Alert, Box, FormHelperText, MenuItem, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import MediaPickerDialog from '../../../components/MediaPickerDialog';
import TaxIdField from './TaxIdField';
import TaxDocumentField from './TaxDocumentField';
import DocumentFileControl from './DocumentFileControl';
import { useDocumentPicker } from './useDocumentPicker';
import {
  taxDocTypesOf,
  type RegisterVenueMode,
  type RegisterVenueValues,
  type TaxToggle,
  type VenueRegistrationConfig,
} from '../register-venue';
import { useTranslation } from '@duncit/shell';

interface Props {
  form: UseFormReturn<RegisterVenueValues>;
  config: VenueRegistrationConfig;
  mode: RegisterVenueMode;
  /** How many documents the venue already had — in edit-approved mode those
   * rows are locked (append-only: new documents can be added, never removed). */
  lockedDocCount?: number;
}

/** Dynamic document list: each row pairs a document type with a PDF upload.
 * The GSTIN / PAN proof documents are not in that list — each is uploaded
 * beside its switch, and only while the switch is on. */
export default function DocumentsSection({ form, config, mode, lockedDocCount = 0 }: Readonly<Props>) {
  const { t } = useTranslation();
  const { control, setValue, watch, formState } = form;
  const { fields, append, remove } = useFieldArray({ control, name: 'documents' });
  const picker = useDocumentPicker(form, append);
  const documents = watch('documents');
  const listError = formState.errors.documents?.root?.message ?? formState.errors.documents?.message;
  const approvedEdit = mode === 'edit-approved';
  const isRowLocked = (index: number) => approvedEdit && index < lockedDocCount;
  const taxDocTypes = taxDocTypesOf(config);
  // A switched-on tax id adopts the first row of its document type; that row
  // renders beside the switch instead of in the list below.
  const taxRow = (toggle: TaxToggle) =>
    watch(toggle) && taxDocTypes[toggle] ? documents.findIndex((doc) => doc.type === taxDocTypes[toggle]) : -1;
  const taxRows = { has_gstin: taxRow('has_gstin'), has_pan: taxRow('has_pan') };
  // A type already given to one row is offered to no other, the tax-id types
  // never, and a new row starts on the first free type.
  const usedTypes = new Set([...documents.map((doc) => doc.type), taxDocTypes.has_gstin, taxDocTypes.has_pan]);
  const nextType = config.doc_types.find((type) => !usedTypes.has(type));
  const taxDocument = (toggle: TaxToggle) =>
    taxDocTypes[toggle] ? (
      <TaxDocumentField
        type={taxDocTypes[toggle]}
        url={documents[taxRows[toggle]]?.url ?? ''}
        locked={isRowLocked(taxRows[toggle])}
        error={formState.errors[toggle]?.message}
        onUpload={() => picker.open({ type: taxDocTypes[toggle], toggle })}
        onRemove={() => remove(taxRows[toggle])}
        testId={`register-venue-${toggle}-document`}
      />
    ) : null;
  // Switching a tax id off drops its (unverified) document with it.
  const dropTaxDocument = (toggle: TaxToggle) => () =>
    remove(documents.flatMap((doc, index) => (doc.type === taxDocTypes[toggle] && !isRowLocked(index) ? [index] : [])));

  return (
    <Stack spacing={2.5}>
      <TaxIdField
        form={form}
        toggleName="has_gstin"
        name="gstin"
        label="GSTIN"
        toggleLabel={t('partners.registerVenuePage.hasGstin')}
        toggleHint={t('partners.registerVenuePage.hasGstinHint')}
        hint="15-character GST number, e.g. 22ABCDE1234F1Z5"
        locked={approvedEdit}
        lockedHint="Locked after approval"
        onToggleOff={dropTaxDocument('has_gstin')}
      >
        {taxDocument('has_gstin')}
      </TaxIdField>
      <TaxIdField
        form={form}
        toggleName="has_pan"
        name="pan"
        label="PAN"
        toggleLabel={t('partners.registerVenuePage.hasPan')}
        toggleHint={t('partners.registerVenuePage.hasPanHint')}
        hint="10-character PAN, e.g. ABCDE1234F"
        locked={approvedEdit}
        lockedHint="Locked after approval"
        onToggleOff={dropTaxDocument('has_pan')}
      >
        {taxDocument('has_pan')}
      </TaxIdField>
      <Box>
        <Typography variant="subtitle2" sx={{
          fontWeight: 800
        }}>
          Documents{' '}
          <Typography
            component="span"
            variant="caption"
            sx={{
              color: "error.main",
              fontWeight: 800
            }}>
            (required)
          </Typography>
        </Typography>
        <Typography variant="caption" sx={{
          color: "text.secondary"
        }}>
          {approvedEdit
            ? 'Verified documents are locked — you can add new documents, not replace them. PDF only, max 50 MB.'
            : 'Upload at least one document with its type. PDF only, max 50 MB.'}
        </Typography>
      </Box>
      {typeof listError === 'string' && listError && <FormHelperText error>{listError}</FormHelperText>}
      {picker.duplicateAlert && (
        <Alert severity="error" onClose={picker.dismissDuplicate}>
          {picker.duplicateAlert}
        </Alert>
      )}
      {fields.map((row, index) => (index === taxRows.has_gstin || index === taxRows.has_pan) ? null : (
        <Stack key={row.id} spacing={0.5}>
          <Stack direction="row" spacing={1} sx={{
            alignItems: "flex-start"
          }}>
            <Controller
              name={`documents.${index}.type`}
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  select
                  label={t('partners.registerVenuePage.documentType')}
                  size="small"
                  disabled={isRowLocked(index)}
                  sx={{ minWidth: 180 }}
                  data-testid={`register-venue-document-type-${row.id}`}
                  error={Boolean(fieldState.error)}
                  helperText={fieldState.error?.message ?? (isRowLocked(index) ? 'Verified document' : ' ')}
                >
                  {config.doc_types.filter((type) => type === field.value || !usedTypes.has(type)).map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <DocumentFileControl
              url={documents[index]?.url ?? ''}
              locked={isRowLocked(index)}
              onUpload={() => picker.open(index)}
              onClear={() => {
                setValue(`documents.${index}.url`, '', { shouldDirty: true, shouldValidate: true });
                setValue(`documents.${index}.hash`, undefined, { shouldDirty: true });
              }}
              testId={`register-venue-document-${row.id}`}
            />
            {!isRowLocked(index) && (
              <DuncitIconButton size="small" aria-label={t('partners.registerVenuePage.removeDocument')} onClick={() => remove(index)}>
                <DeleteIcon />
              </DuncitIconButton>
            )}
          </Stack>
          {formState.errors.documents?.[index]?.url && (
            <FormHelperText error>{formState.errors.documents[index]?.url?.message}</FormHelperText>
          )}
        </Stack>
      ))}
      {nextType ? (
        <DuncitButton
          startIcon={<AddIcon />}
          onClick={() => append({ type: nextType, url: '' })}
          sx={{ alignSelf: 'flex-start' }}
          data-testid="register-venue-add-document"
        >
          {t('partners.ecommBrandPage.addDocument')}
        </DuncitButton>
      ) : (
        <FormHelperText data-testid="register-venue-all-document-types-added">
          {t('partners.registerVenuePage.allDocumentTypesAdded')}
        </FormHelperText>
      )}
      <MediaPickerDialog
        open={picker.isOpen}
        onClose={picker.close}
        onPicked={picker.onPicked}
        folder="/venues/docs"
        title={t('partners.registerVenuePage.uploadDocumentPdfMax50Mb')}
        accept="application/pdf"
        detectDuplicates
      />
    </Stack>
  );
}
