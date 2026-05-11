import { useState } from 'react';
import { Avatar, Button, Stack, Typography } from '@mui/material';
import PetsIcon from '@mui/icons-material/Pets';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import MediaPickerDialog from '../../../components/MediaPickerDialog';

interface PetPhotoFieldProps {
  value: string;
  error?: string;
  touched?: boolean;
  onChange: (url: string) => void;
}

export default function PetPhotoField({ value, error, touched, onChange }: PetPhotoFieldProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <>
      <Stack direction="row" spacing={2} alignItems="center">
        <Avatar
          src={value || undefined}
          imgProps={{
            loading: 'lazy',
            referrerPolicy: 'no-referrer',
            onError: (e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            },
          }}
          sx={{
            width: 72,
            height: 72,
            bgcolor: 'primary.light',
            '& img': { objectFit: 'cover' },
          }}
        >
          <PetsIcon />
        </Avatar>
        <Stack spacing={0.5} sx={{ flex: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<PhotoCameraIcon />}
            onClick={() => setPickerOpen(true)}
            sx={{ alignSelf: 'flex-start' }}
          >
            {value ? 'Change photo' : 'Upload photo'}
          </Button>
          {value && (
            <Button
              size="small"
              color="inherit"
              onClick={() => onChange('')}
              sx={{ alignSelf: 'flex-start' }}
            >
              Remove
            </Button>
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
        title="Upload pet photo"
        onPicked={(url) => onChange(url)}
      />
    </>
  );
}
