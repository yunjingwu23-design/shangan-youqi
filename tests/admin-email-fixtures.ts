import { setTimeout } from 'node:timers/promises';
import { base } from './helpers';

export async function invitationMail(email: string) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const inbox = await (await fetch('http://127.0.0.1:54324/api/v1/messages')).json();
    const item = inbox.messages?.find((mail: { To: { Address: string }[] }) =>
      mail.To.some((target) => target.Address === email)
    );
    if (item) {
      const message = await (
        await fetch('http://127.0.0.1:54324/api/v1/message/' + item.ID)
      ).json();
      const html = message.HTML || '',
        text = message.Text || html;
      const match = html.match(/href="([^"]*\/admin\/accept\?[^"]+)"/);
      const code = text.match(/\b[0-9]{6,10}\b/)?.[0];
      if (match && code) {
        const url = new URL(match[1].replaceAll('&amp;', '&'));
        if (url.origin !== base) throw new Error('Unexpected local invitation origin');
        return { url, code, html };
      }
    }
    await setTimeout(250);
  }
  throw new Error('No local invitation email with link and code was delivered');
}
