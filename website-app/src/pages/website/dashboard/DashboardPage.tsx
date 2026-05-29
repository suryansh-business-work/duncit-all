import { useQuery } from '@apollo/client';
import { Box, Stack, Typography } from '@mui/material';
import { useUserData } from '@duncit/user-context';
import StatCard from './StatCard';
import { WEBSITE_CONTENT, type WebsiteContentItem } from '../content/queries';
import { NEWSLETTER_SUBSCRIBERS, type Subscriber } from '../newsletter/queries';
import { CONTACT_SUBMISSIONS, type ContactSubmission } from '../contact-submissions/queries';
import { FAQ_SUBMISSIONS, type FaqSubmission } from '../faq-submissions/queries';

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
      <Box>
        <Typography variant="h5" fontWeight={800}>
          Hi {name}, welcome back
        </Typography>
        <Typography variant="body2" color="text.secondary">
          A live overview of the content and submissions across duncit.com.
        </Typography>
      </Box>
      <Stack direction="row" useFlexGap flexWrap="wrap" spacing={2}>
        <StatCard label="Career" value={countByType('CAREERS')} icon="work" to="/careers" loading={content.loading} hint="Published & draft posts" />
        <StatCard label="Newsroom" value={countByType('NEWSROOM')} icon="newspaper" to="/newsroom" loading={content.loading} hint="Published & draft entries" />
        <StatCard label="Blog" value={countByType('BLOG')} icon="article" to="/blog" loading={content.loading} hint="Published & draft articles" />
        <StatCard label="Newsletter" value={subscribers.length} icon="email" to="/newsletter" loading={newsletter.loading} hint={`${activeSubs} active`} />
        <StatCard label="Contact" value={contacts.length} icon="contactMail" to="/contact-submissions" loading={contact.loading} hint={`${newContacts} new`} />
        <StatCard label="FAQ" value={faqs.length} icon="help" to="/faq-submissions" loading={faq.loading} hint={`${newFaqs} new`} />
      </Stack>
    </Stack>
  );
}
