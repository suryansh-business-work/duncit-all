import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import * as yup from 'yup';
import { Formik, Form } from 'formik';
import FormField from './FormField';

const renderField = (props: Record<string, unknown>, initial = { name: '' }) =>
  render(
    <Formik
      initialValues={initial}
      validationSchema={yup.object({ name: yup.string().required('Name is required') })}
      onSubmit={() => {}}
    >
      <Form>
        <FormField label="Name" {...props} name="name" />
        <button type="submit">go</button>
      </Form>
    </Formik>,
  );

describe('FormField', () => {
  it('shows the hint when there is no error and respects explicit fullWidth', () => {
    renderField({ hint: 'Helpful hint', fullWidth: false });
    expect(screen.getByText('Helpful hint')).toBeInTheDocument();
  });

  it('falls back to a blank helper when no hint is provided', () => {
    const { container } = renderField({});
    expect(container.querySelector('.MuiFormHelperText-root')).toBeInTheDocument();
  });

  it('shows the validation error once the field is touched', async () => {
    renderField({ hint: 'Helpful hint' }, { name: 'seed' });
    const input = screen.getByLabelText('Name');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    expect(await screen.findByText('Name is required')).toBeInTheDocument();
  });

  it('shows the error when the value changed even before blur', async () => {
    renderField({ hint: 'Helpful hint' }, { name: 'seed' });
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: '' } });
    expect(await screen.findByText('Name is required')).toBeInTheDocument();
  });
});
