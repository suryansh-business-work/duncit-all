import type { PipelineStage, Types } from 'mongoose';
import {
  TicketModel,
  type TicketCategory,
  type TicketPriority,
  type TicketSource,
  type TicketStatus,
} from '@modules/support/ticket/ticket.model';
import { SupportChatSessionModel } from '@modules/support/supportChat/supportChat.model';
import { BouncerCallbackRequestModel, BouncerSosAlertModel } from '@modules/support/bouncer/bouncer.model';
import { FeedbackReportModel } from '@modules/support/feedback/feedback.model';
import { inEitherPeriod, inRange, type AnalyticsWindow } from './window';
import { perDay, periodGroup, type CountRow, type PeriodDayKey } from './aggregates';

/** What the Support analytics page reads: tickets, chats, callbacks, SOS alerts, problem reports and ratings. */

/* ------------------------------ tickets ------------------------------ */

export interface OpenedTicket {
  created_at: Date;
  category: TicketCategory;
  source: TicketSource;
  priority: TicketPriority;
  status: TicketStatus;
  /** Milliseconds until somebody at support first answered; null while nobody has. */
  first_reply_ms: number | null;
}

/**
 * A reply from support. A support account that raised the ticket itself is
 * the user in that conversation, and older rows stored its own messages as
 * AGENT — so a message by the raiser never counts as an answer.
 */
const SUPPORT_REPLY = {
  $and: [{ $eq: ['$$this.author_role', 'AGENT'] }, { $ne: ['$$this.author_id', '$user_id'] }],
};

/** Every ticket opened in a period, with where it stands now and how fast it was first answered. */
const loadOpenedTickets = (from: Date, to: Date) =>
  TicketModel.aggregate<OpenedTicket>([
    { $match: { created_at: inRange(from, to) } },
    {
      $project: {
        _id: 0,
        created_at: 1,
        category: 1,
        source: 1,
        priority: 1,
        status: 1,
        first_reply_ms: {
          $subtract: [
            { $min: { $map: { input: { $filter: { input: '$messages', cond: SUPPORT_REPLY } }, in: '$$this.created_at' } } },
            '$created_at',
          ],
        },
      },
    },
  ]);

export interface ResolvedTicket {
  resolved_at: Date;
  resolve_ms: number;
}

/** Tickets resolved or closed in a period, and how long each took from being opened. */
const loadResolvedTickets = (from: Date, to: Date) =>
  TicketModel.aggregate<ResolvedTicket>([
    { $match: { resolved_at: inRange(from, to), status: { $in: ['RESOLVED', 'CLOSED'] } } },
    { $project: { _id: 0, resolved_at: 1, resolve_ms: { $subtract: ['$resolved_at', '$created_at'] } } },
  ]);

export interface TicketPeriod {
  opened: OpenedTicket[];
  resolved: ResolvedTicket[];
}

/** The tickets opened, and the tickets resolved, in one period. */
export async function loadTicketPeriod(from: Date, to: Date): Promise<TicketPeriod> {
  const [opened, resolved] = await Promise.all([loadOpenedTickets(from, to), loadResolvedTickets(from, to)]);
  return { opened, resolved };
}

/**
 * The note `ticketService.reopen` writes into the thread is the only record of
 * a reopen, so it is what gets counted. A user's reply that reopens a ticket
 * leaves no note and is not in this number.
 */
const REOPEN_NOTE = /^Re-opened this ticket/;

export const loadReopens = (window: AnalyticsWindow) =>
  TicketModel.aggregate<CountRow>([
    { $match: { last_message_at: { $gte: window.prevFrom } } },
    { $unwind: '$messages' },
    { $match: { ...inEitherPeriod('messages.created_at', window), 'messages.body_text': REOPEN_NOTE } },
    periodGroup('messages.created_at', window),
  ]);

export const countBacklog = () => TicketModel.countDocuments({ status: { $in: ['OPEN', 'PENDING'] } });

/* --------------------------- other queues ---------------------------- */

export interface ChatRow {
  _id: PeriodDayKey;
  started: number;
  answered: number;
}

/** Chats started per day, and how many of them a person from support took over from the assistant. */
export const loadChats = (window: AnalyticsWindow) =>
  SupportChatSessionModel.aggregate<ChatRow>(
    perDay('created_at', window, {
      started: { $sum: 1 },
      answered: { $sum: { $cond: [{ $ne: ['$agent_id', null] }, 1, 0] } },
    })
  );

export const loadCallbacks = (window: AnalyticsWindow) =>
  BouncerCallbackRequestModel.aggregate<CountRow>(perDay('created_at', window));

export const loadSosAlerts = (window: AnalyticsWindow) =>
  BouncerSosAlertModel.aggregate<CountRow>(perDay('created_at', window));

export const loadProblems = (window: AnalyticsWindow) =>
  FeedbackReportModel.aggregate<CountRow>(perDay('created_at', window));

/** Reported problems per category the app offered, as the label it was sent with. */
export const loadProblemCategories = (from: Date, to: Date) =>
  FeedbackReportModel.aggregate<{ _id: string; count: number }>([
    { $match: { created_at: inRange(from, to) } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);

export interface RatingRow {
  _id: { rating: number; current: boolean };
  count: number;
}

/** "How did we do" scores on tickets and chats, by when they were given. */
function ratingPipeline(window: AnalyticsWindow): PipelineStage[] {
  return [
    { $match: { ...inEitherPeriod('feedback_at', window), rating: { $ne: null } } },
    { $group: { _id: { rating: '$rating', current: { $gte: ['$feedback_at', window.from] } }, count: { $sum: 1 } } },
  ];
}

export async function loadRatings(window: AnalyticsWindow): Promise<RatingRow[]> {
  const [tickets, chats] = await Promise.all([
    TicketModel.aggregate<RatingRow>(ratingPipeline(window)),
    SupportChatSessionModel.aggregate<RatingRow>(ratingPipeline(window)),
  ]);
  return [...tickets, ...chats];
}

export interface AgentTally {
  _id: Types.ObjectId;
  count: number;
}

export interface AgentReplies {
  _id: Types.ObjectId;
  tickets: number;
  replies: number;
}

/** What each person at support answered in the period, from the records that name them. */
export function loadAgentWork(from: Date, to: Date) {
  const tallyBy = (field: string): PipelineStage[] => [{ $group: { _id: `$${field}`, count: { $sum: 1 } } }];
  return Promise.all([
    TicketModel.aggregate<AgentReplies>([
      { $match: { last_message_at: { $gte: from } } },
      { $unwind: '$messages' },
      {
        $match: {
          'messages.author_role': 'AGENT',
          'messages.created_at': inRange(from, to),
          $expr: { $ne: ['$messages.author_id', '$user_id'] },
        },
      },
      { $group: { _id: { agent: '$messages.author_id', ticket: '$_id' }, replies: { $sum: 1 } } },
      { $group: { _id: '$_id.agent', tickets: { $sum: 1 }, replies: { $sum: '$replies' } } },
    ]),
    SupportChatSessionModel.aggregate<AgentTally>([
      { $match: { created_at: inRange(from, to), agent_id: { $ne: null } } },
      ...tallyBy('agent_id'),
    ]),
    BouncerCallbackRequestModel.aggregate<AgentTally>([
      { $match: { contacted_at: inRange(from, to), contacted_by: { $ne: null } } },
      ...tallyBy('contacted_by'),
    ]),
    BouncerSosAlertModel.aggregate<AgentTally>([
      { $match: { resolved_at: inRange(from, to), resolved_by: { $ne: null } } },
      ...tallyBy('resolved_by'),
    ]),
  ]);
}
