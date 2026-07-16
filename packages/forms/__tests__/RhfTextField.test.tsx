import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, type Control } from 'react-hook-form';
import RhfTextField, { type RhfTextFieldProps } from '../src/RhfTextField';

interface Values {
  name: string | null;
}

type HarnessProps = Omit<RhfTextFieldProps<Values>, 'control' | 'name'> & {
  defaultValue?: string | null;
};

function Harness({ defaultValue = '', ...props }: Readonly<HarnessProps>) {
  const { control, setError } = useForm<Values>({ defaultValues: { name: defaultValue } });
  return (
    <>
      <RhfTextField control={control as Control<Values>} name="name" label="Name" {...props} />
      <button type="button" onClick={() => setError('name', { message: 'Name is required' })}>
        break
      </button>
    </>
  );
}

const input = () => screen.getByLabelText('Name') as HTMLInputElement;

describe('RhfTextField', () => {
  it('renders the field and updates the value as the user types', async () => {
    render(<Harness />);
    await userEvent.type(input(), 'Acme');
    expect(input().value).toBe('Acme');
  });

  it('coerces a null field value to an empty string', () => {
    render(<Harness defaultValue={null} />);
    expect(input().value).toBe('');
  });

  it('shows the hint as helper text when there is no error', () => {
    render(<Harness hint="Your full name" />);
    expect(screen.getByText('Your full name')).toBeInTheDocument();
  });

  it('shows the validation message and error state once the field errors', async () => {
    const { container } = render(<Harness hint="Your full name" />);
    await userEvent.click(screen.getByRole('button', { name: 'break' }));
    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(screen.queryByText('Your full name')).not.toBeInTheDocument();
    expect(container.querySelector('.Mui-error')).toBeInTheDocument();
  });

  it('renders a single blank-space helper when neither hint nor error is present', () => {
    const { container } = render(<Harness />);
    const helper = container.querySelector('.MuiFormHelperText-root');
    expect(helper).toBeInTheDocument();
    // MUI renders a single-space helper as a zero-width space to preserve height.
    expect((helper?.textContent ?? 'x').replace(/[\s​]/g, '')).toBe('');
  });

  it('supports select passthrough props and an explicit fullWidth override', () => {
    render(
      <Harness select SelectProps={{ native: true }} fullWidth={false}>
        <option value="a">A</option>
      </Harness>,
    );
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('supports the multiline passthrough prop', () => {
    render(<Harness multiline minRows={3} />);
    expect(input().tagName).toBe('TEXTAREA');
  });
});
