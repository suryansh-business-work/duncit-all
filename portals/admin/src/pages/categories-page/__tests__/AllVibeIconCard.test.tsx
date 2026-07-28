import { describe, expect, it, vi } from 'vitest';
import type { MockedResponse } from '@apollo/client/testing';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import AllVibeIconCard from '../AllVibeIconCard';
import { UPDATE_BRANDING } from '../../branding-page/queries';
import { brandingMock, brandingNode, layoutNode, renderWithProviders } from './testkit';

// The shared media picker dialog owns its own upload/Pexels queries; the field
// wrapper (label + input) this card actually drives stays real.
vi.mock('@duncit/media-picker', () => ({ default: () => null }));

interface SaveInput {
  home_all_vibe_icon_url: string;
  home_show_all_vibe_categories: boolean;
  home_all_vibe_icon_layout: { position: string; width: number; height: number };
}

/** The mutation only resolves when the card sends exactly this input. */
const saveMock = (input: SaveInput): MockedResponse => ({
  request: { query: UPDATE_BRANDING, variables: { input } },
  result: {
    data: {
      updateBranding: brandingNode({
        home_all_vibe_icon_url: input.home_all_vibe_icon_url,
        home_show_all_vibe_categories: input.home_show_all_vibe_categories,
        home_all_vibe_icon_layout: layoutNode(
          input.home_all_vibe_icon_layout.position,
          input.home_all_vibe_icon_layout.width,
          input.home_all_vibe_icon_layout.height
        ),
      }),
    },
  },
});

const saveErrorMock = (input: SaveInput, error: Error): MockedResponse => ({
  request: { query: UPDATE_BRANDING, variables: { input } },
  error,
});

const iconField = () => screen.getByLabelText('All tab icon') as HTMLInputElement;
const widthField = () => screen.getByLabelText('Width') as HTMLInputElement;
const heightField = () => screen.getByLabelText('Height') as HTMLInputElement;
const showAllSwitch = () =>
  screen.getByLabelText('Show all categories on Home') as HTMLInputElement;
const saveButton = () => screen.getByRole('button', { name: /save|saving/i }) as HTMLButtonElement;

