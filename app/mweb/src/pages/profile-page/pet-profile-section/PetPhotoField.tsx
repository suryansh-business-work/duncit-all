import { useState } from 'react';
import { Avatar, Stack, Typography } from '@mui/material';
import PetsIcon from '@mui/icons-material/Pets';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { DuncitButton } from '@duncit/buttons';
import MediaPickerDialog from '../../../components/MediaPickerDialog';
import { useTranslation } from '../../../i18n/useTranslation';

interface PetPhotoFieldProps {
  value: string;
  error?: string;
  touched?: boolean;
  onChange: (url: string) => void;
}

export default function PetPhotoField({ value, error, touched, onChange }: Readonly<PetPhotoFieldProps>) {
  const { t } = useTranslation();
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <>
      <Stack direction="row" spacing={2} sx={{
        alignItems: "center"
      }}>
        <Avatar
          src={value || undefined}
          sx={{
            width: 72,
            height: 72,
            bgcolor: 'primary.light',
            '& img': { objectFit: 'cover' },
          }}
          slotProps={{
            img: {
              loading: 'lazy',
              referrerPolicy: 'no-referrer',
              onError: (e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              },
            }
          }}
        >
          <PetsIcon />
        </Avatar>
        <Stack spacing={0.5} sx={{ flex: 1 }}>
          <DuncitButton
            variant="outlined"
            size="small"
            startIcon={<PhotoCameraIcon />}
            onClick={() => setPickerOpen(true)}
            sx={{ alignSelf: 'flex-start' }}
          >
            {value ? 'Change photo' : 'Upload photo'}
          </DuncitButton>
          {value && (
            <DuncitButton
              size="small"
              color="inherit"
              onClick={() => onChange('')}
              sx={{ alignSelf: 'flex-start' }}
            >
              Remove
            </DuncitButton>
          )}
          {touched && error && (
            <Typography variant="caption" color="error">
              {error}
            </Typography>
          )}
        </Stack>
      </Stack>
      <MediaPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        folder="/pets"
        title={t('mweb.profile.uploadPetPhoto')}
        onPicked={(url) => onChange(url)}
      />
    </>
  );
}
