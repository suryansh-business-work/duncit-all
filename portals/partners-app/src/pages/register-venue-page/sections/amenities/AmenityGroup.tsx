import { useMemo } from 'react';
import { Chip, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { matchesSearch, optionKey, ownEntriesOf, type OwnOptionLimits } from './amenity-options';
import OwnEntry from './own-entry';

export interface AmenityGroupDef {
  name: 'amenities' | 'facilities' | 'security';
  label: string;
  hint: string;
  /** The catalogue's options — the server's, never typed into the client. */
  options: string[];
}

interface Props {
  group: AmenityGroupDef;
  value: string[];
  onChange: (next: string[]) => void;
  search: string;
  disabled: boolean;
  limits: OwnOptionLimits;
}

interface OptionChipProps {
  option: string;
  selected: boolean;
  disabled: boolean;
  onToggle: (option: string) => void;
}

/** One catalogue option, toggled on and off. */
function OptionChip({ option, selected, disabled, onToggle }: Readonly<OptionChipProps>) {
  return (
    <Chip
      label={option}
      clickable={!disabled}
      disabled={disabled}
      color={selected ? 'primary' : 'default'}
      variant={selected ? 'filled' : 'outlined'}
      aria-pressed={selected}
      onClick={disabled ? undefined : () => onToggle(option)}
    />
  );
}

/**
 * One list (Amenities, Facilities or Venue Security): the catalogue's options,
 * then the venue's own entries — removable, since they exist only while chosen —
 * then the "+" chip that adds another, all narrowed by the section's search.
 */
export default function AmenityGroup({ group, value, onChange, search, disabled, limits }: Readonly<Props>) {
  const { t } = useTranslation();
  const own = ownEntriesOf(value, group.options);
  const taken = useMemo(() => new Set(value.map(optionKey)), [value]);
  const options = group.options.filter((option) => matchesSearch(option, search));
  const ownShown = own.filter((entry) => matchesSearch(entry, search));
  const toggle = (option: string) =>
    onChange(
      taken.has(optionKey(option)) ? value.filter((item) => optionKey(item) !== optionKey(option)) : [...value, option],
    );
  const remove = (entry: string) => onChange(value.filter((item) => item !== entry));
  // A typed name the catalogue already offers picks that option, in the catalogue's spelling.
  const add = (entry: string) =>
    onChange([...value, group.options.find((option) => optionKey(option) === optionKey(entry)) ?? entry]);
  const canAdd = !disabled && own.length < limits.limit;
  const nothingMatches = search.trim() !== '' && options.length === 0 && ownShown.length === 0;

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
        {group.label}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {group.hint}
      </Typography>
      <Stack
        direction="row"
        role="group"
        aria-label={group.label}
        data-testid={`register-venue-${group.name}`}
        sx={{ flexWrap: 'wrap', gap: 1, alignItems: 'flex-start' }}
      >
        {options.map((option) => (
          <OptionChip
            key={option}
            option={option}
            selected={taken.has(optionKey(option))}
            disabled={disabled}
            onToggle={toggle}
          />
        ))}
        {ownShown.map((entry) => (
          <Chip
            key={entry}
            label={entry}
            color="primary"
            disabled={disabled}
            onDelete={disabled ? undefined : () => remove(entry)}
            aria-label={t('partners.registerVenuePage.removeOwnEntry', { vars: { entry } })}
          />
        ))}
        {canAdd && (
          <OwnEntry
            groupLabel={group.label}
            maxLength={limits.maxLength}
            taken={taken}
            initial={search.trim()}
            onAdd={add}
            testId={`register-venue-${group.name}-add`}
          />
        )}
      </Stack>
      {nothingMatches && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }} role="status">
          {t('partners.registerVenuePage.amenitySearchNoMatch', { vars: { term: search.trim() } })}
        </Typography>
      )}
      {!disabled && !canAdd && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('partners.registerVenuePage.ownEntryLimitReached', { vars: { limit: limits.limit } })}
        </Typography>
      )}
    </Stack>
  );
}
