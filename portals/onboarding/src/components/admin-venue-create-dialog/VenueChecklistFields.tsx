import { useQuery } from '@apollo/client';
import { Chip, Stack, Typography } from '@mui/material';
import { REGISTRATION_CONFIG, type Step1 } from './queries';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  s1: Step1;
  set: (patch: Partial<Step1>) => void;
}

type ChecklistKey = 'amenities' | 'facilities' | 'security';

type Translate = ReturnType<typeof useTranslation>['t'];

const groups = (t: Translate): { name: ChecklistKey; label: string; hint: string }[] => [
  { name: 'amenities', label: t('onboarding.adminVenueCreateDialog.amenities'), hint: 'Comfort features inside the venue' },
  { name: 'facilities', label: t('onboarding.adminVenueCreateDialog.facilities'), hint: 'Infrastructure the premises offer' },
  { name: 'security', label: t('onboarding.adminVenueCreateDialog.venueSecurity'), hint: 'Safety & security measures' },
];

/** Amenities / Facilities / Security toggle-chip checklists — same catalogs
 * (venueRegistrationConfig) and data shape as the partners-app register form. */
export default function VenueChecklistFields({ s1, set }: Readonly<Props>) {
  const { t } = useTranslation();
  const { data } = useQuery(REGISTRATION_CONFIG, { fetchPolicy: 'cache-first' });
  const config = data?.venueRegistrationConfig;

  const toggle = (name: ChecklistKey, option: string) => {
    const current = s1[name];
    set({
      [name]: current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option],
    });
  };

  return (
    <Stack spacing={2}>
      {groups(t).map((group) => (
        <Stack key={group.name} spacing={0.75}>
          <Typography variant="subtitle2" sx={{
            fontWeight: 800
          }}>{group.label}</Typography>
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>{group.hint}</Typography>
          <Stack
            direction="row"
            role="group"
            aria-label={group.label}
            sx={{
              flexWrap: "wrap",
              gap: 0.75
            }}>
            {(config?.[group.name] ?? []).map((option: string) => {
              const selected = s1[group.name].includes(option);
              return (
                <Chip
                  key={option}
                  size="small"
                  label={option}
                  clickable
                  color={selected ? 'primary' : 'default'}
                  variant={selected ? 'filled' : 'outlined'}
                  aria-pressed={selected}
                  onClick={() => toggle(group.name, option)}
                />
              );
            })}
          </Stack>
        </Stack>
      ))}
    </Stack>
  );
}
