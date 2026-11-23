import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SectionContent from '../../src/pages/settings/SectionContent';
import { CONNECTOR_SECTION_KIND, SETTINGS_SECTIONS } from '../../src/pages/settings/sections';

vi.mock('../../src/pages/settings/general', () => ({ default: (p: { kind?: string }) => <div data-testid="section-page">{'general' + (p.kind ? ':' + p.kind : '')}</div> }));
vi.mock('../../src/pages/settings/models', () => ({ default: (p: { kind?: string }) => <div data-testid="section-page">{'models' + (p.kind ? ':' + p.kind : '')}</div> }));
vi.mock('../../src/pages/settings/openai', () => ({ default: (p: { kind?: string }) => <div data-testid="section-page">{'openai' + (p.kind ? ':' + p.kind : '')}</div> }));
vi.mock('../../src/pages/settings/qdrant', () => ({ default: (p: { kind?: string }) => <div data-testid="section-page">{'qdrant' + (p.kind ? ':' + p.kind : '')}</div> }));
vi.mock('../../src/pages/settings/embeddings', () => ({ default: (p: { kind?: string }) => <div data-testid="section-page">{'embeddings' + (p.kind ? ':' + p.kind : '')}</div> }));
vi.mock('../../src/pages/settings/media', () => ({ default: (p: { kind?: string }) => <div data-testid="section-page">{'media' + (p.kind ? ':' + p.kind : '')}</div> }));
vi.mock('../../src/pages/settings/sync', () => ({ default: (p: { kind?: string }) => <div data-testid="section-page">{'sync' + (p.kind ? ':' + p.kind : '')}</div> }));
vi.mock('../../src/pages/settings/access', () => ({ default: (p: { kind?: string }) => <div data-testid="section-page">{'access' + (p.kind ? ':' + p.kind : '')}</div> }));
vi.mock('../../src/pages/settings/security', () => ({ default: (p: { kind?: string }) => <div data-testid="section-page">{'security' + (p.kind ? ':' + p.kind : '')}</div> }));
vi.mock('../../src/pages/settings/usage', () => ({ default: (p: { kind?: string }) => <div data-testid="section-page">{'usage' + (p.kind ? ':' + p.kind : '')}</div> }));
vi.mock('../../src/pages/settings/audit', () => ({ default: (p: { kind?: string }) => <div data-testid="section-page">{'audit' + (p.kind ? ':' + p.kind : '')}</div> }));
vi.mock('../../src/pages/settings/health', () => ({ default: (p: { kind?: string }) => <div data-testid="section-page">{'health' + (p.kind ? ':' + p.kind : '')}</div> }));
vi.mock('../../src/pages/settings/connectors', () => ({ default: (p: { kind?: string }) => <div data-testid="section-page">{'connectors' + (p.kind ? ':' + p.kind : '')}</div> }));

/** Every /setting/<section> address opens its page; the five connector sections share the connector manager with their kind. */
describe('SectionContent', () => {
  it.each(SETTINGS_SECTIONS.map((s) => s.key))('opens the %s section', (key) => {
    render(<SectionContent section={key} />);
    const kind = CONNECTOR_SECTION_KIND[key];
    expect(screen.getByTestId('section-page')).toHaveTextContent(kind ? 'connectors:' + kind : key);
  });
});
