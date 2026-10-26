/**
 * A build that ships no copy revisions at all must still boot: with nothing to
 * revise there is nothing to write, and an empty bulk write is an error in
 * MongoDB rather than a no-op.
 */
jest.mock('../../copy-revisions', () => ({ COPY_REVISIONS: {} }));

import { LocaleModel } from '../../localization.model';
import { localizationService as service } from '../../localization.service';

describe('reviseShippedCopy with no revisions', () => {
  it('answers zero without sending Mongo an empty bulk write', async () => {
    await LocaleModel.create({ code: 'en', label: 'English', is_default: true });
    await expect(service.reviseShippedCopy()).resolves.toBe(0);
  });
});
