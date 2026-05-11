import { useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  ImageList,
  ImageListItem,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import MediaPickerDialog from '../../../components/MediaPickerDialog';

interface ImagesFieldProps {
  images: string[];
  coverUrl: string;
  onChange: (images: string[], cover: string) => void;
}

export default function ImagesField({ images, coverUrl, onChange }: ImagesFieldProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const handlePicked = (url: string) => {
    const next = Array.from(new Set([...images, url]));
    const cover = coverUrl || url;
    onChange(next, cover);
    setPickerOpen(false);
  };

  const remove = (url: string) => {
    const next = images.filter((u) => u !== url);
    const cover = coverUrl === url ? next[0] ?? '' : coverUrl;
    onChange(next, cover);
  };

  const makeCover = (url: string) => onChange(images, url);

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="subtitle2">Product images</Typography>
        <Button
          size="small"
          startIcon={<AddPhotoAlternateIcon />}
          onClick={() => setPickerOpen(true)}
        >
          Add image
        </Button>
      </Stack>
      {images.length === 0 ? (
        <Box
          sx={{
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 1,
            p: 3,
            textAlign: 'center',
          }}
        >
          <Typography variant="caption" color="text.secondary">
            No images yet — add product photos to make the listing richer.
          </Typography>
        </Box>
      ) : (
        <ImageList cols={4} rowHeight={120} gap={8}>
          {images.map((url) => {
            const isCover = url === coverUrl;
            return (
              <ImageListItem
                key={url}
                sx={{ position: 'relative', border: isCover ? 2 : 0, borderColor: 'primary.main', borderRadius: 1, overflow: 'hidden' }}
              >
                <Box
                  component="img"
                  src={url}
                  alt="product"
                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <Stack
                  direction="row"
                  spacing={0.5}
                  sx={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    bgcolor: 'rgba(0,0,0,0.55)',
                    borderRadius: 1,
                  }}
                >
                  <Tooltip title={isCover ? 'Cover image' : 'Set as cover'}>
                    <IconButton
                      size="small"
                      sx={{ color: 'white' }}
                      onClick={() => makeCover(url)}
                    >
                      {isCover ? <StarIcon fontSize="inherit" /> : <StarBorderIcon fontSize="inherit" />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Remove">
                    <IconButton size="small" sx={{ color: 'white' }} onClick={() => remove(url)}>
                      <DeleteOutlineIcon fontSize="inherit" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </ImageListItem>
            );
          })}
        </ImageList>
      )}
      <MediaPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        folder="/inventory"
        title="Upload product image"
        onPicked={handlePicked}
      />
    </Box>
  );
}
