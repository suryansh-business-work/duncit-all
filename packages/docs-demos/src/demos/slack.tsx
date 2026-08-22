import {
  actions,
  buildSlackMessageInput,
  button,
  context,
  divider,
  fields,
  header,
  section,
} from '@duncit/slack';
import { defineDemo, defineDemos } from '../types';

interface AlertMock {
  channel: string;
  pod_id: string;
  venue: string;
  host: string;
  seats: string;
  collected: string;
  pod_url: string;
}

export default defineDemos('slack', [
  defineDemo<AlertMock>({
    id: 'blocks',
    title: 'A Block Kit message, built rather than typed',
    note:
      'The builders are the whole package: nothing in the repo hand-writes a Slack JSON payload, so a block that Slack rejects cannot be written in one place and copied to four.',
    mock: {
      channel: '#ops-pods',
      pod_id: 'DUN-POD-4821',
      venue: 'Play Arena, HSR Layout',
      host: 'Meera N',
      seats: '7 of 8',
      collected: '₹3,150',
      pod_url: 'https://duncit.com/pod/DUN-POD-4821',
    },
    compute: (mock) => ({
      'The payload sent to Slack': buildSlackMessageInput({
        channel: mock.channel,
        text: `Pod ${mock.pod_id} is nearly full`,
        blocks: [
          header('Pod nearly full'),
          section(`*${mock.pod_id}* at ${mock.venue}`),
          fields([`*Host*\n${mock.host}`, `*Seats*\n${mock.seats}`, `*Collected*\n${mock.collected}`]),
          divider(),
          context([`Hosted by ${mock.host}`]),
          actions([button('Open pod', { url: mock.pod_url })]),
        ],
      }),
    }),
  }),
]);
