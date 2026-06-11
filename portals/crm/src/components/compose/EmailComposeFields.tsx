import { useEffect, useState } from 'react';
import { Stack, TextField } from '@mui/material';
import RichTextField from '../../forms/fields/RichTextField';
import type { EmailAsset } from '../../api/emailTemplates.gql';
import EmailContentSwitch, { type EmailContentType } from './EmailContentSwitch';
import TemplateBodyPicker, { type TemplateBody } from './TemplateBodyPicker';

export interface EmailPayload {
  subject: string;
  /** HTML body sent to the server (commsService emails it as HTML). */
  body: string;
  valid: boolean;
  /** Files to attach (Template mode forwards the template's attachments). */
  attachments: EmailAsset[];
}

interface Props {
  entity: 'VENUE_LEAD' | 'HOST_LEAD';
  leadName: string;
  leadEmail: string;
  /** Slug → value map from the lead, used to auto-fill template variables. */
  variableValues: Record<string, string>;
  defaultSubject: string;
  onChange: (payload: EmailPayload) => void;
}

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const textToHtml = (s: string) => escapeHtml(s).replace(/\r?\n/g, '<br/>');

/** Email body composer with a Template | Simple Text | Rich Text switch. */
export default function EmailComposeFields({ entity, leadName, leadEmail, variableValues, defaultSubject, onChange }: Readonly<Props>) {
  const [type, setType] = useState<EmailContentType>('text');
  const [subject, setSubject] = useState(defaultSubject);
  const [text, setText] = useState('');
  const [richHtml, setRichHtml] = useState('');
  const [template, setTemplate] = useState<TemplateBody>({ subject: '', html: '', ready: false, attachments: [] });

  useEffect(() => setSubject(defaultSubject), [defaultSubject]);

  useEffect(() => {
    if (type === 'template') {
      onChange({ subject: template.subject || defaultSubject, body: template.html, valid: template.ready, attachments: template.attachments });
    } else if (type === 'rich') {
      onChange({ subject, body: richHtml, valid: !!subject.trim() && !!richHtml.trim(), attachments: [] });
    } else {
      onChange({ subject, body: textToHtml(text), valid: !!subject.trim() && !!text.trim(), attachments: [] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, subject, text, richHtml, template, defaultSubject]);

  return (
    <Stack spacing={1.5}>
      <EmailContentSwitch value={type} onChange={setType} />

      {type !== 'template' && (
        <TextField size="small" label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} fullWidth />
      )}

      {type === 'template' && (
        <TemplateBodyPicker entity={entity} variableValues={variableValues} leadName={leadName} leadEmail={leadEmail} onChange={setTemplate} />
      )}
      {type === 'text' && (
        <TextField size="small" label="Message" value={text} onChange={(e) => setText(e.target.value)} fullWidth multiline minRows={4} />
      )}
      {type === 'rich' && (
        <RichTextField value={richHtml} onChange={({ html }) => setRichHtml(html)} placeholder="Write your email…" />
      )}
    </Stack>
  );
}
