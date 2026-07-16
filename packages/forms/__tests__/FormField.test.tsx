import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, FormProvider, type Control } from 'react-hook-form';
import FormField, { type FormFieldProps } from '../src/FormField';

interface Values {
  name: string | null;
}

type HarnessProps = Omit<FormFieldProps<Values>, 'name'> & {
  defaultValue?: string | null;
  errorPayload?: { message?: string };
  useProvider?: boolean;
};

function FormFieldHarness({
  defaultValue = '',
  errorPayload = { message: 'Name is required' },
  useProvider = false,
  ...props
}: Readonly<HarnessProps>) {
  const methods = useForm<Values>({ defaultValues: { name: defaultValue } });
  const field = (
    <FormField<Values>
      name="name"
      label="Name"
      control={useProvider ? undefined : (methods.control as Control<Values>)}
      {...props}
    />
  );
  const body = (
    <>
      {field}
      <button type="button" onClick={() => methods.setError('name', errorPayload)}>
        break
      </button>
    </>
  );
  return useProvider ? <FormProvider {...methods}>{body}</FormProvider> : body;
}

const input = () => screen.getByLabelText('Name') as HTMLInputElement;

describe('FormField', () => {
  it('renders with an explicit control and coerces null values to empty strings', () => {
    render(<FormFieldHarness defaultValue={null} />);
    expect(input().value).toBe('');
  });

  it('resolves control from the surrounding FormProvider and updates on typing', async () => {
    render(<FormFieldHarness useProvider />);
    await userEvent.type(input(), 'Bob');
    expect(input().value).toBe('Bob');
  });

  it('shows the hint when there is no error (errorMode always)', () => {
    render(<FormFieldHarness hint="Full legal name" />);
    expect(screen.getByText('Full legal name')).toBeInTheDocument();
  });

  it('surfaces the error immediately with the default always errorMode', async () => {
    const { container } = render(<FormFieldHarness hint="Full legal name" />);
    await userEvent.click(screen.getByRole('button', { name: 'break' }));
    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(container.querySelector('.Mui-error')).toBeInTheDocument();
  });

  it('falls back to the hint text when the error has no message', async () => {
    const { container } = render(<FormFieldHarness hint="Full legal name" errorPayload={{}} />);
    await userEvent.click(screen.getByRole('button', { name: 'break' }));
    expect(container.querySelector('.Mui-error')).toBeInTheDocument();
    expect(screen.getByText('Full legal name')).toBeInTheDocument();
  });

  it('hides the error until the field is dirty with errorMode touchedOrDirty', async () => {
    const { container } = render(
      <FormFieldHarness errorMode="touchedOrDirty" hint="guidance" />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'break' }));
    // Error exists in state but field is neither touched nor dirty -> not shown.
    expect(container.querySelector('.Mui-error')).not.toBeInTheDocument();
    expect(screen.queryByText('Name is required')).not.toBeInTheDocument();

    await userEvent.type(input(), 'x');
    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(container.querySelector('.Mui-error')).toBeInTheDocument();
  });

  it('renders a blank-space helper when neither hint nor error is present', () => {
    const { container } = render(<FormFieldHarness />);
    const helper = container.querySelector('.MuiFormHelperText-root');
    expect(helper).toBeInTheDocument();
    // MUI renders a single-space helper as a zero-width space to preserve height.
    expect((helper?.textContent ?? 'x').replace(/[\s​]/g, '')).toBe('');
  });
});
