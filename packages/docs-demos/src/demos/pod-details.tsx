import EventIcon from '@mui/icons-material/Event';
import { Chip, Stack, Typography } from '@mui/material';
import { ContactChips, SectionCard } from '@duncit/pod-details';
import { defineDemo, defineDemos } from '../types';

interface ContactMock {
  email: string;
  phone: string;
  whatsapp: string;
}

interface SectionMock {
  title: string;
  badge: string;
  loading: boolean;
  error: string;
  attendees: { id: string; name: string; status: string }[];
}

export default defineDemos('pod-details', [
  defineDemo<SectionMock>({
    id: 'section-card',
    title: 'Every block of a pod page is the same card',
    note:
      'Set loading to true: a slim bar appears under the header and the card does NOT resize — a section that jumps while it refreshes moves everything below it. Put text in error to see the failure stay inside the card.',
    mock: {
      title: 'Attendees',
      badge: '7 of 8',
      loading: false,
      error: '',
      attendees: [
        { id: 'a-1', name: 'Meera Nair', status: 'CHECKED_IN' },
        { id: 'a-2', name: 'Arjun Rao', status: 'BOOKED' },
        { id: 'a-3', name: 'Priya Shah', status: 'BOOKED' },
      ],
    },
    render: (mock) => (
      <SectionCard
        icon={<EventIcon fontSize="small" />}
        title={mock.title}
        badge={mock.badge}
        loading={mock.loading}
        error={mock.error || null}
      >
        <Stack spacing={1}>
          {mock.attendees.map((attendee) => (
            <Stack key={attendee.id} direction="row" spacing={1} sx={{
              alignItems: "center"
            }}>
              <Typography variant="body2" sx={{ flex: 1 }}>
                {attendee.name}
              </Typography>
              <Chip
                size="small"
                label={attendee.status}
                color={attendee.status === 'CHECKED_IN' ? 'success' : 'default'}
              />
            </Stack>
          ))}
        </Stack>
      </SectionCard>
    ),
  }),
  defineDemo<ContactMock>({
    id: 'contact-chips',
    title: 'Every way to reach someone, as dialable chips',
    note:
      'Clear a field and its chip disappears. Spaces and dashes in a number are stripped from the tel: and wa.me links, never from the label.',
    mock: { email: 'meera@example.com', phone: '+91 98765 43210', whatsapp: '+91 98765-43210' },
    render: (mock) => <ContactChips contact={mock} />,
  }),
]);
