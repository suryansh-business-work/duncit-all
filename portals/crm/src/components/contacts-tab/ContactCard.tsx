import { Box, Card, Chip, Stack, Tooltip, Typography } from '@mui/material';
import PhoneIcon from '@mui/icons-material/Phone';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import EmailIcon from '@mui/icons-material/Email';
import { DuncitIconButton } from '@duncit/buttons';
import type { CrmContact } from '../../api/crm.types';
import { useTranslation } from '@duncit/shell';

interface Props {
  contact: CrmContact;
  index: number;
  onCall: (contact: CrmContact) => void;
  onEmail: (contact: CrmContact) => void;
}

const Row = ({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) => (
  <Stack direction="row" spacing={1} sx={{
    alignItems: "center"
  }}>
    {icon}
    {children}
  </Stack>
);

/** One contact card with Call / WhatsApp / Email actions (call & email open the compose window). */
export default function ContactCard({ contact, index, onCall, onEmail }: Readonly<Props>) {
  const { t } = useTranslation();
  const waNumber = (contact.whatsapp_number || '').replace(/\D/g, '');
  return (
    <Card variant="outlined" sx={{ p: 1.5 }}>
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          mb: 0.75
        }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" noWrap sx={{
            fontWeight: 700
          }}>
            {contact.name || (index === 0 ? 'Primary contact' : `Contact ${index + 1}`)}
          </Typography>
          {contact.role && (
            <Typography variant="caption" noWrap sx={{
              color: "text.secondary"
            }}>
              {contact.role}
            </Typography>
          )}
        </Box>
        {index === 0 && <Chip label={t('crm.components.primary')} size="small" color="primary" />}
      </Stack>
      <Stack spacing={0.5}>
        {contact.mobile_number && (
          <Row icon={<PhoneIcon fontSize="small" color="action" />}>
            <Tooltip title={t('crm.components.callOpensComposeWindow')}>
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
            <Tooltip title={t('crm.components.emailOpensComposeWindow')}>
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
            <DuncitIconButton size="small" color="primary" disabled={!contact.mobile_number} onClick={() => onCall(contact)} aria-label={t('crm.components.callContact')}>
              <PhoneIcon fontSize="small" />
            </DuncitIconButton>
          </span>
        </Tooltip>
        <Tooltip title={contact.email ? 'Email' : 'No email'}>
          <span>
            <DuncitIconButton size="small" color="primary" disabled={!contact.email} onClick={() => onEmail(contact)} aria-label={t('crm.components.emailContact')}>
              <EmailIcon fontSize="small" />
            </DuncitIconButton>
          </span>
        </Tooltip>
      </Stack>
    </Card>
  );
}
