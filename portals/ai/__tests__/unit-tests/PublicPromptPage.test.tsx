import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { Route } from 'react-router';
import PublicPromptPage from '../../src/pages/public-prompt';
import { renderWithProviders } from '../testkit';

/**
 * The one page in this portal that needs no login: `/p/<token>` hands the share
 * token and the API origin to the package's public view, inside its own error
 * boundary (it sits outside `authed()`, which supplies one for every other page).
 */
const view = vi.hoisted(() => ({ props: {} as { token?: string; apiOrigin?: string }, crash: false }));
vi.mock('@duncit/ai-prompts/mui', () => ({
  PublicPromptView: (props: typeof view.props) => {
    view.props = props;
    if (view.crash) throw new Error('render failed');
    return <div>PUBLIC VIEW</div>;
  },
}));

const mount = (url: string) =>
  renderWithProviders(<></>, { initialEntries: [url], routes: <Route path="/p/:token" element={<PublicPromptPage />} /> });

describe('PublicPromptPage', () => {
  it('passes the token from the link and the API origin', () => {
    mount('/p/AbCdEfGhIjKlMnOpQrStUvWx');

    expect(screen.getByText('PUBLIC VIEW')).toBeInTheDocument();
    expect(view.props.token).toBe('AbCdEfGhIjKlMnOpQrStUvWx');
    expect(view.props.apiOrigin).toMatch(/^https?:\/\//);
  });

  it('keeps a crash inside its own boundary instead of a blank tab', () => {
    view.crash = true;
    const silence = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mount('/p/broken');

    expect(screen.queryByText('PUBLIC VIEW')).toBeNull();
    expect(document.body.textContent).not.toBe('');
    silence.mockRestore();
    view.crash = false;
  });
});
