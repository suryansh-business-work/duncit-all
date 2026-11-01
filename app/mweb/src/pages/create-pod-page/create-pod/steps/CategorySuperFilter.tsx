import { ButtonBase, Typography } from '@mui/material';
import type { CreatePodSuperOption } from '@duncit/utils';
import CategoryChipRow from './CategoryChipRow';

interface Props {
  options: readonly CreatePodSuperOption[];
  value: string;
  onChange: (id: string) => void;
  /** Names the row for screen readers ("Who the pod is for", "Category"). */
  label: string;
  testId: string;
}

/** One level of the category picker — "For You" / "For Your Pet", or "Sports" /
 * "Creative" — as a row of pills that scrolls sideways when it outgrows the screen. */
export default function CategorySuperFilter({ options, value, onChange, label, testId }: Readonly<Props>) {
  return (
    <CategoryChipRow label={label} testId={testId}>
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <ButtonBase
            key={option.id}
            data-testid={`${testId}-${option.id}`}
            aria-pressed={selected}
            onClick={() => onChange(option.id)}
            sx={{
              flexShrink: 0,
              minHeight: 36,
              px: 1.75,
              borderRadius: 999,
              border: 1,
              borderColor: selected ? 'primary.main' : 'divider',
              color: selected ? 'primary.contrastText' : 'text.primary',
              bgcolor: selected ? 'primary.main' : 'transparent',
              transition: (theme) => theme.transitions.create(['background-color', 'border-color', 'color']),
            }}
          >
            <Typography noWrap sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>{option.name}</Typography>
          </ButtonBase>
        );
      })}
    </CategoryChipRow>
  );
}
