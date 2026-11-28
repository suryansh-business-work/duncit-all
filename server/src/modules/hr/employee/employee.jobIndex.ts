import type { Types } from 'mongoose';
import { HrEmployeeModel, type IHrEmployee } from './employee.model';

export interface HrJobSummary {
  employee_code: string;
  job_title: string;
  department: string | null;
}

/**
 * The slice of an HR record other consoles may read about an account: code,
 * title and department. Targets uses it to label its employee picker. Never
 * pay, bank or personal details — those stay inside the HR console.
 */
export const hrJobIndex = {
  /** Code, title and department per account id, for current (not exited) records only. */
  async byUserIds(userIds: readonly Types.ObjectId[]): Promise<Map<string, HrJobSummary>> {
    if (userIds.length === 0) return new Map();
    const docs = await HrEmployeeModel.find({ user_id: { $in: userIds }, status: { $ne: 'EXITED' } })
      .select('user_id employee_code job.job_title job.department')
      .lean<IHrEmployee[]>();
    return new Map(
      docs.map((doc) => [String(doc.user_id), { employee_code: doc.employee_code, job_title: doc.job.job_title, department: doc.job.department }])
    );
  },

  /** Accounts whose current HR record matches by code, title or department. */
  async searchUserIds(rx: RegExp, limit: number): Promise<Types.ObjectId[]> {
    const docs = await HrEmployeeModel.find({
      status: { $ne: 'EXITED' },
      $or: [{ employee_code: rx }, { 'job.job_title': rx }, { 'job.department': rx }],
    })
      .select('user_id')
      .limit(limit)
      .lean<Pick<IHrEmployee, 'user_id'>[]>();
    return docs.map((doc) => doc.user_id);
  },
};
