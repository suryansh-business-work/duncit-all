import { Box, Dialog, DialogContent, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlined';
import { DuncitButton, DuncitRoundButton } from '@duncit/buttons';
import { useNavigate } from 'react-router';
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
    <Dialog open={faq !== null} onClose={onClose} fullWidth maxWidth="sm">
      {faq && (
        <DialogContent sx={{ p: 2.5 }}>
          <Stack
            direction="row"
            spacing={1}
            sx={{
              alignItems: "flex-start",
              justifyContent: "space-between"
            }}>
            <Typography variant="h6" sx={{ fontWeight: 600, pr: 1 }}>
              {faq.question}
            </Typography>
            <DuncitRoundButton tone="surface" onClick={onClose} aria-label={t('mweb.common.close')}>
              <CloseIcon />
            </DuncitRoundButton>
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
          <Box sx={{ mt: 2.5, p: 2, borderRadius: '18px', bgcolor: 'action.hover' }}>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontWeight: 600
              }}>
              Still need help?
            </Typography>
            <DuncitButton
              fullWidth
              variant="contained"
              size="large"
              startIcon={<ChatBubbleOutlineIcon />}
              onClick={() => {
                onClose();
                navigate('/live-chat');
              }}
              sx={{ mt: 1 }}
            >
              {t('mweb.common.startAConversation')}
            </DuncitButton>
          </Box>
        </DialogContent>
      )}
    </Dialog>
  );
}
