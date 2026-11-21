import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { SaveCalculationForm, saveCalculationSchema } from '.';
import { savedCalculation } from '../../../../__tests__/fixtures';

type Translate = Parameters<typeof saveCalculationSchema>[0];
const t = ((key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}:${Object.values(options.vars).join('|')}` : key) as Translate;

const issues = (values: { title: string; description: string }) => {
  const result = saveCalculationSchema(t).safeParse(values);
  return result.success ? [] : result.error.issues.map((i) => i.message);
};

function renderForm(props: Partial<Parameters<typeof SaveCalculationForm>[0]> = {}) {
  const onSubmit = props.onSubmit ?? vi.fn().mockResolvedValue(true);
  const onCancelEdit = props.onCancelEdit ?? vi.fn();
  render(
    <MockedProvider mocks={[]}>
      <SaveCalculationForm
        editing={null}
        canSave
        calculatedBy="Asha Planner"
        onSubmit={onSubmit}
        onCancelEdit={onCancelEdit}
        {...props}
      />
    </MockedProvider>
  );
  return { onSubmit, onCancelEdit };
}

const field = (id: string) => screen.getByTestId(id) as HTMLInputElement;

describe('saveCalculationSchema', () => {
  it('requires a title, trims both fields and holds them to the server limits', () => {
    expect(issues({ title: '   ', description: '' })).toEqual(['targets.growth.save.titleRequired']);
    expect(issues({ title: 'x'.repeat(121), description: '' })).toEqual(['targets.growth.save.tooLong:120']);
    expect(issues({ title: 'ok', description: 'y'.repeat(1001) })).toEqual(['targets.growth.save.tooLong:1000']);
    expect(issues({ title: 'x'.repeat(120), description: 'y'.repeat(1000) })).toEqual([]);
    expect(saveCalculationSchema(t).parse({ title: '  Plan  ', description: ' note ' })).toEqual({ title: 'Plan', description: 'note' });
  });
});

describe('SaveCalculationForm', () => {
  it('shows who it is calculated by and that the date is set on save', () => {
    renderForm();
    expect(field('save-calculation-by').value).toBe('Asha Planner');
    expect(field('save-calculation-by')).toHaveAttribute('readonly');
    expect(field('save-calculation-at').value).toBe('Set when you save');
  });

  it('refuses to save without a title', async () => {
    const { onSubmit } = renderForm();
    fireEvent.click(screen.getByTestId('save-calculation-submit'));
    expect(await screen.findByText('Enter a title')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the trimmed title and description, then clears for the next one', async () => {
    const { onSubmit } = renderForm();
    fireEvent.change(field('save-calculation-title'), { target: { value: '  Ten cities  ' } });
    fireEvent.change(field('save-calculation-description'), { target: { value: 'First pass' } });
    fireEvent.click(screen.getByTestId('save-calculation-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ title: 'Ten cities', description: 'First pass' }));
    await waitFor(() => expect(field('save-calculation-title').value).toBe(''));
  });

  it('keeps what was typed when the save fails', async () => {
    const { onSubmit } = renderForm({ onSubmit: vi.fn().mockResolvedValue(false) });
    fireEvent.change(field('save-calculation-title'), { target: { value: 'Keep me' } });
    fireEvent.click(screen.getByTestId('save-calculation-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(field('save-calculation-title').value).toBe('Keep me');
  });

  it('cannot be submitted while an assumption is invalid', () => {
    renderForm({ canSave: false });
    expect(screen.getByText('Fix the highlighted assumptions before saving.')).toBeInTheDocument();
    expect(screen.getByTestId('save-calculation-submit')).toBeDisabled();
  });

  it('edits a saved record under its original creator and date', async () => {
    const editing = savedCalculation({ title: 'Metro push', description: 'Mumbai' });
    const { onSubmit, onCancelEdit } = renderForm({ editing });
    await waitFor(() => expect(field('save-calculation-title').value).toBe('Metro push'));
    expect(field('save-calculation-description').value).toBe('Mumbai');
    expect(field('save-calculation-by').value).toBe('Asha Planner');
    expect(field('save-calculation-at').value).not.toBe('Set when you save');
    expect(screen.getByText(/Editing "Metro push"/)).toBeInTheDocument();
    expect(screen.getByTestId('save-calculation-submit')).toHaveTextContent('Update calculation');

    fireEvent.click(screen.getByTestId('save-calculation-cancel'));
    expect(onCancelEdit).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId('save-calculation-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ title: 'Metro push', description: 'Mumbai' }));
  });
});
