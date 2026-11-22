import type { useTranslation } from '@duncit/shell';
import { Typography } from '@mui/material';
import ShareIcon from '@mui/icons-material/Share';
import type { LeadTab } from './LeadTabs';
import type { CrmSocialLink } from '../api/crm.types';
import { LeadDetailCard, LeadDetailRow } from './LeadDetailCard';
import ExternalLink from './ExternalLink';
import SocialLinksRows from './SocialLinksRows';

type Translate = ReturnType<typeof useTranslation>['t'];

interface SocialLead {
  instagram_link?: string | null;
  social_links?: CrmSocialLink[] | null;
}

/**
 * The "Social" tab on venue, host, creator and community lead pages: every
 * social channel the lead has, as plain links. It is view-only on purpose —
 * channels change through the lead's form (Social step), never inline here.
 */
export function leadSocialTab(lead: SocialLead, t: Translate): LeadTab {
  const extra = lead.social_links ?? [];
  const count = extra.length + (lead.instagram_link ? 1 : 0);
  return {
    value: 'social',
    label: t('crm.social.tabLabel', { vars: { count } }),
    icon: <ShareIcon fontSize="small" />,
    render: () => (
      <LeadDetailCard
        title={t('crm.common.social')}
        subtitle={t('crm.social.viewOnlyHint')}
        icon={<ShareIcon color="primary" />}
      >
        {count === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary' }} data-testid="lead-social-empty">
            {t('crm.social.empty')}
          </Typography>
        ) : (
          <>
            {lead.instagram_link ? (
              <LeadDetailRow
                label={t('crm.common.instagram')}
                value={<ExternalLink variant="body2" href={lead.instagram_link} />}
              />
            ) : null}
            <SocialLinksRows links={extra} />
          </>
        )}
      </LeadDetailCard>
    ),
  };
}
