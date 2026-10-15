import { useState } from 'react';
import { Link, Stack } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useTranslation } from '@duncit/app-settings';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { MediaPickerDialog, type UploadSurface } from '@duncit/media-picker';

/** Licence documents sit with the venue's other papers. */
const LICENCE_FOLDER = '/venues/docs';

interface Props {
  /** The document's name, already translated ("FSSAI licence"). */
  name: string;
  value: string;
  onChange: (url: string) => void;
  venueId?: string;
  surface: UploadSurface;
  testId: string;
}

/** One optional licence document: upload (PDF or photo), view, remove. */
export default function LicenceDocumentField({ name, value, onChange, venueId, surface, testId }: Readonly<Props>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }} data-testid={testId}>
      {value ? (
        <>
          <Link href={value} target="_blank" rel="noopener noreferrer" data-testid={`${testId}-view`}>
            {t('venueFoodOwner.licences.documentView', { vars: { name } })}
          </Link>
          <DuncitIconButton
            size="small"
            aria-label={t('venueFoodOwner.licences.documentRemove', { vars: { name } })}
            onClick={() => onChange('')}
          >
            <DeleteIcon fontSize="small" />
          </DuncitIconButton>
        </>
      ) : (
        <DuncitButton size="small" startIcon={<UploadFileIcon />} onClick={() => setOpen(true)} data-testid={`${testId}-upload`}>
          {t('venueFoodOwner.licences.documentAdd', { vars: { name } })}
        </DuncitButton>
      )}
      <MediaPickerDialog
        open={open}
        onClose={() => setOpen(false)}
        onPicked={(url) => {
          onChange(url);
          setOpen(false);
        }}
        folder={LICENCE_FOLDER}
        entityId={venueId}
        surface={surface}
        accept="application/pdf,image/*"
        title={t('venueFoodOwner.licences.uploadTitle')}
      />
    </Stack>
  );
}
