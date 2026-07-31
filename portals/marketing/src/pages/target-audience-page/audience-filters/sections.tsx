import { Stack } from '@mui/material';
import { PROVIDER_OPTIONS, PUSH_OPTIONS, STATUS_OPTIONS, VISIBILITY_OPTIONS } from '../helpers';
import { MultiSelect, RangeFilter, SingleSelect, TextFilter, TriStateSelect, makeBind } from './controls';
import type { AudienceFilterOptions, AudienceFilterState } from './types';

export interface SectionProps {
  state: AudienceFilterState;
  set: <K extends keyof AudienceFilterState>(key: K, value: AudienceFilterState[K]) => void;
  options: AudienceFilterOptions;
}

export function PeopleSection({ state, set }: Readonly<SectionProps>) {
  const bind = makeBind(state, set);
  return (
    <Stack spacing={1.5}>
      <RangeFilter label="Age" type="number" from={bind('ageMin')} to={bind('ageMax')} />
      <TextFilter label="Language" placeholder="en-IN" {...bind('locale')} />
    </Stack>
  );
}

export function LocationSection({ state, set, options }: Readonly<SectionProps>) {
  const bind = makeBind(state, set);
  return (
    <Stack spacing={1.5}>
      <MultiSelect label="Country" options={options.country} {...bind('country')} />
      <MultiSelect label="State" options={options.state} {...bind('state')} />
      <MultiSelect label="City" options={options.city} {...bind('city')} />
      <MultiSelect label="Zone" options={options.zone} {...bind('zone')} />
      <TextFilter label="Pincode" {...bind('pincode')} />
    </Stack>
  );
}

export function ReachSection({ state, set, options }: Readonly<SectionProps>) {
  const bind = makeBind(state, set);
  return (
    <Stack spacing={1.5}>
      <SingleSelect label="Push reachable" options={PUSH_OPTIONS} {...bind('push')} />
      <TriStateSelect label="WhatsApp verified" {...bind('whatsapp')} />
      <TriStateSelect label="Email verified" {...bind('emailVerified')} />
      <TriStateSelect label="Phone verified" {...bind('phoneVerified')} />
      <MultiSelect label="Interests" options={options.interests} {...bind('interests')} />
    </Stack>
  );
}

export function AccountSection({ state, set, options }: Readonly<SectionProps>) {
  const bind = makeBind(state, set);
  return (
    <Stack spacing={1.5}>
      <SingleSelect label="Status" options={STATUS_OPTIONS} {...bind('status')} />
      <MultiSelect label="Roles" options={options.roles} {...bind('roles')} />
      <SingleSelect label="Signed in with" options={PROVIDER_OPTIONS} {...bind('provider')} />
      <SingleSelect label="Profile" options={VISIBILITY_OPTIONS} {...bind('visibility')} />
    </Stack>
  );
}

export function ActivitySection({ state, set }: Readonly<SectionProps>) {
  const bind = makeBind(state, set);
  return (
    <Stack spacing={1.5}>
      <RangeFilter label="Joined" type="date" from={bind('joinedFrom')} to={bind('joinedTo')} />
      <RangeFilter label="Last active" type="date" from={bind('activeFrom')} to={bind('activeTo')} />
      <TriStateSelect label="Onboarding survey done" {...bind('surveyCompleted')} />
      <TriStateSelect label="Never engaged" {...bind('firstTimeUser')} />
    </Stack>
  );
}
