jest.mock('@config/redisResponseCache', () => ({ bumpCmsEpoch: jest.fn(async () => undefined) }));

jest.mock('../../cmsRender.service', () => ({
  cmsRenderService: { render: jest.fn(), sitemap: jest.fn(), errorPage: jest.fn(), preview: jest.fn() },
}));

jest.mock('../../cmsPreviewLink.service', () => ({
  cmsPreviewLinkService: { link: jest.fn(), withPreviewUrls: jest.fn(), render: jest.fn() },
}));

jest.mock('../../cmsSiteRevision.service', () => ({
  cmsSiteRevisionService: { save: jest.fn(), list: jest.fn(), restore: jest.fn() },
}));

jest.mock('../../cmsContent.service', () => ({
  cmsContentService: { versions: jest.fn(), publishVersion: jest.fn(), restore: jest.fn() },
}));

jest.mock('../../cmsCode.service', () => ({ validateCode: jest.fn() }));

import type { GraphQLContext } from '@context';
import { bumpCmsEpoch } from '@config/redisResponseCache';
import { cmsResolvers } from '../../cms.resolver';
import { cmsRenderService } from '../../cmsRender.service';
import { cmsPreviewLinkService } from '../../cmsPreviewLink.service';
import { cmsSiteRevisionService } from '../../cmsSiteRevision.service';
import { cmsContentService } from '../../cmsContent.service';
import { validateCode } from '../../cmsCode.service';

const bump = bumpCmsEpoch as jest.Mock;
const render = cmsRenderService as unknown as Record<string, jest.Mock>;
const previewLink = cmsPreviewLinkService as unknown as Record<string, jest.Mock>;
const revisions = cmsSiteRevisionService as unknown as Record<string, jest.Mock>;
const content = cmsContentService as unknown as Record<string, jest.Mock>;
const validate = validateCode as jest.Mock;

const as = (roles: string[]) => ({ user: { id: 'u1', roles } }) as unknown as GraphQLContext;
const editor = as(['WEBSITE_MANAGER']);
const outsider = as(['CITY_ADMIN']);
const anonymous = {} as GraphQLContext;

type AnyResolver = (parent: unknown, args: unknown, ctx: GraphQLContext) => unknown;
const Query = cmsResolvers.Query as unknown as Record<string, AnyResolver>;
const Mutation = cmsResolvers.Mutation as unknown as Record<string, AnyResolver>;

