import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import type { IntelActor } from '../access/intel.access';
import { writeAudit } from '../audit/intelAudit.service';
import { emitIntel } from '../chat/intel.stream';
import { resolveEntry } from '../connectors/intel.credentials';
import { IntelConnectorModel } from '../connectors/intelConnector.model';
import { openSession } from '../connectors/mcp/mcp.connector';
import { databaseName, executeWrite, type WriteRequest } from '../connectors/mongo/mongo.connector';
import { CONNECTOR_ENV_CATEGORY } from '../intel.constants';
import { intelSettingsService } from '../settings/intelSettings.service';
import { IntelApprovalModel, type ApprovalKind, type IIntelApproval } from './intelApproval.model';
import { mayDecide, needsFourEyes } from './intelApproval.rules';

/**
 * Proposals and decisions. The model can only CREATE a proposal; it runs when
 * a permitted person approves it, with permissions re-checked at that moment
 * and the state advanced by compare-and-set so it runs at most once.
 */

const notFound = () => new GraphQLError('Approval not found', { extensions: { code: 'NOT_FOUND' } });

export const toApprovalDto = (a: IIntelApproval) => ({
  id: String(a._id),
  kind: a.kind,
  status: a.status,
  requested_by: String(a.requested_by),
  conversation_id: a.conversation_id,
  connector_name: a.connector_name,
  environment: a.environment,
  database: a.database,
  collection: a.target_collection,
  action: a.action,
  tool_class: a.tool_class,
  request: a.request,
  preview: a.preview,
  impact: a.impact,
  reason: a.reason,
  four_eyes: a.four_eyes,
  decided_by: a.decided_by ? String(a.decided_by) : null,
  decided_at: a.decided_at,
  decision_note: a.decision_note,
  result: a.result,
  error: a.error,
  expires_at: a.expires_at,
  created_at: a.created_at,
});

export interface ProposalInput {
  kind: ApprovalKind;
  connectorId: string;
  conversationId: string;
  messageId: string;
  action: string;
  toolClass: string;
  collection?: string;
  database?: string;
  request: unknown;
  preview: unknown;
  impact: string;
  reason: string;
}

export async function propose(actor: IntelActor, input: ProposalInput): Promise<IIntelApproval> {
  const settings = await intelSettingsService.get();
  const connector = await IntelConnectorModel.findById(input.connectorId).lean();
  if (!connector) throw notFound();
  const environment = connector.environment === 'BOTH' ? 'PRODUCTION' : connector.environment;
  const created = await IntelApprovalModel.create({
    kind: input.kind,
    requested_by: new Types.ObjectId(actor.user.id),
    requester_level: actor.level,
    conversation_id: input.conversationId,
    message_id: input.messageId,
    connector_id: input.connectorId,
    connector_name: connector.name,
    environment,
    database: input.database ?? '',
    target_collection: input.collection ?? '',
    action: input.action,
    tool_class: input.toolClass,
    request: JSON.stringify(input.request),
    preview: JSON.stringify(input.preview ?? {}).slice(0, 60_000),
    impact: input.impact.slice(0, 1000),
    reason: input.reason.slice(0, 500),
    four_eyes: needsFourEyes(environment, settings.security.four_eyes_production),
    expires_at: new Date(Date.now() + settings.security.approval_expiry_hours * 3600_000),
  });
  await writeAudit({ type: 'APPROVAL', action: 'approval.request', userId: actor.user.id, level: actor.level, environment, target: `${connector.name} · ${input.action}`, detail: `${input.impact}\n${created.request}`.slice(0, 3000) });
  return created.toObject();
}

async function execute(approval: IIntelApproval): Promise<{ ok: boolean; result: string }> {
  const connector = await IntelConnectorModel.findById(approval.connector_id).lean();
  if (!connector?.enabled) return { ok: false, result: 'The connector was disabled or deleted after the request.' };
  const entry = await resolveEntry(CONNECTOR_ENV_CATEGORY[connector.kind], connector.env_entry_id);
  if (!entry) return { ok: false, result: 'The Tech portal entry of this connector is missing or inactive.' };
  try {
    if (approval.kind === 'MONGO_WRITE') {
      if (databaseName(connector, entry) !== approval.database) return { ok: false, result: 'The connection now points at a different database; the request was not run.' };
      return { ok: true, result: JSON.stringify(await executeWrite(connector, entry, JSON.parse(approval.request) as WriteRequest)) };
    }
    const req = JSON.parse(approval.request) as { tool: string; arguments: Record<string, unknown> };
    const out = await (await openSession(entry)).callTool(req.tool, req.arguments);
    return { ok: !out.isError, result: out.text.slice(0, 20_000) };
  } catch (error) {
    return { ok: false, result: error instanceof Error ? error.message : String(error) };
  }
}

