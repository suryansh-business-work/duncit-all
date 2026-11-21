import { Types } from 'mongoose';
import { resolvePrompt } from '@modules/ai/prompt/prompt.service';
import { openaiChat } from '@services/openai/openai.client';
import { appFormat, getAppTimeZone } from '@utils/app-time';
import { logs } from '@observability/log';
import { communicationLogService } from '@modules/crm/communicationLog/communicationLog.service';
import { reminderService } from '@modules/crm/reminder/reminder.service';
import { LEAD_KIND_LABEL } from '@modules/crm/leadAi/leadAi.context';
import { emitCallStatus } from './call.socket';
import { parseCallSummary, type ParsedFollowUp } from './call.summary.parse';

/** Transcript characters sent to the model; a longer call keeps its most recent part. */
const MAX_TRANSCRIPT_CHARS = 24000;

type LogView = NonNullable<Awaited<ReturnType<typeof communicationLogService.get>>>;

const transcriptOf = (log: LogView) => {
  const live = log.transcript_segments.map((s) => `${s.speaker === 'AGENT' ? 'Agent' : 'Lead'}: ${s.text}`).join('\n');
  const full = (log.transcript || live).trim();
  return full.length > MAX_TRANSCRIPT_CHARS ? full.slice(-MAX_TRANSCRIPT_CHARS) : full;
};

/** The follow-up reminder for the agent who placed the call, created at most once per log. */
async function createFollowUp(log: LogView, follow: ParsedFollowUp) {
  if (log.summary.reminder_id) return;
  const owner = log.created_by;
  const reminder = await reminderService.create(
    {
      entity_type: log.entity_type,
      lead_id: log.entity_id,
      title: follow.title,
      due_at: follow.due_at.toISOString(),
      notes: follow.notes || null,
      assigned_to: owner,
    },
    owner
  );
  if (reminder?.id) await communicationLogService.setSummaryReminder(log.id, String(reminder.id));
}

async function runSummary(log: LogView, transcript: string): Promise<string | null> {
  const system = await resolvePrompt('crm.call_summary', {
    lead_kind: LEAD_KIND_LABEL[log.entity_type],
    lead_name: log.contact_name || log.contact_value,
    now: appFormat(new Date(), "EEEE, yyyy-MM-dd'T'HH:mm:ssxxx"),
    time_zone: getAppTimeZone(),
    transcript,
  });
  const res = await openaiChat({
    task: 'crm.call_summary',
    detail: `${log.entity_type} call`,
    model: system.model,
    temperature: 0.2,
    json: true,
    messages: [{ role: 'system', content: system.content }],
  });
  if (!res.ok) return res.message || 'The AI summary could not be generated.';
  const parsed = parseCallSummary(res.content);
  if (!parsed) return 'The AI answer could not be read. Try again.';
  await communicationLogService.saveSummary(log.id, parsed);
  if (parsed.reminder) await createFollowUp(log, parsed.reminder);
  return null;
}

/**
 * Summarise a finished call from its transcript: summary, key points,
 * sentiment, outcome, follow-ups, and one reminder for a dated follow-up.
 *
 * Only one run per log at a time (the claim), and `force: false` — the
 * automatic run after a call — never redoes a READY summary. Failures are
 * stored on the log so the portal can show them and offer a retry; nothing
 * here throws into a webhook.
 */
export async function summarizeCall(logId: string, opts: { force: boolean }) {
  if (!Types.ObjectId.isValid(logId)) return null;
  const claimed = await communicationLogService.claimSummary(logId, opts);
  if (!claimed) return communicationLogService.get(logId);

  const transcript = transcriptOf(claimed);
  let failure: string | null = 'There is no transcript to summarise yet.';
  if (transcript) {
    try {
      failure = await runSummary(claimed, transcript);
    } catch (error) {
      logs.server.error('crm', 'call-summary', { error, log_id: logId, msg: 'Call summary failed' });
      failure = 'The AI summary could not be generated. Try again.';
    }
  }
  if (failure) await communicationLogService.failSummary(logId, failure);

  const updated = await communicationLogService.get(logId);
  if (updated?.created_by) {
    emitCallStatus(updated.created_by, {
      log_id: logId,
      entity_type: updated.entity_type,
      entity_id: updated.entity_id,
      status: updated.status,
      summary_status: updated.summary.status,
    });
  }
  return updated;
}

/** Fire-and-forget form for webhooks: the run logs its own failure and never blocks Twilio. */
export function summarizeCallInBackground(logId: string) {
  summarizeCall(logId, { force: false }).catch((error: unknown) => {
    logs.server.error('crm', 'call-summary', { error, log_id: logId, msg: 'Background call summary failed' });
  });
}
