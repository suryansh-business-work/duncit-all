import { isAfter, isBefore, isValid, parseISO, startOfDay, subYears } from 'date-fns';

export const HOST_DOB_MIN_AGE_YEARS = 18;
export const HOST_DOB_MAX_AGE_YEARS = 100;
export const HOST_DOB_RANGE_ERROR = `Host age must be between ${HOST_DOB_MIN_AGE_YEARS} and ${HOST_DOB_MAX_AGE_YEARS} years`;

const today = () => startOfDay(new Date());

export const getHostDobMinDate = () => subYears(today(), HOST_DOB_MAX_AGE_YEARS);
export const getHostDobMaxDate = () => subYears(today(), HOST_DOB_MIN_AGE_YEARS);

export function isValidHostDob(value?: string | null) {
  if (!value) return true;
  const date = parseISO(value);
  if (!isValid(date)) return false;

  const normalized = startOfDay(date);
  return !isBefore(normalized, getHostDobMinDate()) && !isAfter(normalized, getHostDobMaxDate());
}