import { useState } from 'react';
import { Stack, ToggleButton, ToggleButtonGroup } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { QUEUE_VIEW_LABEL } from '../copy';
import type { SocialCalendarItem, SocialQueueView } from '../publish.queries';
import type { ComposerRequest } from './ComposerDialog';
import CalendarView from './CalendarView';
import QueueList from './QueueList';
import PlannedPostDialog from './PlannedPostDialog';
import { suggestedTime } from './calendar-grid';

type View = 'CALENDAR' | SocialQueueView;
const LISTS: readonly SocialQueueView[] = ['QUEUE', 'DRAFTS', 'SENT'];

interface Props {
  onCompose: (request: ComposerRequest) => void;
  /** A post read back from a network was picked on the calendar. */
  onOpenPost: (postId: string) => void;
}

/**
 * Buffer's publishing half: the calendar, and the Queue / Drafts / Sent
 * lists, with one Create post button above all four. The calendar opens on
 * today's month and a day's "+" starts a post dated that day.
 */
export default function PublishTab({ onCompose, onOpenPost }: Readonly<Props>) {
  const { t } = useTranslation();
  const [view, setView] = useState<View>('CALENDAR');
  const [plannedId, setPlannedId] = useState<string | null>(null);

  const open = (item: SocialCalendarItem) => {
    if (item.kind === 'PUBLISHED') onOpenPost(item.id);
    else setPlannedId(item.id);
  };

  return (
    <Stack spacing={2} data-testid="social-publish">
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={view}
          onChange={(_event, next: View | null) => {
            if (next) setView(next);
          }}
          aria-label={t('marketing.social.publishView')}
          data-testid="social-publish-view"
        >
          <ToggleButton value="CALENDAR">{t('marketing.social.viewCalendar')}</ToggleButton>
          {LISTS.map((list) => (
            <ToggleButton key={list} value={list}>
              {t(QUEUE_VIEW_LABEL[list])}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <DuncitButton variant="contained" startIcon={<AddIcon />} onClick={() => onCompose({})} data-testid="social-create-post">
          {t('marketing.social.createPost')}
        </DuncitButton>
      </Stack>

      {view === 'CALENDAR' ? (
        <CalendarView onAdd={(day, today) => onCompose({ scheduled_at: suggestedTime(day, today) })} onOpen={open} />
      ) : (
        <QueueList view={view} onEdit={(post) => onCompose({ post })} />
      )}

      <PlannedPostDialog postId={plannedId} onEdit={(post) => onCompose({ post })} onClose={() => setPlannedId(null)} />
    </Stack>
  );
}
