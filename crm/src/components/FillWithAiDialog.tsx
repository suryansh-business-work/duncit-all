import { useState } from 'react';
import { gql, useMutation } from '@apollo/client';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { parseApiError } from '../utils/parseApiError';

const AI_PARSE_CRM_LEAD = gql`
  mutation AiParseCrmLead($entity: CrmAiEntity!, $text: String!) {
    aiParseCrmLead(entity: $entity, text: $text)
  }
`;

interface Props<T> {
  open: boolean;
  entity: 'VENUE_LEAD' | 'HOST_LEAD';
  title: string;
  onClose: () => void;
  onApply: (parsed: Partial<T>) => void;
}

/**
 * Generic Fill-with-AI dialog. The user pastes a free-form description
 * (a venue website, a brief, a WhatsApp message, etc.) and the server
 * returns structured JSON which the caller merges into its Formik state.
 */
export default function FillWithAiDialog<T>({ open, entity, title, onClose, onApply }: Props<T>) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [parseMut, { loading }] = useMutation<{ aiParseCrmLead: string }>(AI_PARSE_CRM_LEAD);

  const close = () => {
    setText('');
    setError(null);
    onClose();
  };

  const submit = async () => {
    setError(null);
    if (!text.trim()) {
      setError('Paste some text to parse first.');
      return;
    }
    try {
      const res = await parseMut({ variables: { entity, text } });
      const raw = res.data?.aiParseCrmLead;
      if (!raw) throw new Error('AI returned an empty response');
      let parsed: Partial<T> = {};
      try {
        parsed = JSON.parse(raw) as Partial<T>;
      } catch {
        throw new Error('AI returned invalid JSON. Try a more detailed description.');
      }
      onApply(parsed);
      close();
    } catch (err: any) {
      setError(parseApiError(err));
    }
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
      <DialogTitle>
        <Stack direction="row" spacing={1} alignItems="center">
          <AutoFixHighIcon color="secondary" />
          <span>{title}</span>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">
            Paste any free-form text — a venue brochure, a WhatsApp brief, an email reply, a
            host introduction — and we&apos;ll convert it into form fields. You can edit
            anything before saving the lead.
          </Typography>
          <TextField
            label="Paste text here"
            multiline
            minRows={8}
            maxRows={16}
            fullWidth
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              entity === 'VENUE_LEAD'
                ? 'e.g. Hi, our venue Banyan Tree in Indiranagar Bengaluru can host birthdays, baby showers and small weddings. Capacity 80, charges around 35,000 plus GST. Contact Rohan +91 9876543210.'
                : 'e.g. I run a Sunday community brunch club in Pune. Audience 30-50, monthly events, budget ₹15k-25k. Need venue + vendor. Reach me at host@example.com.'
            }
          />
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={loading}>Cancel</Button>
        <Button onClick={submit} variant="contained" disabled={loading} startIcon={<AutoFixHighIcon />}>
          {loading ? 'Parsing…' : 'Parse & fill'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
