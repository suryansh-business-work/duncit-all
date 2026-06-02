import { Box, Card, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import PhoneIcon from '@mui/icons-material/Phone';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import EmailIcon from '@mui/icons-material/Email';
import type { CrmContact } from '../../api/crm.types';

interface Props {
  contact: CrmContact;
  index: number;
  onCall: (contact: CrmContact) => void;
  onEmail: (contact: CrmContact) => void;
}

const Row = ({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) => (
  <Stack direction="row" spacing={1} alignItems="center">
    {icon}
    {children}
  </Stack>
);

/** One contact card with Call / WhatsApp / Email actions (call & email open the compose window). */
export default function ContactCard({ contact, index, onCall, onEmail }: Props) {
  const waNumber = (contact.whatsapp_number || '').replace(/[^0-9]/g, '');
  return (
    <Card variant="outlined" sx={{ p: 1.5 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ mb: 0.75 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" fontWeight={700} noWrap>
            {contact.name || (index === 0 ? 'Primary contact' : `Contact ${index + 1}`)}
          </Typography>
          {contact.role && (
            <Typography variant="caption" color="text.secondary" noWrap>
              {contact.role}
            </Typography>
          )}
        </Box>
        {index === 0 && <Chip label="Primary" size="small" color="primary" />}
      </Stack>
      <Stack spacing={0.5}>
        {contact.mobile_number && (
          <Row icon={<PhoneIcon fontSize="small" color="action" />}>
            <Tooltip title="Call (opens compose window)">
              <Typography
                component="button"
                type="button"
                onClick={() => onCall(contact)}
                variant="body2"
                sx={{ p: 0, border: 0, bgcolor: 'transparent', cursor: 'pointer', color: 'primary.main', textAlign: 'left' }}
              >
                {contact.mobile_number}
              </Typography>
            </Tooltip>
          </Row>
        )}
        {contact.whatsapp_number && (
          <Row icon={<WhatsAppIcon fontSize="small" sx={{ color: '#25D366' }} />}>
            <Typography
              component="a"
              href={`https://wa.me/${waNumber}`}
              target="_blank"
              rel="noreferrer noopener"
              variant="body2"
              sx={{ color: 'text.primary', textDecoration: 'none' }}
            >
              {contact.whatsapp_number}
            </Typography>
          </Row>
        )}
        {contact.email && (
          <Row icon={<EmailIcon fontSize="small" color="action" />}>
            <Tooltip title="Email (opens compose window)">
              <Typography
                component="button"
                type="button"
                onClick={() => onEmail(contact)}
                variant="body2"
                sx={{ p: 0, border: 0, bgcolor: 'transparent', cursor: 'pointer', color: 'primary.main', textAlign: 'left', wordBreak: 'break-all' }}
              >
                {contact.email}
              </Typography>
            </Tooltip>
          </Row>
        )}
      </Stack>
      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
        <Tooltip title={contact.mobile_number ? 'Call' : 'No number'}>
          <span>
            <IconButton size="small" color="primary" disabled={!contact.mobile_number} onClick={() => onCall(contact)} aria-label="call contact">
              <PhoneIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={contact.email ? 'Email' : 'No email'}>
          <span>
            <IconButton size="small" color="primary" disabled={!contact.email} onClick={() => onEmail(contact)} aria-label="email contact">
              <EmailIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    </Card>
  );
}
