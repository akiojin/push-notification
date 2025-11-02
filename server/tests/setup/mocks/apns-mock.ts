import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { AddressInfo } from 'node:net';

interface ApnsMockServer {
  url: string;
  close: () => Promise<void>;
}

export async function createApnsMockServer(): Promise<ApnsMockServer> {
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    if (!req.url) {
      res.writeHead(404).end();
      return;
    }

    const token = req.url.split('/').pop();

    if (token === 'invalid') {
      res.writeHead(410, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ reason: 'Unregistered' }));
      return;
    }

    res.writeHead(200);
    res.end(JSON.stringify({ success: true }));
  });

  await new Promise<void>((resolve) => server.listen(0, resolve));

  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}
