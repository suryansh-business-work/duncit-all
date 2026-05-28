import { useState } from 'react';
import { Button, Snackbar, Stack, Tooltip } from '@mui/material';
import PhoneIcon from '@mui/icons-material/Phone';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import EmailIcon from '@mui/icons-material/Email';
import VobizContactDialog from './VobizContactDialog';

interface Props {
  entity: 'VENUE_LEAD' | 'HOST_LEAD';
  leadId: string;
  displayName: string;
  email?: string | null;
  mobile?: string | null;
  whatsapp?: string | null;
}

/**
 * Quick Call / WhatsApp / Email actions for a lead, rendered beneath the
 * detail-page title. Call & Email open the Vobiz contact dialog (which logs
 * the communication); WhatsApp deep-links to wa.me. Buttons disable when the
 * underlying contact detail is missing so users never hit a dead action.
 */
export default function LeadContactActions({ entity, leadId, displayName, email, mobile, whatsapp }: Props) {
  const [mode, setMode] = useState<'email' | 'call' | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const waNumber = (whatsapp || mobile || '').replace(/[^0-9]/g, '');

  return (
    <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap data-testid="lead-contact-actions">
      <Tooltip title={mobile ? `Call ${mobile}` : 'No phone number on file'}>
        <span>
          <Button size="small" variant="outlined" startIcon={<PhoneIcon />} disabled={!mobile} onClick={() => setMode('call')}>
            Call
          </Button>
        </span>
      </Tooltip>
      <Tooltip title={waNumber ? 'Open WhatsApp chat' : 'No WhatsApp number on file'}>
        <span>
          <Button
            size="small"
            variant="outlined"
            startIcon={<WhatsAppIcon />}
            disabled={!waNumber}
            onClick={() => window.open(`https://wa.me/${waNumber}`, '_blank', 'noopener,noreferrer')}
          >
            WhatsApp
          </Button>
        </span>
      </Tooltip>
      <Tooltip title={email ? `Email ${email}` : 'No email on file'}>
        <span>
          <Button size="small" variant="outlined" startIcon={<EmailIcon />} disabled={!email} onClick={() => setMode('email')}>
            Email
          </Button>
        </span>
      </Tooltip>

      <VobizContactDialog
        open={mode !== null}
        mode={mode ?? 'email'}
        entity={entity}
        lead={{ id: leadId, display_name: displayName, primary_email: email, primary_mobile: mobile }}
        onClose={() => setMode(null)}
        onResult={(message) => setToast(message)}
      />
      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} message={toast ?? ''} />
    </Stack>
  );
}
