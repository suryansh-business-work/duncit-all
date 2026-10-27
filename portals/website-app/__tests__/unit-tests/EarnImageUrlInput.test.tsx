import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import EarnImageUrlInput from '../../src/pages/website/earn/earn-form/EarnImageUrlInput';
import { en, label } from '../en';

const mount = (props: Partial<Parameters<typeof EarnImageUrlInput>[0]> = {}) => {
  const onAdd = vi.fn();
  render(<EarnImageUrlInput disabled={false} existing={[]} onAdd={onAdd} {...props} />);
  return {
    onAdd,
    field: screen.getByLabelText(label('websiteApp.earn.imageUrl')) as HTMLInputElement,
    add: () => screen.getByRole('button', { name: en('websiteApp.earn.addImageUrl') }),
  };
};

describe('EarnImageUrlInput', () => {
  it('keeps the add button off until something is typed', () => {
    const { field, add } = mount();
    expect(add()).toBeDisabled();
    fireEvent.change(field, { target: { value: '   ' } });
    expect(add()).toBeDisabled();
    fireEvent.change(field, { target: { value: 'https://ik.test/a.jpg' } });
    expect(add()).toBeEnabled();
  });

  it('adds a trimmed https link and clears the box', () => {
    const { field, add, onAdd } = mount();
    fireEvent.change(field, { target: { value: '  https://ik.test/a.jpg ' } });
    fireEvent.click(add());
    expect(onAdd).toHaveBeenCalledWith('https://ik.test/a.jpg');
    expect(field.value).toBe('');
    expect(screen.getByText(en('websiteApp.earn.imageUrlHint'))).toBeInTheDocument();
  });

  it('adds on Enter without submitting the surrounding form', () => {
    const { field, onAdd } = mount();
    fireEvent.change(field, { target: { value: 'https://ik.test/a.jpg' } });
    const notPrevented = fireEvent.keyDown(field, { key: 'Enter' });
    expect(notPrevented).toBe(false);
    expect(onAdd).toHaveBeenCalledWith('https://ik.test/a.jpg');
  });

  it('ignores other keys', () => {
    const { field, onAdd } = mount();
    fireEvent.change(field, { target: { value: 'https://ik.test/a.jpg' } });
    expect(fireEvent.keyDown(field, { key: 'a' })).toBe(true);
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('refuses a link that is not https and keeps what was typed', () => {
    const { field, add, onAdd } = mount();
    fireEvent.change(field, { target: { value: 'http://ik.test/a.jpg' } });
    fireEvent.click(add());
    expect(screen.getByText(en('websiteApp.earn.errHttps'))).toBeInTheDocument();
    expect(onAdd).not.toHaveBeenCalled();
    expect(field.value).toBe('http://ik.test/a.jpg');
  });

  it('refuses a photo that is already in the list', () => {
    const { field, add, onAdd } = mount({ existing: ['https://ik.test/a.jpg'] });
    fireEvent.change(field, { target: { value: 'https://ik.test/a.jpg' } });
    fireEvent.click(add());
    expect(screen.getByText(en('websiteApp.earn.errDuplicate'))).toBeInTheDocument();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('clears an earlier complaint once a good link is added', () => {
    const { field, add, onAdd } = mount();
    fireEvent.change(field, { target: { value: 'nope' } });
    fireEvent.click(add());
    expect(screen.getByText(en('websiteApp.earn.errHttps'))).toBeInTheDocument();
    fireEvent.change(field, { target: { value: 'https://ik.test/b.jpg' } });
    fireEvent.click(add());
    expect(onAdd).toHaveBeenCalledWith('https://ik.test/b.jpg');
    expect(screen.queryByText(en('websiteApp.earn.errHttps'))).not.toBeInTheDocument();
  });

  it('locks the box and the button while disabled', () => {
    const { field, add } = mount({ disabled: true });
    expect(field).toBeDisabled();
    expect(add()).toBeDisabled();
  });
});
