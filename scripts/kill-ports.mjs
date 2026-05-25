import { execFile } from 'node:child_process';

const defaultPorts = ['2000', '2001', '2002', '2003', '2004', '2005', '2006', '2007', '2008'];
const ports = (process.env.DUNCIT_PORTS?.split(',') ?? defaultPorts)
  .map((port) => port.trim())
  .filter(Boolean);
const isWindows = process.platform === 'win32';

const runCommand = (command, args) =>
  new Promise((resolve) => {
    execFile(command, args, { windowsHide: true }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        output: stdout.trim(),
        errorOutput: stderr.trim(),
      });
    });
  });

const findPidsOnWindows = async (port) => {
  const command = [
    `Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue`,
    'Select-Object -ExpandProperty OwningProcess -Unique',
  ].join(' | ');
  const result = await runCommand('powershell.exe', ['-NoProfile', '-Command', command]);

  return result.output.split(/\s+/).filter(Boolean);
};

const findPidsOnUnix = async (port) => {
  const lsofResult = await runCommand('lsof', ['-ti', `tcp:${port}`]);

  if (lsofResult.ok && lsofResult.output) {
    return lsofResult.output.split(/\s+/).filter(Boolean);
  }

  const fuserResult = await runCommand('fuser', ['-n', 'tcp', port]);

  return `${fuserResult.output} ${fuserResult.errorOutput}`.split(/\s+/).filter((value) => /^\d+$/.test(value));
};

const killPid = async (pid) => {
  if (isWindows) {
    return runCommand('taskkill.exe', ['/PID', pid, '/T', '/F']);
  }

  return runCommand('kill', ['-TERM', pid]);
};

const uniqueValues = (values) => [...new Set(values)];

for (const port of ports) {
  const pids = uniqueValues(isWindows ? await findPidsOnWindows(port) : await findPidsOnUnix(port));

  if (pids.length === 0) {
    console.log(`Port ${port}: free`);
    continue;
  }

  for (const pid of pids) {
    const result = await killPid(pid);
    const status = result.ok ? 'killed' : 'failed';
    console.log(`Port ${port}: ${status} PID ${pid}`);
  }
}