import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CreateTemplateForm from './CreateTemplateForm';

const typeInto = (label: string, value: string) => {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
};

describe('CreateTemplateForm', () => {
  it('keeps Create disabled until all fields are filled, sanitises the slug, and submits', () => {
    const onCreate = vi.fn();
    const onCancel = vi.fn();
    render(<CreateTemplateForm onCancel={onCancel} onCreate={onCreate} />);

    const createBtn = screen.getByRole('button', { name: 'Create' });
    expect(createBtn).toBeDisabled();

    // Slug input lowercases and replaces invalid chars with dashes.
    typeInto('Slug', 'Welcome Email!');
    expect((screen.getByLabelText('Slug') as HTMLInputElement).value).toBe('welcome-email-');
    typeInto('Name', 'Welcome');
    typeInto('Subject', 'Hello there');

    expect(createBtn).not.toBeDisabled();
    fireEvent.click(createBtn);
    expect(onCreate).toHaveBeenCalledWith({ slug: 'welcome-email-', name: 'Welcome', subject: 'Hello there' });
  });

  it('fires onCancel', () => {
    const onCancel = vi.fn();
    render(<CreateTemplateForm onCancel={onCancel} onCreate={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });
});
