describe('envEntry.schema drift guard', () => {
  afterEach(() => jest.dontMock('../../envEntry.model'));

  it('loads when the SDL enum and ENV_CATEGORIES agree', () => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      expect(() => require('../../envEntry.schema')).not.toThrow();
    });
  });

  it('refuses to load when a category exists in code but not in the SDL, naming both lists', () => {
    jest.isolateModules(() => {
      const actual = jest.requireActual('../../envEntry.model');
      jest.doMock('../../envEntry.model', () => ({ ...actual, ENV_CATEGORIES: [...actual.ENV_CATEGORIES, 'BRAND_NEW'] }));
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      expect(() => require('../../envEntry.schema')).toThrow(/EnvCategory drift: the SDL enum lists \[.*\] but ENV_CATEGORIES is \[.*BRAND_NEW\]/);
    });
  });
});
