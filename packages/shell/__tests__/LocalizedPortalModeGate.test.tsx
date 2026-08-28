/**
 * The portal-mode gate with the console's live translator attached.
 *
 * `@duncit/user-context` sits below `@duncit/app-settings` in the dependency
 * graph, so the gate can't call the locale hook itself — this is the one seam
 * that hands it a `t`. It is exported from `mountPortal` for exactly this
 * test: `mountPortal`'s own suite mocks `react-dom/client` to inspect the
 * element tree without ever letting React actually mount it.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LocalizedPortalModeGate } from '../src/mountPortal';

describe('LocalizedPortalModeGate', () => {
  it('renders its children through the real gate, LIVE by default', () => {
    render(
      <LocalizedPortalModeGate portalKey="crm" graphqlUrl="https://api.test/graphql" appName="CRM">
        <div>console-content</div>
      </LocalizedPortalModeGate>,
    );

    expect(screen.getByText('console-content')).toBeInTheDocument();
  });
});
