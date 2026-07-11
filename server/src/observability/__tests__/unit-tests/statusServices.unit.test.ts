import {
  findStatusService,
  getStatusEnvironment,
  getStatusServices,
  listStatusServices,
} from '../../statusServices';

const ORIGINAL_APP_ENV = process.env.APP_ENV;

afterEach(() => {
  if (ORIGINAL_APP_ENV === undefined) delete process.env.APP_ENV;
  else process.env.APP_ENV = ORIGINAL_APP_ENV;
});

describe('getStatusServices (production)', () => {
  beforeEach(() => {
    delete process.env.APP_ENV;
  });

  it('reports the production environment', () => {
    expect(getStatusEnvironment()).toBe('production');
  });

  it('returns the three groups with the full catalog', () => {
    const groups = getStatusServices();
    expect(groups.map((g) => g.title)).toEqual(['Consoles', 'Platform', 'Websites']);
    expect(groups[0].items).toHaveLength(17);
    expect(groups[1].items).toHaveLength(4);
    expect(groups[2].items).toHaveLength(5);
  });

  it('keeps production urls unchanged', () => {
    const services = listStatusServices();
    expect(services.find((s) => s.key === 'admin')?.url).toBe('https://admin.duncit.com/');
    expect(services.find((s) => s.key === 'duncit-com')?.url).toBe('https://duncit.com/');
    const server = services.find((s) => s.key === 'server');
    expect(server?.probe).toBe('https://server.duncit.com/health');
    expect(server?.health).toBe('https://server.duncit.com/health');
  });

  it('assigns a unique key to every service', () => {
    const keys = listStatusServices().map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('getStatusServices (staging)', () => {
  beforeEach(() => {
    process.env.APP_ENV = 'staging';
  });

  it('reports the staging environment', () => {
    expect(getStatusEnvironment()).toBe('staging');
  });

  it('rewrites every duncit.com hostname to its staging.* equivalent', () => {
    const services = listStatusServices();
    expect(services.find((s) => s.key === 'admin')?.url).toBe('https://staging.admin.duncit.com/');
    expect(services.find((s) => s.key === 'duncit-com')?.url).toBe('https://staging.duncit.com/');
    const server = services.find((s) => s.key === 'server');
    expect(server?.url).toBe('https://staging.server.duncit.com/');
    expect(server?.probe).toBe('https://staging.server.duncit.com/health');
    expect(server?.health).toBe('https://staging.server.duncit.com/health');
  });

  it('excludes services that have no staging deployment', () => {
    const keys = listStatusServices().map((s) => s.key);
    expect(keys).not.toContain('signoz');
    expect(keys).not.toContain('sonarqube');
    const platform = getStatusServices().find((g) => g.title === 'Platform');
    expect(platform?.items).toHaveLength(2);
  });

  it('keeps the remaining catalog intact', () => {
    const groups = getStatusServices();
    expect(groups[0].items).toHaveLength(17);
    expect(groups[2].items).toHaveLength(5);
  });
});

describe('findStatusService', () => {
  it('finds a known service by key and returns null for unknown keys', () => {
    delete process.env.APP_ENV;
    expect(findStatusService('crm')?.name).toBe('CRM');
    expect(findStatusService('nope')).toBeNull();
  });
});
