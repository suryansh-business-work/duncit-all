import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { EmailThemeForm, emailThemeSchema, themeToForm, type EmailThemeFormValues } from '.';
import { duncitDefaults, fonts, savedTheme } from '../../../__tests__/unit-tests/email-templates/settingsFixtures';

// The schema takes the surface's translator; echoing keys keeps the messages assertable.
const schema = emailThemeSchema(((key: string) => key) as Parameters<typeof emailThemeSchema>[0]);
const valid = themeToForm(savedTheme);

const messages = (patch: Partial<Record<keyof EmailThemeFormValues, unknown>>) => {
  const result = schema.safeParse({ ...valid, ...patch });
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe('emailThemeSchema', () => {
  it('accepts a saved theme as it is', () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it('accepts three- and six-digit hex colours and trims the spaces around them', () => {
    const result = schema.safeParse({ ...valid, primary_color: '  #fff ', dark_text_color: '#a1B2c3' });
    expect(result.success && result.data.primary_color).toBe('#fff');
    expect(result.success && result.data.dark_text_color).toBe('#a1B2c3');
  });

  it.each(['red', '#12345', '#1234567', '#GGGGGG', '123456', ''])('refuses "%s" as a colour', (value) => {
    expect(messages({ accent_color: value })).toEqual(['crm.emailSettings.colorInvalid']);
  });

  it('checks the dark palette too', () => {
    expect(messages({ dark_card_color: 'black' })).toEqual(['crm.emailSettings.colorInvalid']);
  });

  it.each([
    ['base_font_size', 13, 18],
    ['content_padding', 16, 48],
    ['button_radius', 0, 28],
    ['panel_radius', 0, 28],
  ] as const)('keeps %s between %i and %i px', (field, min, max) => {
    expect(messages({ [field]: min })).toEqual([]);
    expect(messages({ [field]: max })).toEqual([]);
    expect(messages({ [field]: min - 1 })).toEqual(['crm.emailSettings.rangeInvalid']);
    expect(messages({ [field]: max + 1 })).toEqual(['crm.emailSettings.rangeInvalid']);
  });

  it('refuses a fractional pixel value', () => {
    expect(messages({ base_font_size: 14.5 })).toEqual(['crm.emailSettings.rangeInvalid']);
  });

  it('asks for both fonts', () => {
    expect(messages({ body_font: '' })).toEqual(['crm.emailSettings.fontRequired']);
    expect(messages({ heading_font: '' })).toEqual(['crm.emailSettings.fontRequired']);
  });

  it('only knows the AUTO and LIGHT colour modes', () => {
    expect(messages({ color_mode: 'LIGHT' })).toEqual([]);
    expect(messages({ color_mode: 'DARK' })).toHaveLength(1);
  });
});

describe('themeToForm', () => {
  it('keeps exactly the fields the form edits, dropping anything else the server sent', () => {
    const fromServer = { ...savedTheme, __typename: 'CrmEmailTheme', updated_at: 'x' } as typeof savedTheme;
    const form = themeToForm(fromServer);
    expect(Object.keys(form).sort()).toEqual(Object.keys(savedTheme).sort());
    expect(form).toEqual(savedTheme);
  });
});

const field = (name: keyof EmailThemeFormValues) => screen.getByTestId(`theme-${name}`) as HTMLInputElement;
const save = () => screen.getByTestId('email-theme-save');

const renderForm = (props: Partial<Parameters<typeof EmailThemeForm>[0]> = {}) => {
  const onSubmit = vi.fn();
  const onPreview = vi.fn();
  const view = render(
    <EmailThemeForm
      initialValues={savedTheme}
      defaults={duncitDefaults}
      fonts={fonts}
      onSubmit={onSubmit}
      onPreview={onPreview}
      {...props}
    />,
  );
  return { ...view, onSubmit, onPreview };
};

describe('EmailThemeForm', () => {
  it('starts on the saved theme, with Save off until something changes', async () => {
    const { onSubmit } = renderForm();

    expect(field('primary_color')).toHaveValue('#D92D2D');
    expect(screen.getByRole('slider', { name: 'Body text size' })).toHaveValue('15');
    expect(save()).toBeDisabled();

    fireEvent.change(field('primary_color'), { target: { value: ' #123456 ' } });
    await waitFor(() => expect(save()).toBeEnabled());
    fireEvent.click(save());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({ ...valid, primary_color: '#123456' });
  });

  it('shows why a colour is refused and does not save it', async () => {
    const { onSubmit } = renderForm();

    fireEvent.change(field('heading_color'), { target: { value: '#12' } });

    expect(await screen.findByText('Enter a hex colour like #D92D2D')).toBeInTheDocument();
    expect(field('heading_color')).toHaveAttribute('aria-invalid', 'true');
    fireEvent.click(save());
    await waitFor(() => expect(field('heading_color')).toHaveAttribute('aria-invalid', 'true'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('hands only valid themes to the live preview', async () => {
    const { onPreview } = renderForm();
    await waitFor(() => expect(onPreview).toHaveBeenLastCalledWith(valid));

    fireEvent.change(field('text_color'), { target: { value: 'grey' } });
    await screen.findByText('Enter a hex colour like #D92D2D');
    expect(onPreview.mock.calls.some(([values]) => values.text_color === 'grey')).toBe(false);

    fireEvent.change(field('text_color'), { target: { value: '#444444' } });
    await waitFor(() => expect(onPreview).toHaveBeenLastCalledWith({ ...valid, text_color: '#444444' }));
  });

  it('fills in the Duncit defaults without saving them until Save is pressed', async () => {
    const { onSubmit } = renderForm();

    fireEvent.click(screen.getByRole('button', { name: 'Use Duncit defaults' }));

    await waitFor(() => expect(field('primary_color')).toHaveValue('#E63946'));
    expect(screen.getByRole('slider', { name: 'Body text size' })).toHaveValue('16');
    expect(onSubmit).not.toHaveBeenCalled();
    await waitFor(() => expect(save()).toBeEnabled());

    fireEvent.click(save());
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual(themeToForm(duncitDefaults));
  });

  it('shows the dark palette only while emails follow the reader’s mail app', async () => {
    renderForm();

    expect(field('dark_background_color')).toHaveValue('#111111');
    expect(screen.getByRole('radio', { name: 'Follow the reader\'s mail app (light or dark)' })).toBeChecked();

    fireEvent.click(screen.getByRole('radio', { name: 'Always light' }));
    expect(await screen.findByText('Emails stay light even when the reader uses dark mode.')).toBeInTheDocument();
    expect(screen.queryByTestId('theme-dark_background_color')).toBeNull();

    fireEvent.click(screen.getByRole('radio', { name: 'Follow the reader\'s mail app (light or dark)' }));
    // Hidden fields keep what was typed: the palette comes back as it was.
    expect(await screen.findByTestId('theme-dark_background_color')).toHaveValue('#111111');
  });

  it('sets a pixel value from its slider and shows it beside the label', async () => {
    const { onSubmit } = renderForm();

    fireEvent.change(screen.getByRole('slider', { name: 'Side padding' }), { target: { value: 40 } });

    expect(await screen.findByText('40 px')).toBeInTheDocument();
    await waitFor(() => expect(save()).toBeEnabled());
    fireEvent.click(save());
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ content_padding: 40 });
  });

  it('offers the server’s fonts for the headings and the body', async () => {
    const { onSubmit } = renderForm();

    fireEvent.mouseDown(screen.getByRole('combobox', { name: /^Heading font/ }));
    const list = within(await screen.findByRole('listbox'));
    expect(list.getAllByRole('option').map((option) => option.textContent)).toEqual(['Inter', 'Georgia']);
    fireEvent.click(list.getByRole('option', { name: 'Georgia' }));

    await waitFor(() => expect(save()).toBeEnabled());
    fireEvent.click(save());
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ heading_font: 'georgia', body_font: 'inter' });
  });

  it('starts over from a newly saved theme', async () => {
    const { rerender, onSubmit, onPreview } = renderForm();
    fireEvent.change(field('primary_color'), { target: { value: '#123456' } });
    await waitFor(() => expect(save()).toBeEnabled());

    const next = { ...savedTheme, primary_color: '#000000' };
    rerender(<EmailThemeForm initialValues={next} defaults={duncitDefaults} fonts={fonts} onSubmit={onSubmit} onPreview={onPreview} />);

    await waitFor(() => expect(field('primary_color')).toHaveValue('#000000'));
    expect(save()).toBeDisabled();
  });

  it('locks the defaults button while saving', () => {
    renderForm({ submitting: true });
    expect(screen.getByRole('button', { name: 'Use Duncit defaults' })).toBeDisabled();
    expect(save()).toBeDisabled();
  });
});
