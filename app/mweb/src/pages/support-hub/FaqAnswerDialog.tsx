import { Box, Button, Dialog, DialogContent, IconButton, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlined';
import { useNavigate } from 'react-router-dom';
import type { FaqItem } from './faqQueries';
import { useTranslation } from '../../i18n/useTranslation';

interface FaqAnswerDialogProps {
  faq: FaqItem | null;
  onClose: () => void;
}

/** Shows a single FAQ's answer with a "still need help" conversation CTA. */
export default function FaqAnswerDialog({ faq, onClose }: Readonly<FaqAnswerDialogProps>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <Dialog open={faq !== null} onClose={onClose} fullWidth maxWidth="sm" slotProps={{
      paper: { sx: { borderRadius: '16px' } }
    }}>
      {faq && (
        <DialogContent sx={{ p: 2.5 }}>
          <Stack
            direction="row"
            spacing={1}
            sx={{
              alignItems: "flex-start",
              justifyContent: "space-between"
            }}>
            <Typography variant="h6" sx={{ fontWeight: 700, pr: 1 }}>
              {faq.question}
            </Typography>
            <IconButton size="small" onClick={onClose} sx={{ bgcolor: 'action.hover' }} aria-label={t('mweb.common.close')}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              whiteSpace: 'pre-wrap',
              mt: 1.5
            }}>
            {faq.answer}
          </Typography>
          <Box sx={{ mt: 2.5, p: 1.5, borderRadius: '16px', bgcolor: 'rgba(255,79,115,0.08)' }}>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontWeight: 700
              }}>
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
              sx={{ mt: 1, borderRadius: 999, fontWeight: 700 }}
            >
              Start a conversation
            </Button>
          </Box>
        </DialogContent>
      )}
    </Dialog>
  );
}
