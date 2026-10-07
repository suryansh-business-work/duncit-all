import { Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';

interface Props {
  /** Accept / Decline here answer the request; on a slot they answer the slot. */
  acceptLabel: string;
  declineLabel: string;
  busy: boolean;
  onAnswer: (accept: boolean) => void;
  testId: string;
}

/** The receiver's pair of answers, decline first so the positive action closes the row. */
export default function RespondButtons({ acceptLabel, declineLabel, busy, onAnswer, testId }: Readonly<Props>) {
  return (
    <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }} data-testid={testId}>
      <DuncitButton
        variant="outlined"
        color="error"
        size="small"
        disabled={busy}
        onClick={() => onAnswer(false)}
        data-testid={`${testId}-decline`}
      >
        {declineLabel}
      </DuncitButton>
      <DuncitButton
        variant="contained"
        size="small"
        disabled={busy}
        onClick={() => onAnswer(true)}
        data-testid={`${testId}-accept`}
      >
        {acceptLabel}
      </DuncitButton>
    </Stack>
  );
}
