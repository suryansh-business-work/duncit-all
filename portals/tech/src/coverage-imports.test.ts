import { describe, expect, it } from 'vitest';
import * as envQueries from './pages/environment/queries';
import * as portalEnvQueries from './pages/environment/portal-env-queries';
import * as envEntryBarrel from './pages/environment/env-entry';
import * as flagQueries from './pages/feature-flags-page/queries';
import * as flagBarrel from './pages/feature-flags-page/feature-flag';
import * as portalModeQueries from './pages/portal-modes/queries';
import * as emailTplQueries from './pages/email-templates-page/queries';
import * as emailTplCreateBarrel from './pages/email-templates-page/email-template-create';
import * as emailTplTestBarrel from './pages/email-templates-page/email-template-test';

/**
 * GraphQL document modules + barrels are pure module-level code; importing them
 * exercises every statement (gql tags, static defs, helper factories). These
 * assertions just pin the public surface so the imports aren't tree-shaken.
 */
describe('module barrels & GraphQL documents', () => {
  it('builds the static env category catalogue', () => {
    expect(envQueries.CATEGORY_DEFS.length).toBeGreaterThan(0);
    expect(envQueries.CATEGORY_DEFS.find((c) => c.category === 'EMAIL')?.docUrl).toMatch(/^https?:\/\//);
    // VOBIZ was removed from the catalogue.
    expect(envQueries.CATEGORY_DEFS.find((c) => (c.category as string) === 'VOBIZ')).toBeUndefined();
    expect(envQueries.ENV_ENTRIES).toBeDefined();
    expect(portalEnvQueries.PORTAL_LIST).toBeDefined();
  });

  it('exposes env-entry helpers', () => {
    expect(envEntryBarrel.envEntrySchema).toBeTypeOf('function');
    expect(envEntryBarrel.emptyValues()).toMatchObject({ is_active: true });
    expect(envEntryBarrel.EnvEntryForm).toBeTypeOf('function');
  });

  it('exposes feature-flag documents + helpers', () => {
    expect(flagQueries.QUERY).toBeDefined();
    expect(flagQueries.blankFlag).toMatchObject({ enabled: false });
    expect(flagBarrel.featureFlagFormSchema).toBeDefined();
    expect(flagBarrel.toFeatureFlagInput).toBeTypeOf('function');
  });

  it('exposes portal-mode documents', () => {
    expect(portalModeQueries.PORTAL_MODES).toBeDefined();
    expect(portalModeQueries.SET_PORTAL_MODE).toBeDefined();
  });

  it('exposes email-template documents + form barrels', () => {
    expect(emailTplQueries.TEMPLATES).toBeDefined();
    expect(emailTplQueries.RENDER).toBeDefined();
    expect(emailTplQueries.CREATE).toBeDefined();
    expect(emailTplQueries.UPDATE).toBeDefined();
    expect(emailTplQueries.DELETE).toBeDefined();
    expect(emailTplQueries.SEND_TEST).toBeDefined();
    expect(emailTplQueries.STARTER).toMatch(/<mjml>/);
    expect(emailTplCreateBarrel.emailTemplateCreateSchema).toBeDefined();
    expect(emailTplCreateBarrel.slugify).toBeTypeOf('function');
    expect(emailTplCreateBarrel.toCreateTemplateInput).toBeTypeOf('function');
    expect(emailTplTestBarrel.emailTemplateTestSchema).toBeDefined();
    expect(emailTplTestBarrel.toSendTestInput).toBeTypeOf('function');
  });
});
