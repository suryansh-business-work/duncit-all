/**
 * `userService` — CRM contact actions on a user: logged actions, recorded
 * Twilio calls and their table. Composed into `userService` in user.service.ts.
 */
import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { UserModel } from './user.model';
import type { StartRecordedUserCallDTO } from './user.validator';
import { UserContactActionModel } from './userContactAction.model';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';

const contactActionToPublic = (doc: any) => ({
  id: String(doc._id),
  user_id: String(doc.user_id),
  created_by: doc.created_by ? String(doc.created_by) : null,
  type: doc.type,
  target: doc.target ?? '',
  subject: doc.subject ?? '',
  notes: doc.notes ?? '',
  status: doc.status ?? 'LOGGED',
  duration_seconds: doc.duration_seconds ?? 0,
  twilio_call_sid: doc.twilio_call_sid ?? '',
  recording_sid: doc.recording_sid ?? '',
  recording_url: doc.recording_url ?? '',
  created_at: doc.created_at?.toISOString?.() ?? '',
  updated_at: doc.updated_at?.toISOString?.() ?? '',
});

/** Allowlists for the shared table engine (userContactActionsTable). */
const CONTACT_ACTION_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['target', 'subject', 'notes'],
  sortFields: {
    type: 'type',
    target: 'target',
    status: 'status',
    notes: 'notes',
    duration_seconds: 'duration_seconds',
    created_at: 'created_at',
  },
  filterFields: {
    type: { type: 'enum' },
    target: { type: 'string' },
    status: { type: 'string' },
    notes: { type: 'string' },
    duration_seconds: { type: 'number' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

const escapeTwiml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

async function startTwilioRecordedBridge(actionId: string, target: string) {
  const [accountSid, authToken, fromNumber, agentNumber, webhookBaseUrl, recordingEnabled] =
    await Promise.all([
      getRuntimeEnvValue('TWILIO_ACCOUNT_SID'),
      getRuntimeEnvValue('TWILIO_AUTH_TOKEN'),
      getRuntimeEnvValue('TWILIO_PHONE_NUMBER'),
      getRuntimeEnvValue('TWILIO_AGENT_PHONE_NUMBER'),
      getRuntimeEnvValue('TWILIO_WEBHOOK_BASE_URL'),
      getRuntimeEnvValue('TWILIO_CALL_RECORDING_ENABLED'),
    ]);

  if (!accountSid || !authToken || !fromNumber || !agentNumber || !webhookBaseUrl) {
    throw new GraphQLError('Twilio recorded calls are not configured', {
      extensions: { code: 'CONFIG_ERROR' },
    });
  }
  if (['0', 'false', 'no'].includes(recordingEnabled.toLowerCase())) {
    throw new GraphQLError('Twilio call recording is disabled', {
      extensions: { code: 'CONFIG_ERROR' },
    });
  }

  const callbackUrl = `${webhookBaseUrl.replace(/\/$/, '')}/twilio/recordings?contactActionId=${encodeURIComponent(actionId)}`;
  const twiml = [
    '<Response>',
    '<Say>This Duncit admin call may be recorded for service quality.</Say>',
    `<Dial record="record-from-answer-dual" recordingStatusCallback="${escapeTwiml(callbackUrl)}" recordingStatusCallbackMethod="POST">`,
    `<Number>${escapeTwiml(target)}</Number>`,
    '</Dial>',
    '</Response>',
  ].join('');

  const body = new URLSearchParams({
    To: agentNumber,
    From: fromNumber,
    Twiml: twiml,
  });
  const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const payload: any = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new GraphQLError(payload?.message || 'Twilio call failed', {
      extensions: { code: 'TWILIO_ERROR' },
    });
  }
  return String(payload.sid || '');
}

export const userContactMethods = {
  async listContactActions(user_id: string) {
    const docs = await UserContactActionModel.find({ user_id: new Types.ObjectId(user_id) })
      .sort({ created_at: -1 })
      .limit(100);
    return docs.map(contactActionToPublic);
  },

  async recordContactAction(input: Record<string, any>, createdBy?: string | null) {
    const targetUser = await UserModel.findById(input.user_id).select('_id');
    if (!targetUser) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    const created = await UserContactActionModel.create({
      user_id: targetUser._id,
      created_by: createdBy ? new Types.ObjectId(createdBy) : null,
      type: input.type,
      target: input.target,
      subject: input.subject ?? '',
      notes: input.notes ?? '',
      status: input.status ?? 'LOGGED',
      duration_seconds: input.duration_seconds ?? 0,
      recording_url: input.recording_url ?? '',
    });
    return contactActionToPublic(created);
  },

  async startRecordedCall(input: StartRecordedUserCallDTO, createdBy?: string | null) {
    const targetUser = await UserModel.findById(input.user_id).select('_id');
    if (!targetUser) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
    const action = await UserContactActionModel.create({
      user_id: targetUser._id,
      created_by: createdBy ? new Types.ObjectId(createdBy) : null,
      type: 'CALL',
      target: input.target,
      notes: input.notes ?? '',
      status: 'INITIATING',
    });
    try {
      action.twilio_call_sid = await startTwilioRecordedBridge(String(action._id), input.target);
      action.status = 'INITIATED';
      await action.save();
      return contactActionToPublic(action);
    } catch (error: any) {
      action.status = 'FAILED';
      action.notes = [input.notes, error?.message].filter(Boolean).join('\n');
      await action.save();
      throw error;
    }
  },

  async attachCallRecording(input: {
    actionId?: string | null;
    callSid?: string | null;
    recordingSid?: string | null;
    recordingUrl?: string | null;
    durationSeconds?: number | null;
  }) {
    const query = input.actionId
      ? { _id: new Types.ObjectId(input.actionId) }
      : { twilio_call_sid: input.callSid ?? '' };
    const updated = await UserContactActionModel.findOneAndUpdate(
      query,
      {
        $set: {
          status: 'RECORDED',
          recording_sid: input.recordingSid ?? '',
          recording_url: input.recordingUrl ?? '',
          duration_seconds: input.durationSeconds ?? 0,
        },
      },
      { new: true }
    );
    return !!updated;
  },

  async deleteContactAction(actionId: string) {
    const deleted = await UserContactActionModel.findByIdAndDelete(actionId);
    return !!deleted;
  },

  /** Server-side table page for the userContactActionsTable query. The user_id
   * baseFilter is $and-merged by the engine, so client filters can never widen
   * the page beyond the requested user's own call/email log. */
  async contactActionsTable(user_id: string, input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery(
      UserContactActionModel,
      { user_id: new Types.ObjectId(user_id) },
      input,
      CONTACT_ACTION_TABLE_CONFIG
    );
    return { rows: docs.map(contactActionToPublic), total, page, page_size };
  },
};
