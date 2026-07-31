import type { MarketingCampaignRow } from './queries';

/**
 * What deleting actually costs, per status. A scheduled campaign and a sent
 * one lose very different things, and the confirm has to say which.
 */
const WARNINGS: Record<string, (row: MarketingCampaignRow) => string> = {
  SCHEDULED: (row) =>
    `“${row.name}” is scheduled and has not gone out yet. Deleting it cancels that send — nobody will receive it.`,
  SENT: (row) =>
    `“${row.name}” was delivered to ${row.recipient_count} recipients. Deleting removes the record of that send; the emails already in inboxes are not affected.`,
};

const DEFAULT_WARNING = (row: MarketingCampaignRow) =>
  `“${row.name}” will be removed permanently, along with its content and delivery history.`;

export const deleteWarningFor = (row: MarketingCampaignRow) =>
  (WARNINGS[row.status] ?? DEFAULT_WARNING)(row);
