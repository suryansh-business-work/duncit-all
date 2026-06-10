import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Form, Formik } from 'formik';
import * as yup from 'yup';
import FormField, { Field } from '../../src/forms/FormField';

const schema = yup.object({ email: yup.string().email('Enter a valid email').required('Email is required') });

function Harness({ hint, fullWidth }: { hint?: string; fullWidth?: boolean }) {
  return (
    <Formik initialValues={{ email: '' }} validationSchema={schema} onSubmit={() => undefined}>
      <Form>
        <FormField name="email" label="Email" hint={hint} fullWidth={fullWidth} />
      </Form>
    </Formik>
  );
}

describe('FormField', () => {
  it('shows the hint when there is no error', () => {
    render(<Harness hint="Use your work email." />);
    expect(screen.getByText('Use your work email.')).toBeInTheDocument();
  });

  it('renders a blank helper when no hint is provided', () => {
    const { container } = render(<Harness />);
    // helperText falls back to a single space so layout never jumps (MUI may
    // render it as a zero-width space placeholder).
    const helper = container.querySelector('.MuiFormHelperText-root');
    expect(helper).toBeTruthy();
    expect(helper?.textContent?.replace(/[\s​]/g, '')).toBe('');
  });

  it('surfaces the validation error after the value changes', async () => {
    render(<Harness hint="hint" />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'not-an-email' } });
    await waitFor(() => expect(screen.getByText('Enter a valid email')).toBeInTheDocument());
  });

  it('surfaces the required error after the field is touched (no change)', async () => {
    render(<Harness hint="hint" />);
    fireEvent.blur(screen.getByLabelText('Email'));
    await waitFor(() => expect(screen.getByText('Email is required')).toBeInTheDocument());
  });

  it('respects an explicit fullWidth={false}', () => {
    const { container } = render(<Harness fullWidth={false} />);
    expect(container.querySelector('.MuiFormControl-fullWidth')).toBeNull();
  });

  it('re-exports Formik Field', () => {
    expect(Field).toBeTruthy();
  });
});
