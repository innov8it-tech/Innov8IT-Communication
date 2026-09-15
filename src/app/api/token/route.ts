import { StreamClient } from '@stream-io/node-sdk';
import { auth } from '@clerk/nextjs/server';

export async function POST() {
  const { userId: authenticatedUserId } = await auth();

  if (!authenticatedUserId) {
    return Response.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const API_KEY = process.env.NEXT_PUBLIC_STREAM_API_KEY;
  const SECRET = process.env.STREAM_API_SECRET;

  if (!API_KEY || !SECRET) {
    return Response.json(
      { error: 'Stream credentials are not configured on the server.' },
      { status: 503 }
    );
  }

  const client = new StreamClient(API_KEY, SECRET);

  const token = client.generateUserToken({ user_id: authenticatedUserId });

  const response = {
    userId: authenticatedUserId,
    token: token,
  };

  return Response.json(response);
}
