import { randomBytes } from 'node:crypto';
import { GraphQLError } from 'graphql';
import { isValidObjectId, Types } from 'mongoose';
import {
  TeamStructureModel,
  TeamStructureNodeModel,
  TeamStructureShareModel,
  type IPayComponent,
  type ITeamStructure,
  type ITeamStructureNode,
  type ITeamStructureShare,
} from './teamStructure.model';
import { monthlyCost, payProblem } from './teamStructure.pay';

export type NodeInput = Partial<Pick<ITeamStructureNode, 'person_name' | 'department' | 'notes' | 'status' | 'sort_order'>> &
  Pick<ITeamStructureNode, 'kind' | 'title' | 'employment_type'> & {
    id?: string | null;
    parent_id?: string | null;
    user_id?: string | null;
    pay?: IPayComponent[];
  };

const MAX_NODES = 500;
const MAX_PAY_LINES = 12;

const bad = (message: string, code = 'BAD_USER_INPUT'): GraphQLError => new GraphQLError(message, { extensions: { code } });

function oid(id: string, what: string): Types.ObjectId {
  if (!isValidObjectId(id)) throw bad(`Invalid ${what} id`);
  return new Types.ObjectId(id);
}

function checkPay(pay: readonly IPayComponent[] | undefined): IPayComponent[] {
  const lines = pay ?? [];
  if (lines.length > MAX_PAY_LINES) throw bad(`A seat cannot have more than ${MAX_PAY_LINES} pay lines`);
  for (const line of lines) {
    const problem = payProblem(line);
    if (problem) throw bad(problem);
  }
  return [...lines];
}

/** True when `candidate` is `nodeId` itself or one of its descendants — a parent there would make a loop. */
async function wouldLoop(structureId: Types.ObjectId, nodeId: Types.ObjectId, candidate: Types.ObjectId): Promise<boolean> {
  let cursor: Types.ObjectId | null = candidate;
  for (let hops = 0; cursor && hops <= MAX_NODES; hops += 1) {
    if (cursor.equals(nodeId)) return true;
    const row: { parent_id: Types.ObjectId | null } | null = await TeamStructureNodeModel.findOne(
      { _id: cursor, structure_id: structureId },
      { parent_id: 1 }
    ).lean();
    if (!row) throw bad('Parent seat not found in this structure', 'NOT_FOUND');
    cursor = row.parent_id;
  }
  return false;
}

