import { gql } from '@apollo/client';
import type {
  EmployeeTarget,
  EmployeeTargetSubmission,
  GrowthCalculation,
  GrowthTotals,
  TargetsDashboard,
  TargetsMonthCounts,
} from '@duncit/gql-types';

/** The dashboard's one read: only the fields its tiles, queue and plan card show. */
export const TARGETS_DASHBOARD = gql`
  query TargetsDashboard {
    targetsDashboard {
      month
      current_month {
        total
        assigned
        submitted
        reviewed
        average_completion
      }
      active_employees
      awaiting_review
      reminders_due
      saved_calculations
      review_queue {
        id
        month
        employee {
          name
        }
        submission {
          completion_percent
          submitted_at
        }
      }
      latest_calculation {
        id
        title
        created_at
        calculated_by {
          name
        }
        totals {
          cities
          venues
          hosts
          monthly_pods
          total_leads
          monthly_gmv
          monthly_earnings
          annual_earnings
        }
      }
    }
  }
`;

export type DashboardQueueRow = Pick<EmployeeTarget, 'id' | 'month'> & {
  employee: Pick<EmployeeTarget['employee'], 'name'>;
  submission: Pick<EmployeeTargetSubmission, 'completion_percent' | 'submitted_at'> | null;
};

export type DashboardPlan = Pick<GrowthCalculation, 'id' | 'title' | 'created_at'> & {
  calculated_by: Pick<GrowthCalculation['calculated_by'], 'name'>;
  totals: Pick<
    GrowthTotals,
    'cities' | 'venues' | 'hosts' | 'monthly_pods' | 'total_leads' | 'monthly_gmv' | 'monthly_earnings' | 'annual_earnings'
  >;
};

export type DashboardData = Pick<
  TargetsDashboard,
  'month' | 'active_employees' | 'awaiting_review' | 'reminders_due' | 'saved_calculations'
> & {
  current_month: Pick<TargetsMonthCounts, 'total' | 'assigned' | 'submitted' | 'reviewed' | 'average_completion'>;
  review_queue: DashboardQueueRow[];
  latest_calculation: DashboardPlan | null;
};

export type TargetsDashboardResult = { targetsDashboard: DashboardData };
