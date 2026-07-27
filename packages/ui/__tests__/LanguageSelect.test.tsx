import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageSelect, type LanguageOption } from '../src/LanguageSelect';

const OPTIONS: readonly LanguageOption[] = [
  { code: 'en', label: 'English', english_label: 'English' },
  { code: 'hi', label: 'हिन्दी', english_label: 'Hindi' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'bn', label: 'বাংলা', english_label: null },
];

describe('LanguageSelect', () => {
  it('renders nothing when the platform offers a single language', () => {
    const { container } = render(
      <LanguageSelect value="en" options={[OPTIONS[0]]} onChange={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when there are no languages at all', () => {
    const { container } = render(<LanguageSelect value="en" options={[]} onChange={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the selected language in its own script beside the English name', () => {
    render(<LanguageSelect value="hi" options={OPTIONS} onChange={vi.fn()} />);
    expect(screen.getByRole('combobox')).toHaveTextContent('हिन्दी · Hindi');
  });

  it('falls back to the first option when the value is not one of the options', () => {
    render(<LanguageSelect value="fr" options={OPTIONS} onChange={vi.fn()} />);
    expect(screen.getByRole('combobox')).toHaveTextContent('English · English');
  });

  it('uses the default "Language" label, small size and full width', () => {
    const { container } = render(
      <LanguageSelect value="en" options={OPTIONS} onChange={vi.fn()} />,
    );
    expect(screen.getByLabelText('Language')).toBeInTheDocument();
    expect(container.querySelector('.MuiInputBase-sizeSmall')).toBeInTheDocument();
    expect(container.querySelector('.MuiFormControl-fullWidth')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).not.toHaveAttribute('aria-disabled');
  });

  it('honors a custom label, helper text, medium size, non-full width and disabled', () => {
    const { container } = render(
      <LanguageSelect
        value="en"
        options={OPTIONS}
        onChange={vi.fn()}
        label="App language"
        helperText="Applies everywhere you are signed in"
        size="medium"
        fullWidth={false}
        disabled
      />,
    );
    expect(screen.getByLabelText('App language')).toBeInTheDocument();
    expect(screen.getByText('Applies everywhere you are signed in')).toBeInTheDocument();
    expect(container.querySelector('.MuiInputBase-sizeSmall')).not.toBeInTheDocument();
    expect(container.querySelector('.MuiFormControl-fullWidth')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-disabled', 'true');
  });

  it('omits the separator for a language with no English name', async () => {
    render(<LanguageSelect value="en" options={OPTIONS} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole('combobox'));
    expect(screen.getByRole('option', { name: 'தமிழ்' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'বাংলা' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'हिन्दी · Hindi' })).toBeInTheDocument();
  });

  it('calls onChange with the picked language code', async () => {
    const onChange = vi.fn();
    render(<LanguageSelect value="en" options={OPTIONS} onChange={onChange} />);
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(screen.getByRole('option', { name: 'हिन्दी · Hindi' }));
    expect(onChange).toHaveBeenCalledWith('hi');
  });
});
