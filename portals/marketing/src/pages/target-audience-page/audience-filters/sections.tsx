import { Stack } from '@mui/material';
import { PROVIDER_OPTIONS, PUSH_OPTIONS, STATUS_OPTIONS, VISIBILITY_OPTIONS } from '../helpers';
import { DateRange, MultiSelect, NumberRange, SingleSelect, TextFilter, TriStateSelect, makeBind } from './controls';
import type { AudienceFilterOptions, AudienceFilterState } from './types';
import { useTranslation } from '@duncit/app-settings';

export interface SectionProps {
  state: AudienceFilterState;
  set: <K extends keyof AudienceFilterState>(key: K, value: AudienceFilterState[K]) => void;
  options: AudienceFilterOptions;
}

export function PeopleSection({ state, set }: Readonly<SectionProps>) {
  const { t } = useTranslation();
  const bind = makeBind(state, set);
  return (
    <Stack spacing={1.5}>
      <NumberRange label={t('marketing.targetAudience.age')} from={bind('ageMin')} to={bind('ageMax')} />
      <TextFilter label={t('marketing.common.language')} placeholder="en-IN" {...bind('locale')} />
    </Stack>
  );
}

export function LocationSection({ state, set, options }: Readonly<SectionProps>) {
  const { t } = useTranslation();
  const bind = makeBind(state, set);
  return (
    <Stack spacing={1.5}>
      <MultiSelect label={t('marketing.common.country')} options={options.country} {...bind('country')} />
      <MultiSelect label={t('marketing.targetAudience.state')} options={options.state} {...bind('state')} />
      <MultiSelect label={t('marketing.common.city')} options={options.city} {...bind('city')} />
      <MultiSelect label={t('marketing.common.zone')} options={options.zone} {...bind('zone')} />
      <TextFilter label={t('marketing.targetAudience.pincode')} {...bind('pincode')} />
    </Stack>
  );
}

export function ReachSection({ state, set, options }: Readonly<SectionProps>) {
  const { t } = useTranslation();
  const bind = makeBind(state, set);
  return (
    <Stack spacing={1.5}>
      <SingleSelect label={t('marketing.targetAudience.pushReachable')} options={PUSH_OPTIONS} {...bind('push')} />
      <TriStateSelect label={t('marketing.targetAudience.whatsappVerified')} {...bind('whatsapp')} />
      <TriStateSelect label={t('marketing.targetAudience.emailVerified')} {...bind('emailVerified')} />
      <TriStateSelect label={t('marketing.targetAudience.phoneVerified')} {...bind('phoneVerified')} />
      <MultiSelect label={t('marketing.targetAudience.interests')} options={options.interests} {...bind('interests')} />
    </Stack>
  );
}

export function AccountSection({ state, set, options }: Readonly<SectionProps>) {
  const { t } = useTranslation();
  const bind = makeBind(state, set);
  return (
    <Stack spacing={1.5}>
      <SingleSelect label={t('shell.common.status')} options={STATUS_OPTIONS} {...bind('status')} />
      <MultiSelect label={t('shell.nav.roles')} options={options.roles} {...bind('roles')} />
      <SingleSelect label={t('marketing.targetAudience.signedInWith')} options={PROVIDER_OPTIONS} {...bind('provider')} />
      <SingleSelect label={t('marketing.targetAudience.profile')} options={VISIBILITY_OPTIONS} {...bind('visibility')} />
    </Stack>
  );
}

export function ActivitySection({ state, set }: Readonly<SectionProps>) {
  const { t } = useTranslation();
  const bind = makeBind(state, set);
  return (
    <Stack spacing={1.5}>
      <DateRange label={t('marketing.targetAudience.joined')} from={bind('joinedFrom')} to={bind('joinedTo')} />
      <DateRange label={t('marketing.targetAudience.lastActive')} from={bind('activeFrom')} to={bind('activeTo')} />
      <TriStateSelect label={t('marketing.targetAudience.onboardingSurveyDone')} {...bind('surveyCompleted')} />
      <TriStateSelect label={t('marketing.targetAudience.neverEngaged')} {...bind('firstTimeUser')} />
    </Stack>
  );
}
