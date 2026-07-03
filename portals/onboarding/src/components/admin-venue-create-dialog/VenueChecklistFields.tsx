import { useQuery } from '@apollo/client';
import { Chip, Stack, Typography } from '@mui/material';
import { REGISTRATION_CONFIG, type Step1 } from './queries';

interface Props {
  s1: Step1;
  set: (patch: Partial<Step1>) => void;
}

type ChecklistKey = 'amenities' | 'facilities' | 'security';

const GROUPS: { name: ChecklistKey; label: string; hint: string }[] = [
  { name: 'amenities', label: 'Amenities', hint: 'Comfort features inside the venue' },
  { name: 'facilities', label: 'Facilities', hint: 'Infrastructure the premises offer' },
  { name: 'security', label: 'Venue Security', hint: 'Safety & security measures' },
];

/** Amenities / Facilities / Security toggle-chip checklists — same catalogs
 * (venueRegistrationConfig) and data shape as the partners-app register form. */
export default function VenueChecklistFields({ s1, set }: Readonly<Props>) {
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
      {GROUPS.map((group) => (
        <Stack key={group.name} spacing={0.75}>
          <Typography variant="subtitle2" fontWeight={800}>{group.label}</Typography>
          <Typography variant="caption" color="text.secondary">{group.hint}</Typography>
          <Stack direction="row" flexWrap="wrap" sx={{ gap: 0.75 }} role="group" aria-label={group.label}>
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