export const intelApprovalService = {
  async list(actor: IntelActor, args: { status?: string | null; mine?: boolean | null; limit?: number | null }) {
    const filter: Record<string, unknown> = {};
    if (args.status) filter.status = args.status;
    if (args.mine || actor.level === 'EMPLOYEE') filter.requested_by = new Types.ObjectId(actor.user.id);
    const rows = await IntelApprovalModel.find(filter).sort({ created_at: -1 }).limit(Math.min(args.limit ?? 50, 200)).lean();
    return rows.map(toApprovalDto);
  },

  async get(actor: IntelActor, id: string) {
    if (!Types.ObjectId.isValid(id)) throw notFound();
    const a = await IntelApprovalModel.findById(id).lean();
    if (!a || (actor.level === 'EMPLOYEE' && String(a.requested_by) !== actor.user.id)) throw notFound();
    return toApprovalDto(a);
  },

  async decide(actor: IntelActor, id: string, approve: boolean, note: string) {
    if (!Types.ObjectId.isValid(id)) throw notFound();
    const current = await IntelApprovalModel.findById(id).lean();
    if (!current) throw notFound();
    const verdict = mayDecide({ deciderId: actor.user.id, deciderLevel: actor.level, requesterId: String(current.requested_by), environment: current.environment, fourEyes: current.four_eyes });
    if (!verdict.ok) {
      await writeAudit({ type: 'APPROVAL', action: 'approval.decide', status: 'DENIED', userId: actor.user.id, level: actor.level, environment: current.environment, target: id, detail: verdict.reason });
      throw new GraphQLError(verdict.reason, { extensions: { code: 'FORBIDDEN' } });
    }
    const now = new Date();
    const claimed = await IntelApprovalModel.findOneAndUpdate(
      { _id: current._id, status: 'PENDING', expires_at: { $gt: now } },
      { $set: { status: approve ? 'EXECUTING' : 'REJECTED', decided_by: new Types.ObjectId(actor.user.id), decided_at: now, decision_note: note.slice(0, 500) } },
      { new: true }
    ).lean();
    if (!claimed) {
      if (current.status === 'PENDING' && current.expires_at <= now) await IntelApprovalModel.updateOne({ _id: current._id, status: 'PENDING' }, { $set: { status: 'EXPIRED' } });
      throw new GraphQLError('This request was already decided or has expired.', { extensions: { code: 'CONFLICT' } });
    }
    let final = claimed;
    if (approve) {
      const outcome = await execute(claimed);
      final = (await IntelApprovalModel.findOneAndUpdate({ _id: claimed._id, status: 'EXECUTING' }, { $set: { status: outcome.ok ? 'EXECUTED' : 'FAILED', result: outcome.ok ? outcome.result : '', error: outcome.ok ? '' : outcome.result } }, { new: true }).lean()) ?? claimed;
      await writeAudit({ type: 'WRITE', action: `${claimed.kind.toLowerCase()}.${claimed.action}`, status: outcome.ok ? 'OK' : 'FAILED', userId: actor.user.id, level: actor.level, environment: claimed.environment, target: `${claimed.connector_name} ${claimed.target_collection}`.trim(), detail: `${claimed.request}\n→ ${outcome.result}`.slice(0, 4000) });
    }
    await writeAudit({ type: 'APPROVAL', action: approve ? 'approval.approve' : 'approval.reject', userId: actor.user.id, level: actor.level, environment: claimed.environment, target: id, detail: note });
    const dto = toApprovalDto(final);
    emitIntel(String(final.requested_by), 'approval', { approval_id: dto.id, status: dto.status });
    if (String(final.requested_by) !== actor.user.id) emitIntel(actor.user.id, 'approval', { approval_id: dto.id, status: dto.status });
    return dto;
  },

  pendingCount: (actor: IntelActor) =>
    IntelApprovalModel.countDocuments({ status: 'PENDING', ...(actor.level === 'EMPLOYEE' ? { requested_by: new Types.ObjectId(actor.user.id) } : {}) }),
};
