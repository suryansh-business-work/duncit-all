/**
 * The catalogue behind the server terminal's suggestion sidebar.
 *
 * Every command here is READ-ONLY and runs exactly as written: the terminal is
 * a one-shot shell — each invocation is its own process — so a "location" is
 * listed as the `ls` that shows it rather than as a `cd` that could not survive
 * the next command anyway.
 *
 * Two environments are reachable from this terminal, and that split is the
 * whole reason the groups are named the way they are:
 *   - the API CONTAINER, where the shell actually runs. The app, its bind
 *     mounts and its own process live here.
 *   - the HOST, which the container only reaches through the mounted Docker
 *     socket. nginx is a systemd service on the VPS rather than a container, so
 *     `/etc/nginx` does not exist in here at all — `hostRead` therefore starts a
 *     throwaway container that bind-mounts the host path read-only.
 *
 * Labels and descriptions carry their localisation keys written out in full,
 * never composed: the shipped-key gate reads them as quoted literals (rule 38).
 */

/** One suggested command. `id` is the React key and the row identity while it runs. */
export interface TerminalCommand {
  id: string;
  command: string;
  labelKey: string;
  descriptionKey: string;
}

export interface TerminalCommandGroup {
  id: string;
  titleKey: string;
  commands: TerminalCommand[];
}

/** Pulled from ECR rather than Docker Hub, like every other image the deploy
 * uses, so reading a host path never trips Docker Hub's anonymous pull limit. */
const HOST_READER_IMAGE = 'public.ecr.aws/docker/library/alpine:3';

/** Run `command` against a host path the API container cannot see, by mounting
 * that path read-only into a throwaway container on the host Docker daemon. */
function hostRead(path: string, command: string): string {
  return `docker run --rm -v ${path}:${path}:ro ${HOST_READER_IMAGE} ${command}`;
}

const LOCATIONS: TerminalCommand[] = [
  {
    id: 'apiRoot',
    command: 'ls -la /app/server',
    labelKey: 'tech.terminal.cmd.apiRoot',
    descriptionKey: 'tech.terminal.desc.apiRoot',
  },
  {
    id: 'serverDist',
    command: 'ls -la /app/server/dist',
    labelKey: 'tech.terminal.cmd.serverDist',
    descriptionKey: 'tech.terminal.desc.serverDist',
  },
  {
    id: 'appBuilds',
    command: 'ls -lah /app/app-builds',
    labelKey: 'tech.terminal.cmd.appBuilds',
    descriptionKey: 'tech.terminal.desc.appBuilds',
  },
  {
    id: 'dbBackups',
    command: 'ls -lah /app/db-backups',
    labelKey: 'tech.terminal.cmd.dbBackups',
    descriptionKey: 'tech.terminal.desc.dbBackups',
  },
  {
    id: 'dockerSocket',
    command: 'ls -la /var/run/docker.sock',
    labelKey: 'tech.terminal.cmd.dockerSocket',
    descriptionKey: 'tech.terminal.desc.dockerSocket',
  },
  {
    id: 'tmpSpool',
    command: 'ls -lah /tmp',
    labelKey: 'tech.terminal.cmd.tmpSpool',
    descriptionKey: 'tech.terminal.desc.tmpSpool',
  },
];

const NGINX: TerminalCommand[] = [
  {
    id: 'nginxSitesAvailable',
    command: hostRead('/etc/nginx', 'ls -la /etc/nginx/sites-available'),
    labelKey: 'tech.terminal.cmd.nginxSitesAvailable',
    descriptionKey: 'tech.terminal.desc.nginxSitesAvailable',
  },
  {
    id: 'nginxSitesEnabled',
    command: hostRead('/etc/nginx', 'ls -la /etc/nginx/sites-enabled'),
    labelKey: 'tech.terminal.cmd.nginxSitesEnabled',
    descriptionKey: 'tech.terminal.desc.nginxSitesEnabled',
  },
  {
    id: 'nginxVhost',
    command: hostRead('/etc/nginx', 'cat /etc/nginx/sites-available/duncit.com'),
    labelKey: 'tech.terminal.cmd.nginxVhost',
    descriptionKey: 'tech.terminal.desc.nginxVhost',
  },
  {
    id: 'nginxStagingVhost',
    command: hostRead('/etc/nginx', 'cat /etc/nginx/sites-available/staging.duncit.com'),
    labelKey: 'tech.terminal.cmd.nginxStagingVhost',
    descriptionKey: 'tech.terminal.desc.nginxStagingVhost',
  },
  {
    id: 'nginxErrorLog',
    command: hostRead('/var/log/nginx', 'tail -n 100 /var/log/nginx/error.log'),
    labelKey: 'tech.terminal.cmd.nginxErrorLog',
    descriptionKey: 'tech.terminal.desc.nginxErrorLog',
  },
];

