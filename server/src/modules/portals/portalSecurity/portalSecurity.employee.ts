import { Types } from 'mongoose';
import { TeamStructureNodeModel } from '@modules/hr/teamStructure/teamStructure.model';

/**
 * Whether the person is on Duncit's team, as the HR portal sees it.
 *
 * HR keeps the team structure: a seat is "filled" by a real account through
 * `user_id`. A person who holds a filled, non-AI seat is on the team; their
 * seat title, department and employment type (full time, part time, contract,
 * advisor) come from the same row. Someone with console access and no seat is
 * not on the chart — which is exactly what a reviewer needs to see against a
 * sign-in to a restricted portal.
 */
export interface EmployeeStanding {
  is_employee: boolean;
  title: string | null;
  department: string | null;
  employment_type: string | null;
}

export const NOT_AN_EMPLOYEE: EmployeeStanding = {
  is_employee: false,
  title: null,
  department: null,
  employment_type: null,
};

/** A seat always has a title and an employment type; only the department is optional. */
interface SeatRow {
  title: string;
  department?: string | null;
  employment_type: string;
}

export async function employeeStanding(userId: string): Promise<EmployeeStanding> {
  if (!Types.ObjectId.isValid(userId)) return NOT_AN_EMPLOYEE;
  const seat = await TeamStructureNodeModel.findOne({
    user_id: new Types.ObjectId(userId),
    status: 'FILLED',
    kind: { $in: ['HEAD', 'ROLE'] },
    employment_type: { $ne: 'AI_AGENT' },
  })
    .sort({ sort_order: 1 })
    .select('title department employment_type')
    .lean<SeatRow | null>();
  if (!seat) return NOT_AN_EMPLOYEE;
  return {
    is_employee: true,
    title: seat.title,
    department: seat.department ?? null,
    employment_type: seat.employment_type,
  };
}
