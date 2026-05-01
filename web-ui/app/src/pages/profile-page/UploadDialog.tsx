import { useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import CloseIcon from '@mui/icons-material/Close';
import MediaPickerDialog from '../../components/MediaPickerDialog';
import { CREATE_POST } from './queries';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export default function UploadDialog({ open, onClose, onSuccess, onError }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [createPost] = useMutation(CREATE_POST);

  const reset = () => {
    setImageUrl(null);
    setCaption('');
    setBusy(false);
  };
  const close = () => {
    if (busy) return;
    reset();
    onClose();
  };

  const submit = async () => {
    if (!imageUrl) return;
    setBusy(true);
    try {
      await createPost({ variables: { input: { image_url: imageUrl, caption } } });
      reset();
      onSuccess('Post shared.');
    } catch (e: any) {
      onError(e?.message ?? 'Could not share post');
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
      <Stack direction="row" alignItems="center" sx={{ px: 2, py: 1 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}>
          New post
        </Typography>
        <IconButton onClick={close} disabled={busy}>
          <CloseIcon />
        </IconButton>
      </Stack>
      <Divider />
      <DialogContent>
        {!imageUrl ? (
          <Stack alignItems="center" spacing={2} sx={{ py: 4 }}>
            <AddPhotoAlternateIcon sx={{ fontSize: 72, color: 'text.secondary' }} />
            <Typography variant="body1">Pick an image to share.</Typography>
            <Button variant="contained" onClick={() => setPickerOpen(true)}>
              Choose image
            </Button>
            <Typography variant="caption" color="text.secondary">
              Upload from device or pick from Pexels — both go through ImageKit.
            </Typography>
          </Stack>
        ) : (
          <Stack spacing={2}>
            <Box
              component="img"
              src={imageUrl}
              alt="preview"
              sx={{
                width: '100%',
                maxHeight: 420,
                objectFit: 'contain',
                bgcolor: 'common.black',
                borderRadius: 1,
              }}
            />
            <TextField
              label="Write a caption…"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              multiline
              minRows={2}
              maxRows={6}
              inputProps={{ maxLength: 2200 }}
              helperText={`${caption.length}/2200`}
            />
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button onClick={() => setPickerOpen(true)} disabled={busy}>
                Change photo
              </Button>
              <Button variant="contained" onClick={submit} disabled={busy}>
                {busy ? <CircularProgress size={20} /> : 'Share'}
              </Button>
            </Stack>
          </Stack>
        )}
      </DialogContent>
      <MediaPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPicked={(url) => setImageUrl(url)}
        folder="/posts"
        title="Choose image for your post"
      />
    </Dialog>
  );
}