const DOCKER: TerminalCommand[] = [
  {
    id: 'dockerPs',
    command: 'docker ps -a',
    labelKey: 'tech.terminal.cmd.dockerPs',
    descriptionKey: 'tech.terminal.desc.dockerPs',
  },
  {
    id: 'dockerStats',
    command: 'docker stats --no-stream',
    labelKey: 'tech.terminal.cmd.dockerStats',
    descriptionKey: 'tech.terminal.desc.dockerStats',
  },
  {
    id: 'dockerImages',
    command: 'docker images',
    labelKey: 'tech.terminal.cmd.dockerImages',
    descriptionKey: 'tech.terminal.desc.dockerImages',
  },
  {
    id: 'dockerDiskUsage',
    command: 'docker system df',
    labelKey: 'tech.terminal.cmd.dockerDiskUsage',
    descriptionKey: 'tech.terminal.desc.dockerDiskUsage',
  },
  {
    id: 'dockerServerLogs',
    command: 'docker logs --tail 100 duncit-server',
    labelKey: 'tech.terminal.cmd.dockerServerLogs',
    descriptionKey: 'tech.terminal.desc.dockerServerLogs',
  },
  {
    id: 'dockerNetworks',
    command: 'docker network ls',
    labelKey: 'tech.terminal.cmd.dockerNetworks',
    descriptionKey: 'tech.terminal.desc.dockerNetworks',
  },
];

const SYSTEM: TerminalCommand[] = [
  {
    id: 'diskUsage',
    command: 'df -h',
    labelKey: 'tech.terminal.cmd.diskUsage',
    descriptionKey: 'tech.terminal.desc.diskUsage',
  },
  {
    id: 'memory',
    command: 'free -m',
    labelKey: 'tech.terminal.cmd.memory',
    descriptionKey: 'tech.terminal.desc.memory',
  },
  {
    id: 'load',
    command: 'uptime',
    labelKey: 'tech.terminal.cmd.load',
    descriptionKey: 'tech.terminal.desc.load',
  },
  {
    id: 'processes',
    command: 'top -b -n 1 | head -20',
    labelKey: 'tech.terminal.cmd.processes',
    descriptionKey: 'tech.terminal.desc.processes',
  },
  {
    id: 'containerOs',
    command: 'cat /etc/os-release',
    labelKey: 'tech.terminal.cmd.containerOs',
    descriptionKey: 'tech.terminal.desc.containerOs',
  },
  {
    id: 'clock',
    command: 'date -u',
    labelKey: 'tech.terminal.cmd.clock',
    descriptionKey: 'tech.terminal.desc.clock',
  },
];

const API: TerminalCommand[] = [
  {
    id: 'health',
    command: 'wget -qO- http://localhost:2001/health',
    labelKey: 'tech.terminal.cmd.health',
    descriptionKey: 'tech.terminal.desc.health',
  },
  {
    id: 'nodeVersion',
    command: 'node -v',
    labelKey: 'tech.terminal.cmd.nodeVersion',
    descriptionKey: 'tech.terminal.desc.nodeVersion',
  },
  {
    // Names only: the values are secrets, and this output is audited server-side.
    id: 'envNames',
    command: 'env | cut -d= -f1 | sort',
    labelKey: 'tech.terminal.cmd.envNames',
    descriptionKey: 'tech.terminal.desc.envNames',
  },
  {
    id: 'bundleSize',
    command: 'du -sh /app/server/dist',
    labelKey: 'tech.terminal.cmd.bundleSize',
    descriptionKey: 'tech.terminal.desc.bundleSize',
  },
  {
    id: 'backupsSize',
    command: 'du -sh /app/db-backups',
    labelKey: 'tech.terminal.cmd.backupsSize',
    descriptionKey: 'tech.terminal.desc.backupsSize',
  },
];

export const TERMINAL_COMMAND_GROUPS: TerminalCommandGroup[] = [
  { id: 'locations', titleKey: 'tech.terminal.group.locations', commands: LOCATIONS },
  { id: 'nginx', titleKey: 'tech.terminal.group.nginx', commands: NGINX },
  { id: 'docker', titleKey: 'tech.terminal.group.docker', commands: DOCKER },
  { id: 'system', titleKey: 'tech.terminal.group.system', commands: SYSTEM },
  { id: 'api', titleKey: 'tech.terminal.group.api', commands: API },
];
