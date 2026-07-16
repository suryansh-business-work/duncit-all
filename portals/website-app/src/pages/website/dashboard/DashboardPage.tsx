import { useQuery } from '@apollo/client';
import { Stack } from '@mui/material';
import { useUserData } from '@duncit/user-context';
import { AppIcon } from '@duncit/shell';
import { PageHeader, StatCard } from '@duncit/ui';
import { WEBSITE_CONTENT, type WebsiteContentItem } from '../content/queries';
import { NEWSLETTER_SUBSCRIBERS, type Subscriber } from '../newsletter/queries';
import { CONTACT_SUBMISSIONS, type ContactSubmission } from '../contact-submissions/queries';
import { FAQ_SUBMISSIONS, type FaqSubmission } from '../faq-submissions/queries';

const STAT_CARD_SX = { borderRadius: 3, flex: '1 1 200px', minWidth: 200 } as const;
const STAT_SKELETON = { width: 60, height: 48 } as const;

interface DashboardStatProps {
  label: string;
  value: number;
  hint?: string;
  icon: string;
  to: string;
  loading?: boolean;
}

/** The portal's dashboard tile recipe on top of the shared StatCard. */
function DashboardStat({ label, value, hint, icon, to, loading }: Readonly<DashboardStatProps>) {
  return (
    <StatCard
      label={label}
      value={value}
      hint={hint}
      icon={<AppIcon name={icon} fontSize="small" color="primary" />}
      to={to}
      loading={loading}
      valueVariant="h4"
      skeletonProps={STAT_SKELETON}
      sx={STAT_CARD_SX}
    />
  );
}

export default function DashboardPage() {
  const { user } = useUserData();
  const content = useQuery<{ websiteContent: WebsiteContentItem[] }>(WEBSITE_CONTENT, {
    variables: { type: null },
    fetchPolicy: 'cache-and-network',
  });
  const newsletter = useQuery<{ newsletterSubscribers: Subscriber[] }>(NEWSLETTER_SUBSCRIBERS, {
    fetchPolicy: 'cache-and-network',
  });
  const contact = useQuery<{ contactSubmissions: ContactSubmission[] }>(CONTACT_SUBMISSIONS, {
    variables: { status: null },
    fetchPolicy: 'cache-and-network',
  });
  const faq = useQuery<{ faqSubmissions: FaqSubmission[] }>(FAQ_SUBMISSIONS, {
    variables: { status: null },
    fetchPolicy: 'cache-and-network',
  });

  const items = content.data?.websiteContent ?? [];
  const countByType = (type: string) => items.filter((i) => i.type === type).length;
  const subscribers = newsletter.data?.newsletterSubscribers ?? [];
  const activeSubs = subscribers.filter((s) => !s.unsubscribed_at).length;
  const contacts = contact.data?.contactSubmissions ?? [];
  const newContacts = contacts.filter((c) => c.status === 'NEW').length;
  const faqs = faq.data?.faqSubmissions ?? [];
  const newFaqs = faqs.filter((f) => f.status === 'NEW').length;

  const name = user?.first_name || user?.full_name || 'there';

  return (
    <Stack spacing={2.5}>
      <PageHeader
        title={`Hi ${name}, welcome back`}
        subtitle="A live overview of the content and submissions across duncit.com."
      />
      <Stack direction="row" useFlexGap flexWrap="wrap" spacing={2}>
        <DashboardStat label="Career" value={countByType('CAREERS')} icon="work" to="/careers" loading={content.loading} hint="Published & draft posts" />
        <DashboardStat label="Newsroom" value={countByType('NEWSROOM')} icon="newspaper" to="/newsroom" loading={content.loading} hint="Published & draft entries" />
        <DashboardStat label="Blog" value={countByType('BLOG')} icon="article" to="/blog" loading={content.loading} hint="Published & draft articles" />
        <DashboardStat label="Newsletter" value={subscribers.length} icon="email" to="/newsletter" loading={newsletter.loading} hint={`${activeSubs} active`} />
        <DashboardStat label="Contact" value={contacts.length} icon="contactMail" to="/contact-submissions" loading={contact.loading} hint={`${newContacts} new`} />
        <DashboardStat label="FAQ" value={faqs.length} icon="help" to="/faq-submissions" loading={faq.loading} hint={`${newFaqs} new`} />
      </Stack>
    </Stack>
  );
}
