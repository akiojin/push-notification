import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { AddressInfo } from 'node:net';

interface MockResponse {
  status: number;
  body: Record<string, unknown>;
}

const responses: Record<string, MockResponse> = {
  '/fcm/send': {
    status: 200,
    body: {
      name: 'projects/test/messages/0',
    },
  },
};

const invalidTokenResponses: Record<string, MockResponse> = {
  invalid: {
    status: 400,
    body: {
      error: {
        code: 400,
        message: 'Invalid registration token',
        status: 'INVALID_ARGUMENT',
        details: [{
          '@type': 'type.googleapis.com/google.firebase.fcm.v1.FcmError',
          errorCode: 'INVALID_REGISTRATION',
        }],
      },
    },
  },
  unregistered: {
    status: 404,
    body: {
      error: {
        code: 404,
        message: 'Requested entity was not found.',
        status: 'NOT_FOUND',
        details: [{
          '@type': 'type.googleapis.com/google.firebase.fcm.v1.FcmError',
          errorCode: 'UNREGISTERED',
        }],
      },
    },
  },
};

export interface FcmMockServer {
  url: string;
  close: () => Promise<void>;
}

export async function createFcmMockServer(): Promise<FcmMockServer> {
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    if (!req.url) {
      res.writeHead(404).end();
      return;
    }

    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', () => {
      try {
        const parsed = body ? JSON.parse(body) : {};
        const token: string | undefined = parsed.token;
        const override = token ? invalidTokenResponses[token] : undefined;
        const response = override ?? responses[req.url ?? ''];
        if (!response) {
          res.writeHead(404).end();
          return;
        }
        res.writeHead(response.status, { 'content-type': 'application/json' });
        res.end(JSON.stringify(response.body));
      } catch (error) {
        res.writeHead(500, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { message: (error as Error).message } }));
      }
    });
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
