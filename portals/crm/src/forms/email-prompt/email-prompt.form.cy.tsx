import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { EMAIL_PROMPT_MAX, EmailPromptForm, emailPromptSchema } from '.';
import { placeholdersIn } from './email-prompt.schema';
import { SYSTEM_PROMPT, USER_PROMPT } from '../../../__tests__/unit-tests/email-templates/settingsFixtures';

type Translate = Parameters<typeof emailPromptSchema>[0];

// Echoes the key, plus the vars it was given, so a message says which placeholders it names.
const t = ((key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}:${Object.values(options.vars).join('|')}` : key) as Translate;

const messages = (content: string, required: readonly string[] = ['instruction', 'current_mjml']) => {
  const result = emailPromptSchema(t, required).safeParse({ content });
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe('placeholdersIn', () => {
  it('finds every {{ name }}, with or without spaces inside the braces', () => {
    expect([...placeholdersIn('Hi {{ instruction }} and {{current_mjml}} and {{instruction}}')]).toEqual([
      'instruction',
      'current_mjml',
    ]);
  });

  it('ignores braces that never close and text with no placeholders', () => {
    expect(placeholdersIn('Write {{instruction')).toEqual(new Set());
    expect(placeholdersIn('')).toEqual(new Set());
    expect(placeholdersIn('{single} braces')).toEqual(new Set());
  });
});

describe('emailPromptSchema', () => {
  it('accepts a body that keeps every required placeholder, spaced or not', () => {
    expect(messages('Do {{ instruction }} on {{current_mjml}}')).toEqual([]);
  });

  it('names each required placeholder that was removed', () => {
    expect(messages('Do {{instruction}}')).toEqual(['crm.emailSettings.promptMissingVariables:{{current_mjml}}']);
    expect(messages('Just write an email')).toEqual([
      'crm.emailSettings.promptMissingVariables:{{instruction}}, {{current_mjml}}',
    ]);
  });

  it('takes any non-empty body when nothing is required', () => {
    expect(messages('Write a friendly email', [])).toEqual([]);
  });

  it('refuses an empty or blank body', () => {
    expect(messages('', [])).toEqual(['crm.emailSettings.promptRequired']);
    expect(messages('   \n ', [])).toEqual(['crm.emailSettings.promptRequired']);
  });

  it(`allows exactly ${EMAIL_PROMPT_MAX} characters and no more, after trimming`, () => {
    const tail = '{{instruction}}';
    const atLimit = 'x'.repeat(EMAIL_PROMPT_MAX - tail.length) + tail;
    expect(messages(atLimit, ['instruction'])).toEqual([]);
    expect(messages(`   ${atLimit}  `, ['instruction'])).toEqual([]);
    expect(messages(`x${atLimit}`, ['instruction'])).toEqual([`crm.emailSettings.promptTooLong:${EMAIL_PROMPT_MAX}`]);
  });
});

const renderForm = (props: Partial<Parameters<typeof EmailPromptForm>[0]> = {}) => {
  const onSubmit = vi.fn();
  const onReset = vi.fn();
  const view = render(<EmailPromptForm prompt={USER_PROMPT} onSubmit={onSubmit} onReset={onReset} {...props} />);
  return { ...view, onSubmit, onReset };
};

const input = (key = USER_PROMPT.key) => screen.getByTestId(`email-prompt-input-${key}`);
const saveButton = () => screen.getByRole('button', { name: 'Save prompt' });

describe('EmailPromptForm', () => {
  it('titles each prompt by its role', () => {
    const { rerender } = renderForm({ prompt: SYSTEM_PROMPT });
    expect(screen.getByRole('heading', { name: 'Instructions for the AI' })).toBeInTheDocument();
    expect(screen.getByText('How the AI writes: layout, tone and the rules every email follows.')).toBeInTheDocument();

    rerender(<EmailPromptForm prompt={USER_PROMPT} onSubmit={vi.fn()} onReset={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Request format' })).toBeInTheDocument();
  });

  it('lists the placeholders the CRM fills in and counts the characters', () => {
    renderForm();

    expect(screen.getByText('{{instruction}}')).toBeInTheDocument();
    expect(screen.getByText('{{current_mjml}}')).toBeInTheDocument();
    expect(input()).toHaveValue(USER_PROMPT.content);
    expect(screen.getByText(`${USER_PROMPT.content.length} / ${EMAIL_PROMPT_MAX} characters`)).toBeInTheDocument();
  });

  it('shows no placeholder chips for a prompt without any', () => {
    renderForm({ prompt: { ...SYSTEM_PROMPT, variables: [], content: 'Plain rules' } });
    expect(screen.queryByText(/\{\{/)).toBeNull();
  });

  it('saves an edited prompt, trimmed, and only once it has changed', async () => {
    const { onSubmit } = renderForm();
    expect(saveButton()).toBeDisabled();

    const typed = '  Brief: {{instruction}} / {{ current_mjml }}  ';
    fireEvent.change(input(), { target: { value: typed } });
    // The counter counts what is in the box, spaces included; the schema trims on save.
    expect(screen.getByText(`${typed.length} / ${EMAIL_PROMPT_MAX} characters`)).toBeInTheDocument();
    await waitFor(() => expect(saveButton()).toBeEnabled());
    fireEvent.click(saveButton());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({ content: 'Brief: {{instruction}} / {{ current_mjml }}' });
  });

  it('will not save a prompt that drops a required placeholder', async () => {
    const { onSubmit } = renderForm();

    fireEvent.change(input(), { target: { value: 'Brief: {{current_mjml}}' } });

    expect(await screen.findByText('Keep {{instruction}} in the prompt; the CRM fills them in.')).toBeInTheDocument();
    fireEvent.click(saveButton());
    await waitFor(() => expect(input()).toHaveAttribute('aria-invalid', 'true'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('will not save an empty prompt', async () => {
    const { onSubmit } = renderForm({ prompt: { ...SYSTEM_PROMPT, variables: [] } });

    fireEvent.change(input(SYSTEM_PROMPT.key), { target: { value: '   ' } });

    expect(await screen.findByText('The prompt cannot be empty')).toBeInTheDocument();
    fireEvent.click(saveButton());
    await waitFor(() => expect(input(SYSTEM_PROMPT.key)).toHaveAttribute('aria-invalid', 'true'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('asks the parent to reset, and keeps Save off while a reset runs', () => {
    const { onReset, rerender } = renderForm();

    fireEvent.click(screen.getByRole('button', { name: 'Reset to default' }));
    expect(onReset).toHaveBeenCalledTimes(1);

    fireEvent.change(input(), { target: { value: 'Changed {{instruction}}' } });
    rerender(<EmailPromptForm prompt={USER_PROMPT} resetting onSubmit={vi.fn()} onReset={onReset} />);
    expect(saveButton()).toBeDisabled();
  });

  it('locks Reset while a save runs', () => {
    renderForm({ submitting: true });
    expect(within(screen.getByTestId(`email-prompt-form-${USER_PROMPT.key}`)).getByRole('button', { name: 'Reset to default' })).toBeDisabled();
  });

  it('shows the server copy again after a save or reset brings new content', async () => {
    const { rerender, onSubmit, onReset } = renderForm();
    fireEvent.change(input(), { target: { value: 'Draft {{instruction}}' } });
    await waitFor(() => expect(saveButton()).toBeEnabled());

    rerender(
      <EmailPromptForm prompt={{ ...USER_PROMPT, content: 'Shipped {{instruction}}' }} onSubmit={onSubmit} onReset={onReset} />,
    );

    await waitFor(() => expect(input()).toHaveValue('Shipped {{instruction}}'));
    expect(saveButton()).toBeDisabled();
  });
});