describe('every CMS write retires the cached renders', () => {
  it('bumps the CMS epoch after a write succeeds, and returns what the write returned', async () => {
    const saved = { id: 's1', name: 'Main' };
    revisions.save.mockResolvedValueOnce(saved);
    await expect(Mutation.updateCmsSiteCode(null, { site_id: 's1', input: { custom_css: '' } }, editor)).resolves.toBe(saved);
    expect(revisions.save).toHaveBeenCalledWith('s1', 'CODE', { custom_css: '' }, 'u1');
    expect(bump).toHaveBeenCalledTimes(1);
    expect(bump.mock.invocationCallOrder[0]).toBeGreaterThan(revisions.save.mock.invocationCallOrder[0]);
  });

  it('does not bump when the write fails', async () => {
    revisions.save.mockRejectedValueOnce(new Error('Site CSS — line 1, column 3: Expected expression.'));
    await expect(Mutation.updateCmsSiteCode(null, { site_id: 's1', input: {} }, editor)).rejects.toThrow('Site CSS');
    expect(bump).not.toHaveBeenCalled();
  });

  it('wraps every mutation: none of them runs (or bumps) for someone signed out', async () => {
    const names = Object.keys(Mutation);
    expect(names.length).toBeGreaterThan(20);
    for (const name of names) {
      await expect(Promise.resolve().then(() => Mutation[name](null, {}, anonymous))).rejects.toMatchObject({
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }
    expect(bump).not.toHaveBeenCalled();
  });
});

describe('publishCmsVersion and restoreCmsSiteRevision', () => {
  it('publishes one saved version as the signed-in editor', async () => {
    content.publishVersion.mockResolvedValueOnce(true);
    await expect(Mutation.publishCmsVersion(null, { version_id: 'v1' }, editor)).resolves.toBe(true);
    expect(content.publishVersion).toHaveBeenCalledWith('v1', 'u1');
    expect(bump).toHaveBeenCalledTimes(1);
  });

  it('restores a site revision as the signed-in editor', async () => {
    revisions.restore.mockResolvedValueOnce({ id: 's1' });
    await expect(Mutation.restoreCmsSiteRevision(null, { revision_id: 'r1' }, editor)).resolves.toEqual({ id: 's1' });
    expect(revisions.restore).toHaveBeenCalledWith('r1', 'u1');
  });

  it('refuses both to someone without a website seat', async () => {
    await expect(Mutation.publishCmsVersion(null, { version_id: 'v1' }, outsider)).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
    await expect(Mutation.restoreCmsSiteRevision(null, { revision_id: 'r1' }, outsider)).rejects.toMatchObject({
      extensions: { code: 'FORBIDDEN' },
    });
    expect(content.publishVersion).not.toHaveBeenCalled();
    expect(revisions.restore).not.toHaveBeenCalled();
  });
});

describe('editor-only queries', () => {
  it('validates code for the editor markers', async () => {
    const problems = [{ line: 1, column: 2, message: 'Unexpected token', severity: 'ERROR' }];
    validate.mockResolvedValueOnce(problems);
    await expect(Query.cmsValidateCode(null, { language: 'JS', source: 'let =' }, editor)).resolves.toBe(problems);
    expect(validate).toHaveBeenCalledWith('JS', 'let =');
  });

  it('links a page preview, with its version and entry', () => {
    previewLink.link.mockReturnValueOnce({ url: 'https://x/a?cms_preview=t' });
    expect(Query.cmsPreviewLink(null, { page_id: 'p1', version: 2, entry_id: 'e1' }, editor)).toEqual({ url: 'https://x/a?cms_preview=t' });
    expect(previewLink.link).toHaveBeenCalledWith('PAGE', 'p1', 2, 'e1');
  });

  it('links a component preview, with its version', () => {
    Query.cmsComponentPreviewLink(null, { fragment_id: 'f1', version: 3 }, editor);
    expect(previewLink.link).toHaveBeenCalledWith('FRAGMENT', 'f1', 3);
  });

  it('lists site revisions, optionally of one section', () => {
    Query.cmsSiteRevisions(null, { site_id: 's1', section: 'DESIGN' }, editor);
    Query.cmsSiteRevisions(null, { site_id: 's1' }, editor);
    expect(revisions.list).toHaveBeenNthCalledWith(1, 's1', 'DESIGN');
    expect(revisions.list).toHaveBeenNthCalledWith(2, 's1', undefined);
  });

  it('gives every version, of a page or a component, its preview URL', async () => {
    const versions = [{ id: 'v1', version: 1 }];
    content.versions.mockResolvedValueOnce(versions);
    previewLink.withPreviewUrls.mockResolvedValueOnce([{ ...versions[0], preview_url: 'https://x' }]);
    await expect(Query.cmsVersions(null, { owner_kind: 'FRAGMENT', owner_id: 'f1' }, editor)).resolves.toEqual([
      { id: 'v1', version: 1, preview_url: 'https://x' },
    ]);
    expect(previewLink.withPreviewUrls).toHaveBeenCalledWith('FRAGMENT', 'f1', versions);
  });

  it.each(['cmsValidateCode', 'cmsPreviewLink', 'cmsComponentPreviewLink', 'cmsSiteRevisions', 'cmsPreview'])(
    '%s is refused to someone without a website seat',
    (name) => {
      expect(() => Query[name](null, {}, outsider)).toThrow('Access Denied');
    }
  );

  it('previews a page draft for an editor', () => {
    Query.cmsPreview(null, { page_id: 'p1', entry_id: 'e1' }, editor);
    expect(render.preview).toHaveBeenCalledWith('p1', 'e1');
  });
});

describe('public queries', () => {
  it('render a preview from its token alone: the signed token is the permission', () => {
    previewLink.render.mockReturnValueOnce(null);
    expect(Query.cmsRenderPreview(null, { token: 'forged' }, anonymous)).toBeNull();
    expect(previewLink.render).toHaveBeenCalledWith('forged');
  });

  it('serve a designed error page by host and code', () => {
    Query.cmsErrorPage(null, { host: 'duncit.com', code: 503 }, anonymous);
    expect(render.errorPage).toHaveBeenCalledWith('duncit.com', 503);
  });

  it('render a path, on page 1 unless another is asked for', () => {
    Query.cmsRender(null, { host: 'duncit.com', path: '/blog' }, anonymous);
    Query.cmsRender(null, { host: 'duncit.com', path: '/blog', page: 3 }, anonymous);
    expect(render.render).toHaveBeenNthCalledWith(1, 'duncit.com', '/blog', 1);
    expect(render.render).toHaveBeenNthCalledWith(2, 'duncit.com', '/blog', 3);
  });

  it('list the sitemap', () => {
    Query.cmsSitemap(null, { host: 'duncit.com' }, anonymous);
    expect(render.sitemap).toHaveBeenCalledWith('duncit.com');
  });
});
