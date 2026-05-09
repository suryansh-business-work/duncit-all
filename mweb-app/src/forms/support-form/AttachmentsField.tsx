import { useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';
import MediaPickerDialog from '../../components/MediaPickerDialog';

interface Props {
  attachments: string[];
  setAttachments: (next: string[]) => void;
}

export default function AttachmentsField({ attachments, setAttachments }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
          Attach screenshots ({attachments.length}/5)
        </Typography>
        <Button
          size="small"
          startIcon={<AttachFileIcon />}
          disabled={attachments.length >= 5}
          onClick={() => setPickerOpen(true)}
          sx={{ minHeight: 40 }}
        >
          Add image
        </Button>
      </Stack>
      {attachments.length > 0 && (
        <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 1 }}>
          {attachments.map((url, i) => (
            <Box key={url + i} sx={{ position: 'relative', width: 72, height: 72 }}>
              <Avatar
                variant="rounded"
                src={url}
                sx={{ width: 72, height: 72, '& img': { objectFit: 'cover' } }}
              />
              <IconButton
                size="small"
                aria-label="Remove attachment"
                onClick={() => setAttachments(attachments.filter((_, j) => j !== i))}
                sx={{
                  position: 'absolute',
                  top: -8,
                  right: -8,
                  bgcolor: 'background.paper',
                  border: 1,
                  borderColor: 'divider',
                  width: 24,
                  height: 24,
                }}
              >
                <CloseIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Box>
          ))}
        </Stack>
      )}
      <MediaPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        folder="/support"
        title="Attach screenshot"
        onPicked={(url) => setAttachments([...attachments, url].slice(0, 5))}
      />
    </Box>
  );
}
