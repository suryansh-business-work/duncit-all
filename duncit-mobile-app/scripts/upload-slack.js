#!/usr/bin/env node
/**
 * Uploads a build artefact (APK / AAB / IPA) to Slack and posts a status line.
 *
 * Usage:
 *   node scripts/upload-slack.js --file <path> [--title "..."] [--status "..."]
 *
 * Environment:
 *   SLACK_BOT_TOKEN   Bot token with files:write + chat:write scopes.
 *   SLACK_CHANNEL_ID  Target channel id.
 */
const fs = require('fs');
const path = require('path');
const { WebClient } = require('@slack/web-api');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]?.replace(/^--/, '');
    if (key) args[key] = argv[i + 1];
  }
  return args;
}

async function main() {
  const { SLACK_BOT_TOKEN, SLACK_CHANNEL_ID } = process.env;
  if (!SLACK_BOT_TOKEN || !SLACK_CHANNEL_ID) {
    throw new Error('SLACK_BOT_TOKEN and SLACK_CHANNEL_ID must be set.');
  }

  const { file, title, status } = parseArgs(process.argv.slice(2));
  if (!file) {
    throw new Error('Missing required --file <path> argument.');
  }
  if (!fs.existsSync(file)) {
    throw new Error(`Artefact not found: ${file}`);
  }

  const slack = new WebClient(SLACK_BOT_TOKEN);
  const filename = path.basename(file);
  const initialComment = status
    ? `*Duncit Mobile build* — ${status}`
    : `*Duncit Mobile build* — ${filename}`;

  await slack.files.uploadV2({
    channel_id: SLACK_CHANNEL_ID,
    file: fs.createReadStream(file),
    filename,
    title: title || filename,
    initial_comment: initialComment,
  });

  // eslint-disable-next-line no-console
  console.log(`Uploaded ${filename} to Slack channel ${SLACK_CHANNEL_ID}.`);
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(`Slack upload failed: ${error.message}`);
  process.exit(1);
});
