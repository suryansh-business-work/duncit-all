import { GraphQLError } from 'graphql';
import { isValidObjectId } from 'mongoose';
import { logs } from '@observability/log';
import { validate } from '@utils/validate';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { E2eFlowModel, type IE2eFlow, type IE2eSubFlow } from './e2eFlow.model';
import {
  e2eFlowSchema,
  e2eSubFlowSchema,
  type E2eFlowInput,
  type E2eSubFlowInput,
} from './e2eFlow.validator';

const FLOW_TABLE_CONFIG: TableEntityConfig = {
  // A sub flow's name is searchable from the flows table, so "login" finds the
  // flow that holds User Login.
  searchFields: ['name', 'description', 'sub_flows.name'],
  sortFields: { name: 'name', created_at: 'created_at', updated_at: 'updated_at' },
  filterFields: { updated_at: { type: 'date' } },
  defaultSort: { updated_at: -1 },
};

const iso = (date: Date | null | undefined) => (date ? date.toISOString() : null);

const pubSubFlow = (sub: IE2eSubFlow) => ({
  id: String(sub._id),
  name: sub.name,
  description: sub.description ?? '',
  steps: (sub.steps ?? []).map((step) => ({ action: step.action, expected: step.expected ?? '' })),
});

const pub = (doc: IE2eFlow) => ({
  id: String(doc._id),
  name: doc.name,
  description: doc.description ?? '',
  sub_flows: (doc.sub_flows ?? []).map(pubSubFlow),
  sub_flow_count: doc.sub_flows?.length ?? 0,
  created_by: doc.created_by ?? '',
  created_at: iso(doc.created_at),
  updated_at: iso(doc.updated_at),
});

function notFound(what: string): never {
  throw new GraphQLError(`${what} not found`, { extensions: { code: 'NOT_FOUND' } });
}

function requireFlow(doc: IE2eFlow | null) {
  if (!doc) notFound('Flow');
  return pub(doc);
}

function requireIds(...ids: string[]) {
  if (!ids.every((id) => isValidObjectId(id))) notFound('Flow');
}

export const e2eFlowService = {
  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IE2eFlow>(
      E2eFlowModel,
      {},
      input,
      FLOW_TABLE_CONFIG
    );
    return { rows: docs.map(pub), total, page, page_size };
  },

  async get(id: string) {
    if (!isValidObjectId(id)) return null;
    const doc = await E2eFlowModel.findById(id);
    return doc ? pub(doc) : null;
  },

  async create(input: unknown, createdBy: string) {
    const data = await validate<E2eFlowInput>(e2eFlowSchema, input);
    const doc = await E2eFlowModel.create({ ...data, created_by: createdBy });
    logs.server.info('e2eFlow', 'createFlow', { flow: doc.name });
    return pub(doc);
  },

  async update(id: string, input: unknown) {
    requireIds(id);
    const data = await validate<E2eFlowInput>(e2eFlowSchema, input);
    return requireFlow(await E2eFlowModel.findByIdAndUpdate(id, data, { new: true }));
  },

  async remove(id: string) {
    requireIds(id);
    const deleted = await E2eFlowModel.findByIdAndDelete(id);
    if (!deleted) notFound('Flow');
    logs.server.info('e2eFlow', 'deleteFlow', { flow: deleted.name });
    return true;
  },

  async createSubFlow(flowId: string, input: unknown) {
    requireIds(flowId);
    const data = await validate<E2eSubFlowInput>(e2eSubFlowSchema, input);
    return requireFlow(
      await E2eFlowModel.findByIdAndUpdate(flowId, { $push: { sub_flows: data } }, { new: true })
    );
  },

  async updateSubFlow(flowId: string, subFlowId: string, input: unknown) {
    requireIds(flowId, subFlowId);
    const data = await validate<E2eSubFlowInput>(e2eSubFlowSchema, input);
    const doc = await E2eFlowModel.findOneAndUpdate(
      { _id: flowId, 'sub_flows._id': subFlowId },
      {
        $set: {
          'sub_flows.$.name': data.name,
          'sub_flows.$.description': data.description,
          'sub_flows.$.steps': data.steps,
        },
      },
      { new: true }
    );
    if (!doc) notFound('Sub flow');
    return pub(doc);
  },

  async deleteSubFlow(flowId: string, subFlowId: string) {
    requireIds(flowId, subFlowId);
    return requireFlow(
      await E2eFlowModel.findByIdAndUpdate(
        flowId,
        { $pull: { sub_flows: { _id: subFlowId } } },
        { new: true }
      )
    );
  },
};
