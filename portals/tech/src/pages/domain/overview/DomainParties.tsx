import { Box, Stack, Typography } from '@mui/material';
import { InfoRow, SectionCard } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import type { DnsDomainContact } from '@duncit/gql-types';

const EM_DASH = '—';

const GRID = {
  display: 'grid',
  gap: 2,
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
} as const;

const MONO = { fontFamily: 'monospace', wordBreak: 'break-all' } as const;

function ContactCard({ contact, roleLabel }: Readonly<{ contact: DnsDomainContact; roleLabel: string }>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={0.75} data-testid={`domain-contact-${contact.role.toLowerCase()}`}>
      <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700 }}>
        {roleLabel}
      </Typography>
      <InfoRow variant="inline" label={t('shell.common.name')} value={contact.name ?? EM_DASH} />
      <InfoRow variant="inline" label={t('tech.domain.organization')} value={contact.organization ?? EM_DASH} />
      <InfoRow variant="inline" label={t('shell.common.email')} value={contact.email ?? EM_DASH} />
      <InfoRow variant="inline" label={t('shell.common.phone')} value={contact.phone ?? EM_DASH} />
    </Stack>
  );
}

interface Props {
  contacts: DnsDomainContact[];
  nameServers: string[];
}

/**
 * Who the registrar writes to, and which nameservers answer for the zone.
 *
 * The nameservers sit beside the contacts rather than with the records: they
 * decide whether the records on the next page are consulted at all, which is a
 * registrar fact, not a zone one.
 */
export default function DomainParties({ contacts, nameServers }: Readonly<Props>) {
  const { t } = useTranslation();
  const roleLabels: Readonly<Record<string, string>> = {
    REGISTRANT: t('tech.domain.roleRegistrant'),
    ADMIN: t('tech.domain.roleAdmin'),
    TECH: t('tech.domain.roleTech'),
    BILLING: t('tech.domain.roleBilling'),
  };

  return (
    <Box sx={GRID}>
      <SectionCard title={t('tech.domain.nameServersTitle')} subtitle={t('tech.domain.nameServersSubtitle')}>
        {nameServers.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('tech.domain.noNameServers')}
          </Typography>
        ) : (
          <Stack spacing={0.5} data-testid="domain-name-servers">
            {nameServers.map((host) => (
              <Typography key={host} variant="body2" sx={MONO}>
                {host}
              </Typography>
            ))}
          </Stack>
        )}
      </SectionCard>
      <SectionCard title={t('tech.domain.contactsTitle')} subtitle={t('tech.domain.contactsSubtitle')}>
        {contacts.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('tech.domain.noContacts')}
          </Typography>
        ) : (
          <Stack spacing={2}>
            {contacts.map((contact) => (
              <ContactCard key={contact.role} contact={contact} roleLabel={roleLabels[contact.role] ?? contact.role} />
            ))}
          </Stack>
        )}
      </SectionCard>
    </Box>
  );
}
