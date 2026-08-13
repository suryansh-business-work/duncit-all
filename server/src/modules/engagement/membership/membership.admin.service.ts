import { GraphQLError } from 'graphql';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import {
  MembershipBenefitModel,
  MembershipNewsSubscriberModel,
  MembershipPlanModel,
  type IMembershipBenefit,
  type IMembershipNewsSubscriber,
  type IMembershipPlan,
} from './membership.model';
import { benefitPub, planPub, subscriberPub } from './membership.service';

/** Allowlists for the shared table engine (DUNCIT TABLE CONTRACT v1). */
const PLAN_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['name', 'key', 'tagline'],
  sortFields: {
    name: 'name',
    key: 'key',
    price_label: 'price_label',
    sort_order: 'sort_order',
    is_active: 'is_active',
    created_at: 'created_at',
    updated_at: 'updated_at',
  },
  filterFields: {
    is_active: { type: 'boolean' },
    key: { type: 'string' },
  },
  defaultSort: { sort_order: 1, name: 1 },
};

const BENEFIT_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['label', 'group'],
  sortFields: {
    label: 'label',
    group: 'group',
    sort_order: 'sort_order',
    is_active: 'is_active',
    updated_at: 'updated_at',
  },
  filterFields: {
    is_active: { type: 'boolean' },
    group: { type: 'string' },
  },
  defaultSort: { sort_order: 1, label: 1 },
};

const SUBSCRIBER_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['email', 'name'],
  sortFields: { email: 'email', name: 'name', created_at: 'created_at' },
  filterFields: {},
  defaultSort: { created_at: -1 },
};

const notFound = (what: string): never => {
  throw new GraphQLError(`${what} not found`, { extensions: { code: 'NOT_FOUND' } });
};

export const membershipAdminService = {
  async plans() {
    const docs = await MembershipPlanModel.find().sort({ sort_order: 1, name: 1 });
    return docs.map(planPub);
  },

  async plansTable(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IMembershipPlan>(
      MembershipPlanModel,
      {},
      input,
      PLAN_TABLE_CONFIG
    );
    return { rows: docs.map(planPub), total, page, page_size };
  },

  async createPlan(input: Record<string, unknown>) {
    const key = String(input.key ?? '').trim().toLowerCase();
    if (!key) {
      throw new GraphQLError('Plan key is required', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const exists = await MembershipPlanModel.exists({ key });
    if (exists) {
      throw new GraphQLError('A plan with this key already exists', {
        extensions: { code: 'CONFLICT' },
      });
    }
    const doc = await MembershipPlanModel.create({ ...input, key });
    return planPub(doc);
  },

  async updatePlan(id: string, input: Record<string, unknown>) {
    const doc = await MembershipPlanModel.findByIdAndUpdate(id, input, { new: true });
    if (!doc) return notFound('Membership plan');
    return planPub(doc);
  },

  /**
   * Delete a tier AND its column on every comparison row — a benefit left
   * holding a value for a plan nobody can select renders an orphan cell the
   * apps have no header for.
   */
  async removePlan(id: string) {
    const doc = await MembershipPlanModel.findByIdAndDelete(id);
    if (!doc) return false;
    await MembershipBenefitModel.updateMany(
      { 'values.plan_key': doc.key },
      { $pull: { values: { plan_key: doc.key } } }
    );
    return true;
  },

  async benefits() {
    const docs = await MembershipBenefitModel.find().sort({ sort_order: 1, label: 1 });
    return docs.map(benefitPub);
  },

  async benefitsTable(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IMembershipBenefit>(
      MembershipBenefitModel,
      {},
      input,
      BENEFIT_TABLE_CONFIG
    );
    return { rows: docs.map(benefitPub), total, page, page_size };
  },

  async createBenefit(input: Record<string, unknown>) {
    const doc = await MembershipBenefitModel.create(input);
    return benefitPub(doc);
  },

  async updateBenefit(id: string, input: Record<string, unknown>) {
    const doc = await MembershipBenefitModel.findByIdAndUpdate(id, input, { new: true });
    if (!doc) return notFound('Membership benefit');
    return benefitPub(doc);
  },

  async removeBenefit(id: string) {
    const res = await MembershipBenefitModel.findByIdAndDelete(id);
    return !!res;
  },

  async subscribersTable(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IMembershipNewsSubscriber>(
      MembershipNewsSubscriberModel,
      {},
      input,
      SUBSCRIBER_TABLE_CONFIG
    );
    return { rows: docs.map(subscriberPub), total, page, page_size };
  },
};
