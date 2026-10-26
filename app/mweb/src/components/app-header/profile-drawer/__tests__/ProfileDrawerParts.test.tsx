import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import MenuGroup from '../MenuGroup';
import MenuRefreshBar from '../MenuRefreshBar';
import MenuSkeleton from '../MenuSkeleton';
import MenuRow from '../MenuRow';
import { fallbackT } from '../../../../i18n/fallback';

describe('MenuGroup', () => {
  it('draws a titled card with a hairline between rows only', () => {
    render(
      <MenuGroup title="Account" testId="grp">
        <div key="a" data-testid="row-a" />
        <div key="b" data-testid="row-b" />
      </MenuGroup>
    );
    expect(screen.getByTestId('grp-header')).toHaveTextContent('Account');
    expect(screen.getByTestId('grp').querySelectorAll('hr')).toHaveLength(1);
  });

  it('drops absent children, divider and all, and omits the header without a title', () => {
    render(
      <MenuGroup>
        <div key="a" data-testid="row-a" />
        {null}
        {false}
      </MenuGroup>
    );
    expect(screen.getByTestId('row-a')).toBeInTheDocument();
    expect(document.querySelectorAll('hr')).toHaveLength(0);
    expect(screen.queryByTestId('grp-header')).not.toBeInTheDocument();
  });

  it('gives the header no test id when the group has none', () => {
    render(
      <MenuGroup title="Only title">
        <div key="a" />
      </MenuGroup>
    );
    expect(screen.getByText('Only title')).toBeInTheDocument();
  });
});

describe('MenuRefreshBar', () => {
  it('keeps its track and shows the progress bar only while refreshing', () => {
    const { rerender } = render(<MenuRefreshBar active={false} />);
    expect(screen.getByTestId('menu-refresh-bar')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    rerender(<MenuRefreshBar active />);
    expect(screen.getByRole('progressbar', { name: fallbackT('mweb.sidebar.refreshing') })).toBeInTheDocument();
  });
});

describe('MenuSkeleton', () => {
  it('stands in for the menu body without any interactive control', () => {
    const { container } = render(<MenuSkeleton />);
    expect(container.firstChild).not.toBeNull();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('MenuRow', () => {
  it('renders a plain row with no button when there is no handler', () => {
    render(<MenuRow testId="r" icon={<i />} label="Info" secondary="detail" badge="New" />);
    expect(screen.getByTestId('r').tagName).toBe('DIV');
    expect(screen.getByTestId('r')).toHaveTextContent('Infodetail');
    expect(screen.getByTestId('r')).toHaveTextContent('New');
    expect(screen.getByTestId('ChevronRightIcon')).toBeInTheDocument();
  });

  it('renders a button, announces expansion, and can drop the chevron', () => {
    render(<MenuRow testId="r" icon={<i />} label="Policies" onClick={() => undefined} expanded chevron={false} tone="danger" />);
    expect(screen.getByTestId('r').tagName).toBe('BUTTON');
    expect(screen.getByTestId('r')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.queryByTestId('ChevronRightIcon')).not.toBeInTheDocument();
  });
});
