/**
 * The Targets console's dashboard: one read that answers "where are we this
 * month?" from the records the console already keeps — this month's employee
 * targets by status, the reports waiting for a review, the targets whose
 * month-end reminder is running, and the newest saved growth plan.
 *
 * Read-only. Every figure is counted on the server (indexed queries run side
 * by side), so the page never pages through a table to add numbers up.
 */
import type { AuthUser } from '@context';
import { UserModel } from '@modules/access/user/user.model';
import { EmployeeTargetModel, type IEmployeeTarget } from '../employeeTarget/employeeTarget.model';
import { toTargetRow } from '../employeeTarget/employeeTarget.mapper';
import { dueMonths, todayKey } from '../employeeTarget/employeeTarget.service';
import { GrowthCalculationModel, type IGrowthCalculation } from '../growthCalculation/growthCalculation.model';
import { toGrowthRow } from '../growthCalculation/growthCalculation.mapper';

const REVIEW_QUEUE_SIZE = 5;
const LIVE_TARGET = { live: true };
const LIVE_PLAN = { deleted_at: null };
const ACTIVE_EMPLOYEE = { 'metadata.role_keys': 'EMPLOYEE', 'metadata.status': 'ACTIVE' };

type StatusGroup = { _id: string; count: number; percent_sum: number };

/** The month's live targets by status, and the mean completion of the ones reported on. */
async function monthCounts(month: string) {
  const groups = await EmployeeTargetModel.aggregate<StatusGroup>([
    { $match: { ...LIVE_TARGET, month } },
    { $group: { _id: '$status', count: { $sum: 1 }, percent_sum: { $sum: '$submission.completion_percent' } } },
  ]);
  const group = (status: string) => groups.find((g) => g._id === status);
  const assigned = group('ASSIGNED')?.count ?? 0;
  const submitted = group('SUBMITTED')?.count ?? 0;
  const reviewed = group('REVIEWED')?.count ?? 0;
  const reported = submitted + reviewed;
  const percentSum = (group('SUBMITTED')?.percent_sum ?? 0) + (group('REVIEWED')?.percent_sum ?? 0);
  return {
    total: assigned + submitted + reviewed,
    assigned,
    submitted,
    reviewed,
    average_completion: reported > 0 ? Math.round((percentSum / reported) * 10) / 10 : null,
  };
}

async function remindersDue(due: ReadonlySet<string>): Promise<number> {
  if (due.size === 0) return 0;
  return EmployeeTargetModel.countDocuments({ ...LIVE_TARGET, status: 'ASSIGNED', month: { $in: [...due] } });
}

export const targetsDashboardService = {
  async overview(viewer: AuthUser, now: Date = new Date()) {
    const month = todayKey(now).slice(0, 7);
    const due = await dueMonths(now);
    const [currentMonth, activeEmployees, awaitingReview, queue, reminders, savedCalculations, latest] =
      await Promise.all([
        monthCounts(month),
        UserModel.countDocuments(ACTIVE_EMPLOYEE),
        EmployeeTargetModel.countDocuments({ ...LIVE_TARGET, status: 'SUBMITTED' }),
        EmployeeTargetModel.find({ ...LIVE_TARGET, status: 'SUBMITTED' }, { client_request_id: 0 })
          .sort({ 'submission.submitted_at': 1, _id: 1 })
          .limit(REVIEW_QUEUE_SIZE)
          .lean<IEmployeeTarget[]>(),
        remindersDue(due),
        GrowthCalculationModel.countDocuments(LIVE_PLAN),
        GrowthCalculationModel.findOne(LIVE_PLAN, { client_request_id: 0 })
          .sort({ created_at: -1, _id: -1 })
          .lean<IGrowthCalculation>(),
      ]);
    return {
      month,
      current_month: currentMonth,
      active_employees: activeEmployees,
      awaiting_review: awaitingReview,
      review_queue: queue.map((doc) => toTargetRow(doc, due)),
      reminders_due: reminders,
      saved_calculations: savedCalculations,
      latest_calculation: latest ? toGrowthRow(latest, viewer) : null,
    };
  },
};
