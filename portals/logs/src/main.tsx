import { mountWelcomePortal } from '@duncit/shell';
import { logs } from '@duncit/logs';
import { appConfig } from './config/app-config';

/**
 * The Logs console, on logs.duncit.com. It ships as the shell alone —
 * login, the welcome dashboard and the profile page — until its first screen
 * lands in its own route table.
 */
mountWelcomePortal({ appConfig, env: import.meta.env, logsPortal: logs.portal.logs });
