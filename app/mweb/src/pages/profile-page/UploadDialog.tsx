import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import {
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import MediaPickerDialog from '../../components/MediaPickerDialog';
import { CREATE_POST } from './queries';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export default function UploadDialog({ open, onClose, onSuccess, onError }: Readonly<Props>) {
  const { t } = useTranslation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [createPost] = useMutation<any>(CREATE_POST);

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
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          px: 2,
          py: 1
        }}>
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 700,
            flex: 1
          }}>
          New post
        </Typography>
        <DuncitIconButton onClick={close} disabled={busy}>
          <CloseIcon />
        </DuncitIconButton>
      </Stack>
      <Divider />
      <DialogContent>
        {imageUrl ? (
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
              label={t('mweb.profile.writeACaption')}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              multiline
              minRows={2}
              maxRows={6}
              helperText={`${caption.length}/2200`}
              slotProps={{
                htmlInput: { maxLength: 2200 }
              }}
            />
            <Stack direction="row" spacing={1} sx={{
              justifyContent: "flex-end"
            }}>
              <DuncitButton onClick={() => setPickerOpen(true)} disabled={busy}>
                Change photo
              </DuncitButton>
              <DuncitButton variant="contained" onClick={submit} disabled={busy}>
                {busy ? <CircularProgress size={20} /> : 'Share'}
              </DuncitButton>
            </Stack>
          </Stack>
        ) : (
          <Stack
            spacing={2}
            sx={{
              alignItems: "center",
              py: 4
            }}>
            <AddPhotoAlternateIcon sx={{ fontSize: 72, color: 'text.secondary' }} />
            <Typography variant="body1">{t('mweb.profile.pickAnImageToShare')}</Typography>
            <DuncitButton variant="contained" onClick={() => setPickerOpen(true)}>
              Choose image
            </DuncitButton>
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
              Upload from device or pick from Pexels — both go through ImageKit.
            </Typography>
          </Stack>
        )}
      </DialogContent>
      <MediaPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPicked={(url) => setImageUrl(url)}
        folder="/posts"
        surface="MWEB"
        title={t('mweb.profile.chooseImageForYourPost')}
      />
    </Dialog>
  );
}
