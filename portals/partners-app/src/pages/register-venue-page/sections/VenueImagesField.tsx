import { useState } from 'react';
import { Box, Button, IconButton, Stack, Typography } from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import MediaPickerDialog from '../../../components/MediaPickerDialog';

interface Props {
  coverImageUrl: string;
  gallery: string[];
  disabled?: boolean;
  onCoverChange: (url: string) => void;
  onGalleryChange: (urls: string[]) => void;
}

/** Cover + gallery pickers with their upload dialogs, self-contained. */
export default function VenueImagesField({
  coverImageUrl,
  gallery,
  disabled,
  onCoverChange,
  onGalleryChange,
}: Readonly<Props>) {
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [galleryPickerOpen, setGalleryPickerOpen] = useState(false);

  return (
    <Stack spacing={2}>
      <Stack spacing={1}>
        <Typography variant="body2" color="text.secondary">
          Cover image
        </Typography>
        {coverImageUrl && (
          <Box
            sx={{
              width: '100%',
              aspectRatio: '16 / 9',
              borderRadius: 1,
              overflow: 'hidden',
              bgcolor: 'action.hover',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Box
              component="img"
              src={coverImageUrl}
              alt="Venue cover"
              sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
            />
          </Box>
        )}
        <Button
          startIcon={<UploadFileIcon />}
          variant="outlined"
          disabled={disabled}
          onClick={() => setCoverPickerOpen(true)}
        >
          {coverImageUrl ? 'Change cover image' : 'Upload cover image'}
        </Button>
      </Stack>
      <Stack spacing={1}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <Typography variant="body2" color="text.secondary">
            Other images
          </Typography>
          <Button
            size="small"
            startIcon={<AddPhotoAlternateIcon />}
            disabled={disabled}
            onClick={() => setGalleryPickerOpen(true)}
          >
            Add image
          </Button>
        </Stack>
        {gallery.length ? (
          <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 1fr))' }}>
            {gallery.map((url, index) => (
              <Box key={url} sx={{ position: 'relative', aspectRatio: '1 / 1' }}>
                <Box
                  component="img"
                  src={url}
                  alt="Venue gallery"
                  sx={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 1 }}
                />
                <IconButton
                  size="small"
                  disabled={disabled}
                  aria-label="Remove image"
                  onClick={() => onGalleryChange(gallery.filter((_url, itemIndex) => itemIndex !== index))}
                  sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'background.paper' }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography variant="caption" color="text.secondary">
            Add venue photos for the public venue page.
          </Typography>
        )}
      </Stack>
      <MediaPickerDialog
        open={coverPickerOpen}
        onClose={() => setCoverPickerOpen(false)}
        onPicked={(url) => {
          onCoverChange(url);
          setCoverPickerOpen(false);
        }}
        folder="/venues/cover"
        title="Upload cover image"
      />
      <MediaPickerDialog
        open={galleryPickerOpen}
        onClose={() => setGalleryPickerOpen(false)}
        onPicked={(url) => {
          onGalleryChange(Array.from(new Set([...gallery, url])));
          setGalleryPickerOpen(false);
        }}
        folder="/venues/gallery"
        title="Add venue image"
      />
    </Stack>
  );
}