export const teamStructureService = {
  list: (): Promise<ITeamStructure[]> => TeamStructureModel.find().sort({ name: 1 }).lean<ITeamStructure[]>(),

  /** Seat count and monthly budget per structure, in one read for the whole list. */
  async summaries(): Promise<Map<string, { seats: number; cost: number }>> {
    const rows = await TeamStructureNodeModel.find({}, { structure_id: 1, status: 1, pay: 1 }).lean<
      Pick<ITeamStructureNode, 'structure_id' | 'status' | 'pay'>[]
    >();
    const totals = new Map<string, { seats: number; cost: number }>();
    for (const row of rows) {
      const key = row.structure_id.toString();
      const entry = totals.get(key) ?? { seats: 0, cost: 0 };
      entry.seats += 1;
      if (row.status !== 'OPTIONAL') entry.cost += monthlyCost(row.pay);
      totals.set(key, entry);
    }
    return totals;
  },

  async view(id: string) {
    const structure = await TeamStructureModel.findById(oid(id, 'structure')).lean<ITeamStructure>();
    if (!structure) throw bad('Team structure not found', 'NOT_FOUND');
    const nodes = await TeamStructureNodeModel.find({ structure_id: structure._id })
      .sort({ sort_order: 1, created_at: 1 })
      .lean<ITeamStructureNode[]>();
    return { structure, nodes };
  },

  async saveStructure(args: { id?: string | null; name: string; description?: string | null; currency?: string | null }) {
    const set = { name: args.name, description: args.description ?? null, ...(args.currency ? { currency: args.currency } : {}) };
    if (!args.id) return (await TeamStructureModel.create(set)).toObject();
    const doc = await TeamStructureModel.findByIdAndUpdate(oid(args.id, 'structure'), { $set: set }, { new: true }).lean<ITeamStructure>();
    if (!doc) throw bad('Team structure not found', 'NOT_FOUND');
    return doc;
  },

  async deleteStructure(id: string): Promise<boolean> {
    const _id = oid(id, 'structure');
    await TeamStructureNodeModel.deleteMany({ structure_id: _id });
    await TeamStructureShareModel.deleteMany({ structure_id: _id });
    await TeamStructureModel.deleteOne({ _id });
    return true;
  },

  async upsertNode(structureId: string, input: NodeInput): Promise<ITeamStructureNode> {
    const structure_id = oid(structureId, 'structure');
    if (!(await TeamStructureModel.exists({ _id: structure_id }))) throw bad('Team structure not found', 'NOT_FOUND');
    const _id = input.id ? oid(input.id, 'seat') : new Types.ObjectId();
    const parent = input.parent_id ? oid(input.parent_id, 'parent') : null;
    if (parent && (await wouldLoop(structure_id, _id, parent))) throw bad('A seat cannot sit under itself or its own team');
    if ((await TeamStructureNodeModel.countDocuments({ structure_id })) >= MAX_NODES && !(await TeamStructureNodeModel.exists({ _id }))) {
      throw bad(`A structure cannot hold more than ${MAX_NODES} seats`);
    }
    const { id: _ignored, parent_id: _p, user_id, pay, ...rest } = input;
    const doc = await TeamStructureNodeModel.findOneAndUpdate(
      { _id, structure_id },
      { $set: { ...rest, parent_id: parent, user_id: user_id ? oid(user_id, 'user') : null, pay: checkPay(pay) } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean<ITeamStructureNode>();
    return doc;
  },

  /** Children move up to the deleted seat's parent so a chart never loses a branch. */
  async deleteNode(id: string): Promise<boolean> {
    const _id = oid(id, 'seat');
    const node = await TeamStructureNodeModel.findById(_id).lean<ITeamStructureNode>();
    if (!node) return true;
    await TeamStructureNodeModel.updateMany({ parent_id: _id }, { $set: { parent_id: node.parent_id } });
    await TeamStructureNodeModel.deleteOne({ _id });
    return true;
  },

  shares: (structureId: string): Promise<ITeamStructureShare[]> =>
    TeamStructureShareModel.find({ structure_id: oid(structureId, 'structure') }).sort({ created_at: -1, _id: -1 }).lean<ITeamStructureShare[]>(),

  async createShare(args: { structure_id: string; label?: string | null; show_salary?: boolean | null; expires_at?: string | null }) {
    const structure_id = oid(args.structure_id, 'structure');
    if (!(await TeamStructureModel.exists({ _id: structure_id }))) throw bad('Team structure not found', 'NOT_FOUND');
    const expires = args.expires_at ? new Date(args.expires_at) : null;
    if (expires && (Number.isNaN(expires.getTime()) || expires.getTime() <= Date.now())) throw bad('Expiry must be a future date');
    return (
      await TeamStructureShareModel.create({
        structure_id,
        token: randomBytes(24).toString('base64url'),
        label: args.label ?? null,
        show_salary: args.show_salary === true,
        expires_at: expires,
      })
    ).toObject();
  },

  async revokeShare(id: string): Promise<boolean> {
    await TeamStructureShareModel.updateOne({ _id: oid(id, 'share'), revoked_at: null }, { $set: { revoked_at: new Date() } });
    return true;
  },

  /** The live share behind a token, or null when it is unknown, revoked or expired. */
  async liveShare(token: string): Promise<ITeamStructureShare | null> {
    const share = await TeamStructureShareModel.findOne({ token }).lean<ITeamStructureShare>();
    if (!share || share.revoked_at) return null;
    if (share.expires_at && share.expires_at.getTime() <= Date.now()) return null;
    return share;
  },
};
