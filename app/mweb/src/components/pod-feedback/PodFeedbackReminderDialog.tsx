import { Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import {
  POD_FEEDBACK_REMINDER_OPTIONS,
  type PodFeedbackReminderChoice,
} from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  open: boolean;
  /** The pod being closed on — named in the body so the choice is unambiguous. */
  title: string;
  onChoose: (choice: PodFeedbackReminderChoice) => void;
}

/**
 * The second question, asked when a guest closes the rating prompt without
 * answering it: may we ask about this pod again?
 *
 * It exists because a dismiss that is only remembered in memory is a dismiss
 * that comes straight back on the next page load. Both answers are written to
 * the server — "next time" as a snooze, "never" as the end of it — so the
 * prompt behaves the same on this phone and the next one.
 *
 * The twin of the native app's sheet (rule 27): same two options in the same
 * order, from POD_FEEDBACK_REMINDER_OPTIONS, and the same words.
 */
export default function PodFeedbackReminderDialog({ open, title, onChoose }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700 }}>{t('mweb.podFeedback.remindTitle')}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('mweb.podFeedback.remindBody', { vars: { title } })}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Stack spacing={1} sx={{ width: '100%', p: 1 }}>
          {POD_FEEDBACK_REMINDER_OPTIONS.map((option) => (
            <DuncitButton
              key={option.choice}
              fullWidth
              variant={option.choice === 'LATER' ? 'contained' : 'outlined'}
              onClick={() => onChoose(option.choice)}
            >
              {t(option.labelKey)}
            </DuncitButton>
          ))}
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
