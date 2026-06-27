import { render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

import RhfTextField from './RhfTextField';

interface Values {
  name: string;
}

function Harness({ hint }: Readonly<{ hint?: string }>) {
  const { control } = useForm<Values>({ defaultValues: { name: '' } });
  return <RhfTextField control={control} name="name" label="Name" hint={hint} />;
}

describe('RhfTextField', () => {
  it('renders the hint when there is no error', () => {
    render(<Harness hint="Pick a name." />);
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByText('Pick a name.')).toBeInTheDocument();
  });

  it('renders a blank helper space when no hint is supplied', () => {
    const { container } = render(<Harness />);
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    // The ' ' fallback carries no visible guidance text (MUI collapses an
    // all-whitespace helperText to a zero-width placeholder).
    const helper = container.querySelector('.MuiFormHelperText-root');
    const visible = (helper?.textContent ?? '').replace(/\s|​/g, '');
    expect(visible).toBe('');
  });
});
