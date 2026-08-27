import { useRef, useState } from 'react';
import {
  ButtonGroup,
  ClickAwayListener,
  Grow,
  MenuItem,
  MenuList,
  Paper,
  Popper,
  Snackbar,
  Stack,
  Tooltip,
} from '@mui/material';
import PhoneIcon from '@mui/icons-material/Phone';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import EmailIcon from '@mui/icons-material/Email';
import { DuncitButton } from '@duncit/buttons';
import ContactComposeDialog from './ContactComposeDialog';
import { PortalCallDialog, AiCallDialog } from './call';
import { useTranslation } from '@duncit/shell';

interface Props {
  entity: 'VENUE_LEAD' | 'HOST_LEAD';
  leadId: string;
  displayName: string;
  email?: string | null;
  mobile?: string | null;
  whatsapp?: string | null;
  /** Slug → value map from the full lead for email-template auto-fill. */
  variableValues?: Record<string, string>;
}

// Compact, uniform-height action buttons (fixes the split-button height drift).
const CALL_HEIGHT = 34;
const BTN_SX = { textTransform: 'none', height: CALL_HEIGHT, minHeight: CALL_HEIGHT } as const;

/**
 * Quick contact actions beneath the lead title. The Call action is a split
 * button: the primary action places a portal call (Twilio bridges the agent's
 * phone to the customer); the dropdown offers "AI Call" (Servam agent + a
 * Static Content prompt + Servam voice). WhatsApp deep-links; Email opens the
 * compose/log window. Buttons disable when the contact detail is missing.
 */
export default function LeadContactActions({ entity, leadId, displayName, email, mobile, whatsapp, variableValues }: Readonly<Props>) {
  const { t } = useTranslation();
  const [emailOpen, setEmailOpen] = useState(false);
  const [portalOpen, setPortalOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const waNumber = (whatsapp || mobile || '').replace(/\D/g, '');

  const callLead = mobile
    ? { to: mobile, entityType: entity, entityId: leadId, displayName, contactName: displayName }
    : null;

  return (
    <Stack
      direction="row"
      spacing={1}
      useFlexGap
      data-testid="lead-contact-actions"
      sx={{
        alignItems: "center",
        flexWrap: "wrap",
        mt: 1.5
      }}>
      <Tooltip title={mobile ? `Call ${mobile}` : 'No phone number on file'}>
        <span>
          <ButtonGroup variant="outlined" size="small" ref={anchorRef} disabled={!mobile} aria-label={t('crm.components.callOptions')} sx={{ height: CALL_HEIGHT }}>
            <DuncitButton startIcon={<PhoneIcon />} onClick={() => setPortalOpen(true)} sx={BTN_SX}>
              Call
            </DuncitButton>
            <DuncitButton size="small" onClick={() => setMenuOpen((v) => !v)} aria-label={t('crm.components.moreOptions')} sx={{ px: 0.5, height: CALL_HEIGHT, minHeight: CALL_HEIGHT }}>
              <ArrowDropDownIcon fontSize="small" />
            </DuncitButton>
          </ButtonGroup>
        </span>
      </Tooltip>
      <Popper open={menuOpen} anchorEl={anchorRef.current} transition placement="bottom-start" sx={{ zIndex: 1300 }}>
        {({ TransitionProps }) => (
          <Grow {...TransitionProps}>
            <Paper elevation={3}>
              <ClickAwayListener onClickAway={() => setMenuOpen(false)}>
                <MenuList autoFocusItem={menuOpen} dense>
                  <MenuItem onClick={() => { setMenuOpen(false); setPortalOpen(true); }}>
                    <PhoneIcon fontSize="small" sx={{ mr: 1 }} /> Call
                  </MenuItem>
                  <MenuItem onClick={() => { setMenuOpen(false); setAiOpen(true); }}>
                    <SmartToyIcon fontSize="small" sx={{ mr: 1 }} /> AI Call
                  </MenuItem>
                </MenuList>
              </ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>

      <Tooltip title={waNumber ? 'Open WhatsApp chat' : 'No WhatsApp number on file'}>
        <span>
          <DuncitButton
            size="small"
            variant="outlined"
            startIcon={<WhatsAppIcon />}
            disabled={!waNumber}
            onClick={() => window.open(`https://wa.me/${waNumber}`, '_blank', 'noopener,noreferrer')}
            sx={BTN_SX}
          >
            WhatsApp
          </DuncitButton>
        </span>
      </Tooltip>
      <Tooltip title={email ? `Email ${email}` : 'No email on file'}>
        <span>
          <DuncitButton size="small" variant="outlined" startIcon={<EmailIcon />} disabled={!email} onClick={() => setEmailOpen(true)} sx={BTN_SX}>
            {t('shell.common.email')}
          </DuncitButton>
        </span>
      </Tooltip>

      <PortalCallDialog open={portalOpen} lead={callLead} onClose={() => setPortalOpen(false)} />
      <AiCallDialog open={aiOpen} lead={callLead} onClose={() => setAiOpen(false)} />
      <ContactComposeDialog
        open={emailOpen}
        mode="email"
        entity={entity}
        lead={{ id: leadId, display_name: displayName, primary_email: email, primary_mobile: mobile }}
        variableValues={variableValues}
        onClose={() => setEmailOpen(false)}
        onResult={(message) => setToast(message)}
      />
      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} message={toast ?? ''} />
    </Stack>
  );
}
