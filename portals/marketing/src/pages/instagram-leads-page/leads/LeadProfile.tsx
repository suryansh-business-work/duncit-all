import { Avatar, Chip, Link, Stack, Typography } from '@mui/material';
import { SectionCard } from '@duncit/ui';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { OpenOnNetwork } from '../../social-accounts-page/SocialCells';
import { LEAD_STATUS_COLOR, LEAD_STATUS_LABEL } from '../copy';
import type { IgLead } from '../queries';

const AVATAR = 56;

/** Who the lead is, why the AI rated them, how to reach them, and what was already said. */
export default function LeadProfile({ lead }: Readonly<{ lead: IgLead }>) {
  const { t, locale } = useTranslation();
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });
  const followers = lead.followers === null ? null : lead.followers.toLocaleString(locale);

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <Avatar src={lead.profile_picture_url || undefined} alt="" sx={{ width: AVATAR, height: AVATAR }} />
        <Stack sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" noWrap>
            {lead.name || `@${lead.username}`}
          </Typography>
          {followers && (
            <Typography variant="body2" color="text.secondary">
              {t('marketing.igLeads.followers', { vars: { count: followers } })}
            </Typography>
          )}
        </Stack>
        <Chip size="small" color={LEAD_STATUS_COLOR[lead.status]} label={t(LEAD_STATUS_LABEL[lead.status])} />
        <OpenOnNetwork href={lead.profile_url} title={t('marketing.igLeads.openProfile')} />
      </Stack>

      {lead.bio && (
        <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
          {lead.bio}
        </Typography>
      )}
      {lead.website && (
        <Link href={lead.website} target="_blank" rel="noopener noreferrer" variant="body2" sx={{ wordBreak: 'break-all' }}>
          {lead.website}
        </Link>
      )}

      <SectionCard title={t('marketing.igLeads.fitTitle', { vars: { score: lead.fit_score ?? '-' } })}>
        <Typography variant="body2" color="text.secondary">
          {lead.fit_reason || t('marketing.igLeads.notScored')}
        </Typography>
      </SectionCard>

      <SectionCard title={t('marketing.igLeads.contactTitle')}>
        {lead.phones.length === 0 && lead.emails.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {t('marketing.igLeads.noContact')}
          </Typography>
        ) : (
          <Stack spacing={0.5}>
            {lead.phones.map((phone) => (
              <Link key={phone} href={`tel:+${phone}`} variant="body2">
                +{phone}
              </Link>
            ))}
            {lead.emails.map((email) => (
              <Link key={email} href={`mailto:${email}`} variant="body2">
                {email}
              </Link>
            ))}
          </Stack>
        )}
      </SectionCard>

      {lead.messages.length > 0 && (
        <SectionCard title={t('marketing.igLeads.historyTitle')}>
          <Stack spacing={1.5} component="ol" sx={{ m: 0, pl: 2 }}>
            {lead.messages.map((message) => (
              <li key={message.step}>
                <Typography variant="caption" color="text.secondary">
                  {message.sent_at ? formatDateTime(message.sent_at) : ''}
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                  {message.text}
                </Typography>
              </li>
            ))}
          </Stack>
          {lead.next_follow_up_at && (
            <Typography variant="body2" sx={{ mt: 1.5 }}>
              {t('marketing.igLeads.nextFollowUp', { vars: { when: formatDateTime(lead.next_follow_up_at) } })}
            </Typography>
          )}
        </SectionCard>
      )}
    </Stack>
  );
}
