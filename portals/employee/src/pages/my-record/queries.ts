import { gql } from '@apollo/client';
import { HR_COMPENSATION_SELECTION, HR_EMPLOYEE_SELECTION, type HrCompensationRecord, type HrEmployeeRecord } from '@duncit/utils';
import type { HrContactInput } from '@duncit/gql-types';

/** Employee console: the caller's own HR record and the pay in force (null until HR adds them). */
export const MY_HR_PROFILE = gql`
  query MyHrProfile {
    myHrProfile {
      employee {
        ${HR_EMPLOYEE_SELECTION}
      }
      current_compensation {
        ${HR_COMPENSATION_SELECTION}
      }
    }
  }
`;

export const UPDATE_MY_HR_CONTACT = gql`
  mutation UpdateMyHrContact($input: HrContactInput!, $expectedRevision: Int!) {
    updateMyHrContact(input: $input, expected_revision: $expectedRevision) {
      employee {
        ${HR_EMPLOYEE_SELECTION}
      }
      current_compensation {
        ${HR_COMPENSATION_SELECTION}
      }
    }
  }
`;

export interface MyHrProfile {
  employee: HrEmployeeRecord;
  current_compensation: HrCompensationRecord | null;
}

export type MyHrProfileData = { myHrProfile: MyHrProfile | null };
export type UpdateMyContactData = { updateMyHrContact: MyHrProfile };
export type UpdateMyContactVars = { input: HrContactInput; expectedRevision: number };
