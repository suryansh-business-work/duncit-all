import { Dialog, DialogContent, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlined';
import { DuncitButton, DuncitRoundButton } from '@duncit/buttons';
import { useNavigate } from 'react-router';
import { useTranslation } from '../../i18n/useTranslation';

interface StillNeedHelpDialogProps {
  open: boolean;
  onClose: () => void;
}

/** Opened by an FAQ's "Not really": points the member at the live support
 * chat. RN twin: the native app's `StillNeedHelpDialog`. */
export default function StillNeedHelpDialog({ open, onClose }: Readonly<StillNeedHelpDialogProps>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const startChat = () => {
    onClose();
    navigate('/live-chat');
  };

  return (
    <Dialog
      data-testid="faqs-still-need-help"
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      aria-labelledby="faqs-still-need-help-title"
      aria-describedby="faqs-still-need-help-body"
    >
      <DialogContent sx={{ p: 2.5 }}>
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Typography
            id="faqs-still-need-help-title"
            data-testid="faqs-still-need-help-title"
            variant="h6"
            component="h2"
            sx={{ fontWeight: 600 }}
          >
            {t('mweb.faqsPage.stillNeedHelp')}
          </Typography>
          <DuncitRoundButton
            data-testid="faqs-still-need-help-close"
            tone="surface"
            onClick={onClose}
            aria-label={t('mweb.common.close')}
          >
            <CloseIcon />
          </DuncitRoundButton>
        </Stack>
        <Typography
          id="faqs-still-need-help-body"
          data-testid="faqs-still-need-help-body"
          variant="body2"
          sx={{ color: 'text.secondary', mt: 1.5 }}
        >
          {t('mweb.faqsPage.stillNeedHelpBody')}
        </Typography>
        <DuncitButton
          data-testid="faqs-still-need-help-chat"
          fullWidth
          variant="contained"
          size="large"
          startIcon={<ChatBubbleOutlineIcon />}
          onClick={startChat}
          sx={{ mt: 2.5 }}
        >
          {t('mweb.common.chatWithUs')}
        </DuncitButton>
      </DialogContent>
    </Dialog>
  );
}
