import { describe, expect, it } from 'vitest';
import * as yup from 'yup';
import { Formik, Form } from 'formik';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FormField from './FormField';

const schema = yup.object({ email: yup.string().email('Enter a valid email').required('Email is required') });

const harness = (props: Partial<React.ComponentProps<typeof FormField>> = {}) =>
  render(
    <Formik initialValues={{ email: '' }} validationSchema={schema} onSubmit={() => {}}>
      <Form>
        <FormField name="email" label="Email" {...props} />
      </Form>
    </Formik>
  );

describe('FormField', () => {
  it('shows the hint when there is no error', () => {
    harness({ hint: 'Use your work email' });
    expect(screen.getByText('Use your work email')).toBeInTheDocument();
  });

  it('renders a blank helper when no hint is supplied', () => {
    const { container } = harness();
    const helper = container.querySelector('.MuiFormHelperText-root');
    // No hint → helperText falls back to a blank space; MUI may render it as a
    // zero-width placeholder. The point is that no error text is shown.
    expect((helper?.textContent ?? '').trim().replace(/​/g, '')).toBe('');
  });

  it('shows the validation error after the value changes (touched via change)', async () => {
    harness({ hint: 'h' });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'nope' } });
    await waitFor(() => expect(screen.getByText('Enter a valid email')).toBeInTheDocument());
  });

  it('shows the required error after blur', async () => {
    harness({ hint: 'h' });
    const input = screen.getByLabelText('Email');
    fireEvent.blur(input);
    await waitFor(() => expect(screen.getByText('Email is required')).toBeInTheDocument());
  });

  it('respects an explicit fullWidth={false}', () => {
    const { container } = harness({ fullWidth: false });
    expect(container.querySelector('.MuiFormControl-fullWidth')).toBeNull();
  });
});
