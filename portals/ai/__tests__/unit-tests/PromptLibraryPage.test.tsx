import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, useLocation } from 'react-router';
import PromptLibraryPage from '../../src/pages/prompt-library';
import { renderWithProviders } from '../testkit';

/**
 * The AI Library page's one job beyond mounting the package: a link such as
 * `/library?prompt=moderation.pod` (from the AI Features table) opens that
 * prompt; clicking a row puts its key (and the detail tab asked for) in the
 * URL; and closing drops both — keeping the library tab — so a refresh does not
 * reopen it.
 */
const view = vi.hoisted(() => ({
  props: {} as {
    apiOrigin?: string;
    openPromptKey?: string | null;
    onPromptClose?: () => void;
    onPromptOpen?: (key: string, tab?: string) => void;
  },
}));
vi.mock('@duncit/ai-prompts/mui', () => ({
  DETAIL_TAB_PARAM: 'promptTab',
  PromptLibraryView: (props: typeof view.props) => {
    view.props = props;
    return <div>LIBRARY VIEW</div>;
  },
}));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="search">{location.search}</output>;
}

const mount = (url: string) =>
  renderWithProviders(<></>, {
    initialEntries: [url],
    routes: (
      <Route
        path="/library"
        element={
          <>
            <PromptLibraryPage />
            <LocationProbe />
          </>
        }
      />
    ),
  });

describe('PromptLibraryPage', () => {
  it('hands the library the prompt the link names, and the API origin', () => {
    mount('/library?selectedtab=CODE&prompt=moderation.pod');

    expect(screen.getByText('LIBRARY VIEW')).toBeInTheDocument();
    expect(view.props.openPromptKey).toBe('moderation.pod');
    expect(view.props.apiOrigin).toMatch(/^https?:\/\//);
  });

  it('asks for no prompt when the link names none', () => {
    mount('/library');

    expect(view.props.openPromptKey).toBeNull();
  });

  it('puts a clicked prompt and the detail tab asked for in the URL, and drops a stale tab', () => {
    mount('/library?selectedtab=AI&promptTab=history');

    act(() => view.props.onPromptOpen?.('digest.weekly', 'share'));
    expect(screen.getByTestId('search')).toHaveTextContent('?selectedtab=AI&promptTab=share&prompt=digest.weekly');
    expect(view.props.openPromptKey).toBe('digest.weekly');

    act(() => view.props.onPromptOpen?.('moderation.pod'));
    expect(screen.getByTestId('search')).toHaveTextContent('?selectedtab=AI&prompt=moderation.pod');
  });

  it('drops the key and its detail tab, and keeps the library tab, when the prompt is closed', () => {
    mount('/library?selectedtab=CODE&prompt=moderation.pod&promptTab=quality');

    act(() => view.props.onPromptClose?.());

    expect(screen.getByTestId('search')).toHaveTextContent('?selectedtab=CODE');
    expect(view.props.openPromptKey).toBeNull();
  });
});
