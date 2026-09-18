import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { isEmailAddress } from '@utils/email';
import { ANALYTICS_MAIL_PERIODS, isAnalyticsEntity } from '../mail/analyticsMail.pages';
import {
  ANALYTICS_ALERT_CONDITIONS,
  AnalyticsAlertModel,
  type AnalyticsAlertCondition,
  type IAnalyticsAlert,
} from './analyticsAlert.model';
import { checkAlert } from './analyticsAlert.check';

export interface AnalyticsAlertInput {
  name: string;
  entity: string;
  kpi_key: string;
  condition: AnalyticsAlertCondition;
  threshold: number;
  days: number;
  emails: string[];
  slack: boolean;
  is_active: boolean;
}

const badInput = (message: string) => new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });

const CONDITIONS = new Set<string>(ANALYTICS_ALERT_CONDITIONS);
const PERIODS = new Set<number>(ANALYTICS_MAIL_PERIODS);
const KPI_KEY = /^[a-z][a-z\d_]{1,63}$/;
const MAX_RECIPIENTS = 20;

/** The alert as the API returns it. */
function present(alert: IAnalyticsAlert) {
  return {
    id: String(alert._id),
    name: alert.name,
    entity: alert.entity,
    kpi_key: alert.kpi_key,
    condition: alert.condition,
    threshold: alert.threshold,
    days: alert.days,
    emails: alert.emails,
    slack: alert.slack,
    is_active: alert.is_active,
    last_checked_at: alert.last_checked_at?.toISOString() ?? null,
    last_value: alert.last_value,
    last_status: alert.last_status,
    last_error: alert.last_error,
    last_notified_at: alert.last_notified_at?.toISOString() ?? null,
    created_at: alert.created_at.toISOString(),
  };
}

/** Recipients lower-cased and de-duplicated; an alert can post to Slack alone. */
function cleanEmails(emails: readonly string[], slack: boolean): string[] {
  const clean = [...new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean))];
  if (!clean.every(isEmailAddress)) throw badInput('One of the addresses is not a valid email address.');
  if (clean.length > MAX_RECIPIENTS) throw badInput(`An alert can mail at most ${MAX_RECIPIENTS} people.`);
  if (clean.length === 0 && !slack) throw badInput('Add an address to mail, or post to Slack.');
  return clean;
}

/** A clean input, or a thrown error naming the first thing wrong with it. */
function cleanInput(input: AnalyticsAlertInput) {
  const name = input.name?.trim() ?? '';
  if (!name || name.length > 120) throw badInput('Enter a name of up to 120 characters.');
  if (!isAnalyticsEntity(input.entity)) throw badInput('Pick a dashboard this console has.');
  if (!KPI_KEY.test(input.kpi_key)) throw badInput('Pick a tile from the dashboard.');
  if (!CONDITIONS.has(input.condition)) throw badInput('Pick when the alert should trip.');
  if (!Number.isFinite(input.threshold)) throw badInput('Enter the number the alert compares with.');
  if (!PERIODS.has(input.days)) throw badInput('Pick a period of 7, 30, 90 or 365 days.');
  const slack = Boolean(input.slack);
  return {
    name,
    entity: input.entity,
    kpi_key: input.kpi_key,
    condition: input.condition,
    threshold: input.threshold,
    days: input.days,
    emails: cleanEmails(input.emails ?? [], slack),
    slack,
    is_active: Boolean(input.is_active),
  };
}

async function requireAlert(id: string): Promise<IAnalyticsAlert> {
  if (!Types.ObjectId.isValid(id)) throw badInput('Unknown alert.');
  const alert = await AnalyticsAlertModel.findById(id);
  if (!alert) throw new GraphQLError('Alert not found', { extensions: { code: 'NOT_FOUND' } });
  return alert;
}

export const analyticsAlertService = {
  async list() {
    const alerts = await AnalyticsAlertModel.find().sort({ created_at: -1 });
    return alerts.map(present);
  },

  async create(input: AnalyticsAlertInput, createdBy: string) {
    const alert = await AnalyticsAlertModel.create({ ...cleanInput(input), created_by: createdBy });
    return present(alert);
  },

  async update(id: string, input: AnalyticsAlertInput) {
    const alert = await requireAlert(id);
    const clean = cleanInput(input);
    // A changed rule is a new question: its old answer must not hold back the first notice.
    alert.set({ ...clean, last_status: null, last_error: null, last_notified_at: null, last_checked_at: null });
    await alert.save();
    return present(alert);
  },

  async remove(id: string) {
    await requireAlert(id);
    await AnalyticsAlertModel.deleteOne({ _id: id }).exec();
    return true;
  },

  /** Check one alert now; a tripped one tells people even inside the daily reminder window. */
  async checkNow(id: string) {
    const alert = await requireAlert(id);
    const result = await checkAlert(alert, { force: true });
    return { status: result.status, value: result.value, error: result.error, notified: result.notified };
  },
};
