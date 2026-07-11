import { Box, Button, Dialog, DialogContent, IconButton, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import { useNavigate } from 'react-router-dom';
import type { FaqItem } from './faqQueries';

interface FaqAnswerDialogProps {
  faq: FaqItem | null;
  onClose: () => void;
}

/** Shows a single FAQ's answer with a "still need help" conversation CTA. */
export default function FaqAnswerDialog({ faq, onClose }: Readonly<FaqAnswerDialogProps>) {
  const navigate = useNavigate();
  return (
    <Dialog open={faq !== null} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 4 } }}>
      {faq && (
        <DialogContent sx={{ p: 2.5 }}>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
            <Typography variant="h6" sx={{ fontWeight: 950, pr: 1 }}>
              {faq.question}
            </Typography>
            <IconButton size="small" onClick={onClose} sx={{ bgcolor: 'action.hover' }} aria-label="Close">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', mt: 1.5 }}>
            {faq.answer}
          </Typography>
          <Box sx={{ mt: 2.5, p: 1.5, borderRadius: 3, bgcolor: 'rgba(255,79,115,0.08)' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              Still need help?
            </Typography>
            <Button
              fullWidth
              variant="contained"
              startIcon={<ChatBubbleOutlineIcon />}
              onClick={() => {
                onClose();
                navigate('/live-chat');
              }}
              sx={{ mt: 1, borderRadius: 999, fontWeight: 900 }}
            >
              Start a conversation
            </Button>
          </Box>
        </DialogContent>
      )}
    </Dialog>
  );
}
