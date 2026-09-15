import { Chip, Stack } from '@mui/material';
import ThumbUpAltRoundedIcon from '@mui/icons-material/ThumbUpAltRounded';
import { useTranslation } from '../../i18n/useTranslation';

interface FaqFeedbackProps {
  faqId: string;
  helpful: boolean;
  onToggleHelpful: (faqId: string) => void;
  onNotHelpful: () => void;
}

/** The Helpful / Not really row under an FAQ answer. Helpful shows a thumbs-up
 * on that FAQ; Not really asks the page to open the still-need-help dialog.
 * RN twin: the native app's `FaqFeedback`. */
export default function FaqFeedback({
  faqId,
  helpful,
  onToggleHelpful,
  onNotHelpful,
}: Readonly<FaqFeedbackProps>) {
  const { t } = useTranslation();
  const thumb = helpful ? (
    <ThumbUpAltRoundedIcon
      data-testid={`faq-${faqId}-helpful-mark`}
      titleAccess={t('mweb.faqsPage.markedHelpful')}
    />
  ) : undefined;

  return (
    <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
      <Chip
        data-testid={`faq-${faqId}-helpful`}
        label={t('mweb.faqsPage.helpful')}
        icon={thumb}
        color={helpful ? 'primary' : 'default'}
        aria-pressed={helpful}
        onClick={() => onToggleHelpful(faqId)}
      />
      <Chip
        data-testid={`faq-${faqId}-not-helpful`}
        label={t('mweb.faqsPage.notReally')}
        onClick={onNotHelpful}
      />
    </Stack>
  );
}
