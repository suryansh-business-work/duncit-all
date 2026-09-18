import { Types } from 'mongoose';
import { HostModel } from '@modules/venues/host/host.model';

/** Every host record, with just what the Hosts analytics page reads. */

export interface HostRow {
  /** The host record — what the Hosts console opens at /hosts/:hostId. */
  _id: Types.ObjectId;
  user_id: Types.ObjectId;
  full_name?: string;
  host_no?: string | null;
  status: string;
  is_active?: boolean;
  host_categories?: Array<{ category_id?: Types.ObjectId | null; category_name?: string }>;
  submitted_at?: Date | null;
  approved_at?: Date | null;
  rejected_at?: Date | null;
}

export const loadHosts = () =>
  HostModel.find({})
    .select('user_id full_name host_no status is_active host_categories submitted_at approved_at rejected_at')
    .lean<HostRow[]>();

/** Approved AND switched on — the hosts who may run a pod today. */
export const isApproved = (row: HostRow) => row.status === 'APPROVED' && row.is_active !== false;
