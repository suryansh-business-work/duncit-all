import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LiteLocale } from '../../../graphql/localization';
import { LocalesPanel } from '../../../pages/localization/LocalesPanel';
import { makeLocale } from '../../fixtures';

const english = makeLocale();
const urdu = makeLocale({ code: 'ur', label: 'اردو', english_label: 'Urdu', is_rtl: true, is_default: false, is_active: false, translated_count: 12 });

const setup = (over: Partial<{ selectedCode: string | null; importing: boolean; locales: LiteLocale[] }> = {}) => {
  const handlers = { onSelect: vi.fn(), onAdd: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn(), onImport: vi.fn() };
  render(<LocalesPanel locales={over.locales ?? [english, urdu]} selectedCode={over.selectedCode ?? 'en-IN'} importing={over.importing ?? false} {...handlers} />);
  return { user: userEvent.setup(), handlers };
};

describe('LocalesPanel', () => {
  it('lists each language with its names, code and translated count', () => {
    setup();
    const list = within(screen.getByRole('list', { name: 'Languages' }));
    expect(list.getAllByRole('listitem')).toHaveLength(2);
    expect(list.getByText('English · en-IN · 320 translated')).toBeInTheDocument();
    expect(list.getByText('Urdu · ur · 12 translated')).toBeInTheDocument();
  });

  it('marks the default, right-to-left and inactive languages', () => {
    setup();
    const englishRow = within(screen.getByTestId('locale-select-en-IN'));
    expect(englishRow.getByText('Default')).toBeInTheDocument();
    expect(englishRow.queryByText('Right to left')).not.toBeInTheDocument();
    const urduRow = within(screen.getByTestId('locale-select-ur'));
    expect(urduRow.getByText('Right to left')).toBeInTheDocument();
    expect(urduRow.getByText('Inactive')).toBeInTheDocument();
    expect(urduRow.queryByText('Default')).not.toBeInTheDocument();
  });

  it('highlights the selected language and picks another on click', async () => {
    const { user, handlers } = setup({ selectedCode: 'ur' });
    expect(screen.getByTestId('locale-select-ur')).toHaveClass('Mui-selected');
    expect(screen.getByTestId('locale-select-en-IN')).not.toHaveClass('Mui-selected');
    await user.click(screen.getByTestId('locale-select-en-IN'));
    expect(handlers.onSelect).toHaveBeenCalledWith(english);
  });

  it('names edit and delete after the language and never lets the default be deleted', async () => {
    const { user, handlers } = setup();
    expect(screen.getByRole('button', { name: 'Delete English' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Edit Urdu' }));
    await user.click(screen.getByRole('button', { name: 'Delete Urdu' }));
    expect(handlers.onEdit).toHaveBeenCalledWith(urdu);
    expect(handlers.onDelete).toHaveBeenCalledWith(urdu);
  });

  it('adds a language and imports the app keys from its buttons', async () => {
    const { user, handlers } = setup();
    await user.click(screen.getByRole('button', { name: 'Add language' }));
    await user.click(screen.getByRole('button', { name: 'Import app keys' }));
    expect(handlers.onAdd).toHaveBeenCalledTimes(1);
    expect(handlers.onImport).toHaveBeenCalledTimes(1);
  });

  it('blocks a second import while one is running', () => {
    setup({ importing: true });
    expect(screen.getByTestId('locale-import-keys')).toBeDisabled();
  });
});