describe('AllVibeIconCard', () => {
  it('loads the saved icon, layout and home toggle from Branding', async () => {
    renderWithProviders(<AllVibeIconCard />, [
      brandingMock({
        home_all_vibe_icon_url: 'https://cdn.test/all.png',
        home_all_vibe_icon_layout: layoutNode('LEFT', 64, 48),
        home_show_all_vibe_categories: true,
      }),
    ]);

    await waitFor(() => expect(iconField().value).toBe('https://cdn.test/all.png'));
    expect(widthField().value).toBe('64');
    expect(heightField().value).toBe('48');
    expect(showAllSwitch().checked).toBe(true);
    expect(
      (screen.getByRole('button', { name: 'Left' }) as HTMLButtonElement).getAttribute('aria-pressed')
    ).toBe('true');
  });

  it('falls back to the TOP 40x40 default when no layout is stored', async () => {
    renderWithProviders(<AllVibeIconCard />, [
      brandingMock({
        home_all_vibe_icon_url: 'https://cdn.test/all.png',
        home_all_vibe_icon_layout: null,
      }),
    ]);

    // Wait on a field that proves the payload landed — otherwise 40/40 would
    // just be the pre-load default and the assertion would pass for free.
    await waitFor(() => expect(iconField().value).toBe('https://cdn.test/all.png'));
    expect(widthField().value).toBe('40');
    expect(heightField().value).toBe('40');
    expect(showAllSwitch().checked).toBe(false);
    expect(
      (screen.getByRole('button', { name: 'Top' }) as HTMLButtonElement).getAttribute('aria-pressed')
    ).toBe('true');
  });

  it('keeps Save disabled until something actually changes', async () => {
    renderWithProviders(<AllVibeIconCard />, [
      brandingMock({
        home_all_vibe_icon_url: 'https://cdn.test/all.png',
        home_all_vibe_icon_layout: layoutNode('TOP', 40, 40),
      }),
    ]);

    await waitFor(() => expect(iconField().value).toBe('https://cdn.test/all.png'));
    expect(saveButton().disabled).toBe(true);

    fireEvent.change(widthField(), { target: { value: '56' } });
    expect(saveButton().disabled).toBe(false);
  });

  it('ignores a de-select click on the active position', async () => {
    renderWithProviders(<AllVibeIconCard />, [
      brandingMock({ home_all_vibe_icon_layout: layoutNode('TOP', 48, 48) }),
    ]);

    await waitFor(() => expect(widthField().value).toBe('48'));
    fireEvent.click(screen.getByRole('button', { name: 'Top' }));

    expect(saveButton().disabled).toBe(true);
  });

  it('treats a cleared size box as zero', async () => {
    renderWithProviders(<AllVibeIconCard />, [
      brandingMock({ home_all_vibe_icon_url: 'https://cdn.test/all.png' }),
    ]);

    await waitFor(() => expect(iconField().value).toBe('https://cdn.test/all.png'));
    fireEvent.change(widthField(), { target: { value: '' } });
    fireEvent.change(heightField(), { target: { value: '' } });

    expect(widthField().value).toBe('0');
    expect(heightField().value).toBe('0');
  });

  it('saves the icon, the home toggle and a __typename-free layout', async () => {
    const input: SaveInput = {
      home_all_vibe_icon_url: 'https://cdn.test/new.png',
      home_show_all_vibe_categories: true,
      home_all_vibe_icon_layout: { position: 'BOTTOM', width: 72, height: 40 },
    };
    renderWithProviders(<AllVibeIconCard />, [
      // The query hands back a layout carrying Apollo's __typename; the mutation
      // mock only matches if the card strips it back to the three input fields.
      brandingMock({
        home_all_vibe_icon_url: 'https://cdn.test/old.png',
        home_all_vibe_icon_layout: layoutNode('TOP', 40, 40),
      }),
      saveMock(input),
      brandingMock({
        home_all_vibe_icon_url: input.home_all_vibe_icon_url,
        home_show_all_vibe_categories: true,
        home_all_vibe_icon_layout: layoutNode('BOTTOM', 72, 40),
      }),
    ]);

    await waitFor(() => expect(iconField().value).toBe('https://cdn.test/old.png'));
    fireEvent.change(iconField(), { target: { value: 'https://cdn.test/new.png' } });
    fireEvent.click(screen.getByRole('button', { name: 'Bottom' }));
    fireEvent.change(widthField(), { target: { value: '72' } });
    fireEvent.click(showAllSwitch());
    fireEvent.click(saveButton());

    expect(await screen.findByText('Saved')).toBeTruthy();
    expect(saveButton().disabled).toBe(true);
  });

  it('shows the failure and leaves the edits in place', async () => {
    const input: SaveInput = {
      home_all_vibe_icon_url: 'https://cdn.test/old.png',
      home_show_all_vibe_categories: false,
      home_all_vibe_icon_layout: { position: 'RIGHT', width: 40, height: 40 },
    };
    renderWithProviders(<AllVibeIconCard />, [
      brandingMock({ home_all_vibe_icon_url: 'https://cdn.test/old.png' }),
      saveErrorMock(input, new Error('branding is locked')),
    ]);

    await waitFor(() => expect(iconField().value).toBe('https://cdn.test/old.png'));
    fireEvent.click(screen.getByRole('button', { name: 'Right' }));
    fireEvent.click(saveButton());

    expect(await screen.findByText('branding is locked')).toBeTruthy();
    expect(screen.queryByText('Saved')).toBeNull();
    // Still dirty, so the admin can retry.
    expect(saveButton().disabled).toBe(false);
  });
});
