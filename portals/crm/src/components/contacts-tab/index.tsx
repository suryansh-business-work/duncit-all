import { useState } from 'react';
import { Snackbar, Stack, Typography } from '@mui/material';
import ContactsIcon from '@mui/icons-material/Contacts';
import { LeadDetailCard } from '../LeadDetailCard';
import ContactComposeDialog from '../ContactComposeDialog';
import ContactCard from './ContactCard';
import type { CrmContact } from '../../api/crm.types';

interface Props {
  entity: 'VENUE_LEAD' | 'HOST_LEAD';
  leadId: string;
  leadName: string;
  contacts: CrmContact[];
}

type Active = { mode: 'call' | 'email'; contact: CrmContact } | null;

/**
 * Contacts tab for a lead detail page. Each contact's Call / Email opens the
 * shared Gmail-style compose window (draggable, minimize/maximize) — the same
 * behaviour as the hero contact actions.
 */
export default function ContactsTab({ entity, leadId, leadName, contacts }: Readonly<Props>) {
  const [active, setActive] = useState<Active>(null);
  const [toast, setToast] = useState<string | null>(null);

  return (
    <LeadDetailCard title="Contacts" icon={<ContactsIcon color="primary" />}>
      <Stack sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 1.5 }}>
        {contacts.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No contacts on file yet.
          </Typography>
        )}
        {contacts.map((contact, idx) => (
          <ContactCard
            key={`${contact.email}-${idx}`}
            contact={contact}
            index={idx}
            onCall={(c) => setActive({ mode: 'call', contact: c })}
            onEmail={(c) => setActive({ mode: 'email', contact: c })}
          />
        ))}
      </Stack>

      <ContactComposeDialog
        open={active !== null}
        mode={active?.mode ?? 'email'}
        entity={entity}
        lead={
          active
            ? {
                id: leadId,
                display_name: active.contact.name || leadName,
                primary_email: active.contact.email,
                primary_mobile: active.contact.mobile_number,
              }
            : null
        }
        onClose={() => setActive(null)}
        onResult={(message) => setToast(message)}
      />
      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} message={toast ?? ''} />
    </LeadDetailCard>
  );
}
