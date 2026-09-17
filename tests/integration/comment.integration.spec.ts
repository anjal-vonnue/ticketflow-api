import { describe, beforeAll } from 'vitest';
import { api } from '../helpers/test-app.js';
import {
  disconnectTestDatabase,
  resetTestDatabase
} from '../helpers/test-db.js';

async function login(email: string, password: string) {
  const response = await api.post('/api/auth/login').send({
    email,
    password
  });

  return response.body.data.token as string;
}

describe('comment API', () => {
  let agentToken: string;
  let user1Token: string;
  let user2Token: string;
  let user1TicketId: string;

  beforeAll(async () => {
    await resetTestDatabase();

    agentToken = await login('agent@example.com', 'Agent123!');
    user1Token = await login('user1@example.com', 'User123!');
    user2Token = await login('user2@example.com', 'User234!');

    const createResponse = await api
      .post('/api/tickets')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        title: 'Cannot upload profile picture',
        description:
          'Uploading a JPEG larger than 2MB fails silently with no error message.',
        priority: 'MEDIUM'
      });

    user1TicketId = createResponse.body.data.id as string;
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it('creates a comment on a ticket the user can view', async () => {
    const response = await api
      .post(`/api/tickets/${user1TicketId}/comments`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ body: 'also happens with PNGs over 2MB.' });

    expect(response.status).toBe(201);
    expect(response.body.data.body).toBe('also happens with PNGs over 2MB.');
    expect(response.body.data.ticketId).toBe(user1TicketId);
    expect(response.body.data.author.email).toBe('user1@example.com');
  });

  it('lets an agent comment on any ticket', async () => {
    const response = await api
      .post(`/api/tickets/${user1TicketId}/comments`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ body: 'can you share the exact image dimensions?' });

    expect(response.status).toBe(201);
    expect(response.body.data.author.email).toBe('agent@example.com');
  });

  it('rejects comment creation from a user who cannot view the ticket', async () => {
    const response = await api
      .post(`/api/tickets/${user1TicketId}/comments`)
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ body: 'this is not my ticket' });
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('reject comment creation without authentication', async () => {
    const response = await api
      .post(`/api/tickets/${user1TicketId}/comments`)
      .send({ body: 'no auth header' });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('paginates comments', async () => {
    for (let i = 0; i < 4; i++) {
      await api
        .post(`/api/tickets/${user1TicketId}/comments`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          body: `Comment ${i}`
        });
    }

    const response = await api
      .get(`/api/tickets/${user1TicketId}/comments?page=1&limit=2`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.pagination.page).toBe(1);
    expect(response.body.pagination.limit).toBe(2);
    expect(response.body.pagination.total).toBeGreaterThanOrEqual(4);
  });
});
