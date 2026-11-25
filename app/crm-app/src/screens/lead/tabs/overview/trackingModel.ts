import type { Translate } from '@/i18n/fallback';
import { displayDateTime } from '@/features/reminders/reminderTime';
import type { KindOverview, TrackingModel } from './overviewTypes';

/** The note under the dates: a venue's remarks, a host's or seller's notes (in capitals), a prospect's notes. */
function noteOf(overview: KindOverview, t: Translate): TrackingModel['note'] {
  if (overview.kind === 'VENUE_LEAD') {
    const text = overview.data.remarks;
    return text ? { caption: t('crm.leadDetail.remarksCaption'), text } : null;
  }
  const text = overview.data.notes;
  if (!text) return null;
  const prospect = overview.kind === 'CREATOR_LEAD' || overview.kind === 'COMMUNITY_LEAD';
  return {
    caption: prospect ? t('crm.prospectLeads.notes') : t('crm.leadDetail.notesCaption'),
    text,
  };
}

/** The Lead tracking card: source, who owns it, the follow-up, created / updated and the note. */
export function trackingModel(overview: KindOverview, t: Translate): TrackingModel {
  const prospect = overview.kind === 'CREATOR_LEAD' || overview.kind === 'COMMUNITY_LEAD';
  return {
    source: overview.data.lead_source,
    followUpLabel: prospect ? t('crm.common.nextFollowUp') : t('crm.leadDetail.followUp'),
    created: displayDateTime(overview.data.created_at),
    updated: displayDateTime(overview.data.updated_at),
    note: noteOf(overview, t),
  };
}
