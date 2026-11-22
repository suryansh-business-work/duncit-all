import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { ticketService } from '@modules/support/ticket/ticket.service';
import { recordAudit } from '../audit/askDuncitAudit.service';
import {
  AskDuncitConversationModel,
  HANDOVER_TEAMS,
  type HandoverTeam,
  type IAskDuncitConversation,
} from '../conversation/askDuncitConversation.model';
import { AskDuncitMessageModel, type IAskDuncitMessage } from '../conversation/askDuncitMessage.model';
import type { TurnContext } from '../turn/askDuncit.context';

/**
 * Human handover: when the assistant cannot resolve something, or the person
 * asks for a human, the conversation becomes a support ticket the right team
 * picks up in the Support console — through the same createTicket path as the
 * app's own "Raise a ticket", so the person sees it under My tickets.
 *
 * Idempotent per conversation: a second handover returns the first ticket.
 */

const TEAM_CATEGORY: Readonly<Record<HandoverTeam, 'GENERAL' | 'OTHER' | 'BOOKING'>> = {
  SUPPORT: 'GENERAL',
  ADMIN: 'OTHER',
  OPERATIONS: 'BOOKING',
};

const TRANSCRIPT_TURNS = 8;

export const isHandoverTeam = (value: unknown): value is HandoverTeam =>
  typeof value === 'string' && (HANDOVER_TEAMS as readonly string[]).includes(value);

function ticketBody(summary: string, turns: Array<Pick<IAskDuncitMessage, 'role' | 'content'>>): string {
  const transcript = turns.map((m) => `${m.role === 'user' ? 'Me' : 'Ask Duncit'}: ${m.content.slice(0, 500)}`).join('\n');
  return [`Summary: ${summary || '—'}`, '', 'Conversation with Ask Duncit:', transcript].join('\n');
}

export async function handOver(
  ctx: TurnContext,
  conversationId: string,
  teamInput: unknown,
  summaryInput: unknown
): Promise<{ ticket_id: string; ticket_no: string; team: HandoverTeam; already: boolean }> {
  if (!ctx.settings.features.handover) {
    throw new GraphQLError('Handover is switched off', { extensions: { code: 'FEATURE_DISABLED' } });
  }
  const team: HandoverTeam = isHandoverTeam(teamInput) ? teamInput : 'SUPPORT';
  const summary = typeof summaryInput === 'string' ? summaryInput.trim().slice(0, 600) : '';
  const conv = await AskDuncitConversationModel.findOne({ _id: conversationId, user_id: ctx.user.id }).lean<IAskDuncitConversation>();
  if (!conv) throw new GraphQLError('Conversation not found', { extensions: { code: 'NOT_FOUND' } });
  if (conv.handover_ticket_id) {
    return { ticket_id: conv.handover_ticket_id, ticket_no: '', team: conv.handover_team ?? team, already: true };
  }
  // Claim the handover first, so two parallel requests cannot open two tickets.
  const claim = await AskDuncitConversationModel.updateOne(
    { _id: conv._id, handover_ticket_id: null, handover_at: null },
    { $set: { handover_at: new Date(), handover_team: team } }
  );
  if (claim.modifiedCount === 0) {
    return { ticket_id: '', ticket_no: '', team, already: true };
  }
  const turns = await AskDuncitMessageModel.find({ conversation_id: new Types.ObjectId(conversationId) })
    .sort({ created_at: -1 })
    .limit(TRANSCRIPT_TURNS)
    .select('role content')
    .lean<Array<Pick<IAskDuncitMessage, 'role' | 'content'>>>();
  let ticket: { id: string; ticket_no: string };
  try {
    ticket = await ticketService.createTicket(ctx.user.id, {
      subject: `Ask Duncit: ${conv.title || summary || 'Help needed'}`.slice(0, 140),
      category: TEAM_CATEGORY[team],
      body_text: ticketBody(summary, turns.reverse()),
    });
  } catch (error) {
    // Release the claim so the person can try again.
    await AskDuncitConversationModel.updateOne({ _id: conv._id }, { $set: { handover_at: null, handover_team: null } });
    throw error;
  }
  await AskDuncitConversationModel.updateOne(
    { _id: conv._id },
    { $set: { status: 'HANDED_OVER', handover_ticket_id: ticket.id, handover_summary: summary } }
  );
  await recordAudit({
    type: 'HANDOVER',
    actor: ctx.actor,
    conversation_id: conversationId,
    reason: summary,
    detail: { team, ticket_id: ticket.id, ticket_no: ticket.ticket_no },
  });
  return { ticket_id: ticket.id, ticket_no: ticket.ticket_no, team, already: false };
}
