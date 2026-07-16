import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { RequireAuth, createAuthed } from '../src/auth/RequireAuth';

function LoginProbe() {
  const loc = useLocation();
  return <div>Login {loc.search}</div>;
}

function renderGuarded(getToken: () => string | null) {
  return render(
    <MemoryRouter initialEntries={['/secret?x=1']}>
      <Routes>
        <Route
          path="/secret"
          element={
            <RequireAuth getToken={getToken}>
              <div>Secret</div>
            </RequireAuth>
          }
        />
        <Route path="/login" element={<LoginProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireAuth', () => {
  it('renders children when a token is present', () => {
    renderGuarded(() => 'tok');
    expect(screen.getByText('Secret')).toBeInTheDocument();
  });

  it('redirects to /login with the encoded current path when unauthenticated', () => {
    renderGuarded(() => null);
    expect(screen.getByText(/Login/)).toHaveTextContent('redirect=%2Fsecret%3Fx%3D1');
  });
});

describe('createAuthed', () => {
  it('wraps the page with the chrome when authed', () => {
    const authed = createAuthed({ getToken: () => 'tok', wrap: (el) => <div data-testid="chrome">{el}</div> });
    render(
      <MemoryRouter initialEntries={['/secret']}>
        <Routes>
          <Route path="/secret" element={authed(<div>Page</div>)} />
          <Route path="/login" element={<LoginProbe />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('chrome')).toHaveTextContent('Page');
  });

  it('redirects instead of wrapping when unauthenticated', () => {
    const authed = createAuthed({ getToken: () => null, wrap: (el) => <div data-testid="chrome">{el}</div> });
    render(
      <MemoryRouter initialEntries={['/secret']}>
        <Routes>
          <Route path="/secret" element={authed(<div>Page</div>)} />
          <Route path="/login" element={<LoginProbe />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.queryByTestId('chrome')).not.toBeInTheDocument();
    expect(screen.getByText(/Login/)).toBeInTheDocument();
  });
});
