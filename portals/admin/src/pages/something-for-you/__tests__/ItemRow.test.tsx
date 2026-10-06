import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../../__tests__/testkit';
import ItemRow from '../ItemRow';
import type { SomethingForYouForm } from '../queries';

type Item = SomethingForYouForm & { id: string };

const makeItem = (over: Partial<Item> = {}): Item => ({
  id: 'sfy-1',
  title: 'Refer a friend',
  image_url: 'https://cdn.duncit.com/sfy/refer.png',
  bottom_text: 'Refer and Earn',
  action_type: 'NONE',
  link_path: '',
  link_url: '',
  sort_order: 2,
  is_active: true,
  ...over,
});

const renderRow = (item: Item) => {
  const onEdit = vi.fn();
  const onRemove = vi.fn();
  const view = renderWithProviders(<ItemRow item={item} onEdit={onEdit} onRemove={onRemove} />);
  return { ...view, onEdit, onRemove };
};

describe('ItemRow — what the card does', () => {
  it.each([
    [{ action_type: 'ROUTE', link_path: '/earn' }, 'opens /earn · order 2'],
    [{ action_type: 'ROUTE', link_path: '' }, 'screen not chosen · order 2'],
    [{ action_type: 'URL', link_url: 'https://duncit.com/refer' }, 'opens https://duncit.com/refer · order 2'],
    [{ action_type: 'URL', link_url: '' }, 'address not set · order 2'],
    [{ action_type: 'NONE' }, 'does nothing · order 2'],
  ] as const)('describes %o as "%s"', (over, expected) => {
    renderRow(makeItem(over as Partial<Item>));
    expect(screen.getByText(expected)).toBeInTheDocument();
  });
});

describe('ItemRow — the card face', () => {
  it('shows the title, bottom text and a portrait thumbnail of an active card, with no Hidden chip', () => {
    const { container } = renderRow(makeItem());

    expect(screen.getByText('Refer a friend')).toBeInTheDocument();
    expect(screen.getByText('Refer and Earn')).toBeInTheDocument();
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://cdn.duncit.com/sfy/refer.png');
    expect(screen.queryByText('Hidden')).toBeNull();
  });

  it('marks an inactive card Hidden, shows a dash for missing bottom text and no thumbnail without an image', () => {
    const { container } = renderRow(makeItem({ is_active: false, bottom_text: '', image_url: '' }));

    expect(screen.getByText('Hidden')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });

  it('hands the whole item to onEdit and onRemove from its two buttons', () => {
    const item = makeItem();
    const { onEdit, onRemove } = renderRow(item);

    fireEvent.click(screen.getByRole('button', { name: 'Edit card' }));
    expect(onEdit).toHaveBeenCalledWith(item);
    expect(onRemove).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Delete card' }));
    expect(onRemove).toHaveBeenCalledWith(item);
  });
});
