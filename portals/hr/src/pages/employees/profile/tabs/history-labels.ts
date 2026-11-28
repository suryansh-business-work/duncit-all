/**
 * The worker-history field paths the server writes, mapped to the label each
 * reads as. Written out key by key so the translation gate sees every literal;
 * an unknown path falls back to the path itself.
 */
export const HISTORY_FIELD_KEYS: Readonly<Record<string, string>> = {
  reason: 'hrEmployee.field.jobReason',
  employee_code: 'hrEmployee.field.employeeCode',
  compensation: 'hrEmployee.field.compensation',
  'personal.first_name': 'hrEmployee.field.firstName',
  'personal.last_name': 'hrEmployee.field.lastName',
  'personal.gender': 'hrEmployee.field.gender',
  'personal.date_of_birth': 'hrEmployee.field.dateOfBirth',
  'personal.personal_email': 'hrEmployee.field.personalEmail',
  'personal.phone_number': 'hrEmployee.field.phone',
  'personal.phone_extension': 'hrEmployee.field.dialCode',
  'personal.current_address': 'hrEmployee.field.currentAddress',
  'personal.permanent_address': 'hrEmployee.field.permanentAddress',
  'personal.emergency_contact': 'hrEmployee.profile.emergencyTitle',
  'job.job_title': 'hrEmployee.field.jobTitle',
  'job.department': 'hrEmployee.field.department',
  'job.work_location': 'hrEmployee.field.workLocation',
  'job.manager_id': 'hrEmployee.field.manager',
  'job.employment_type': 'hrEmployee.field.employmentType',
  'job.date_of_joining': 'hrEmployee.field.dateOfJoining',
  'job.probation_end_date': 'hrEmployee.field.probationEnd',
  'job.notice_period_days': 'hrEmployee.field.noticeDays',
  'job.work_email': 'hrEmployee.field.workEmail',
  'bank.account_holder_name': 'hrEmployee.field.accountHolder',
  'bank.account_number': 'hrEmployee.field.accountNumber',
  'bank.ifsc': 'hrEmployee.field.ifsc',
  'bank.bank_name': 'hrEmployee.field.bankName',
  'bank.pan': 'hrEmployee.field.pan',
  'bank.uan': 'hrEmployee.field.uan',
  'exit.exit_type': 'hrEmployee.field.exitType',
  'exit.last_working_day': 'hrEmployee.field.lastWorkingDay',
};
