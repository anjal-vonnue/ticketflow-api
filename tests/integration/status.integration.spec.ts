import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { api } from '../helpers/test-app.js';
import {
  disconnectTestDatabase,
  resetTestDatabase
} from '../helpers/test-db.js';

async function login(email: string, password: string) {
  const response = await api.post('/api/auth/login').send({ email, password });
  return response.body.data.token as string;
}

describe('ticket status history API', () => {
  let adminToken: string;
  let agentToken: string;
  let user1Token: string;
  let agentId: string;
  let ticketId: string;

  beforeAll(async () => {
    await resetTestDatabase();

    adminToken = await login('admin@example.com', 'Admin123!');
    agentToken = await login('agent@example.com', 'Agent123!');
    user1Token = await login('user1@example.com', 'User123!');

    const usersResponse = await api
      .get('/api/users?role=AGENT')
      .set('Authorization', `Bearer ${adminToken}`);

    agentId = usersResponse.body.data[0].id as string;

    const createResponse = await api
      .post('/api/tickets')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        title: 'test status title ticket',
        description: 'test test test',
        priority: 'HIGH'
      });

    ticketId = createResponse.body.data.id as string;

    await api
      .patch(`/api/tickets/${ticketId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assignedToId: agentId });
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it('returns no history for a freshly created ticket', async () => {
    const response = await api
      .get(`/api/tickets/${ticketId}/status-history`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(0);
  });

  it('creates a history record on a successful status change', async () => {
    const changeResponse = await api
      .patch(`/api/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ status: 'IN_PROGRESS' });

    expect(changeResponse.status).toBe(200);
    expect(changeResponse.body.data.status).toBe('IN_PROGRESS');

    const historyResponse = await api
      .get(`/api/tickets/${ticketId}/status-history`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(historyResponse.status).toBe(200);
    expect(historyResponse.body.data).toHaveLength(1);

    const [entry] = historyResponse.body.data;
    expect(entry.ticketId).toBe(ticketId);
    expect(entry.fromStatus).toBe('OPEN');
    expect(entry.toStatus).toBe('IN_PROGRESS');
  });

  it('appends further history records in chronological order on subsequent changes', async () => {
    const response = await api
      .patch(`/api/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ status: 'RESOLVED' });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('RESOLVED');

    const historyResponse = await api
      .get(`/api/tickets/${ticketId}/status-history`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(historyResponse.status).toBe(200);
    expect(historyResponse.body.data).toHaveLength(2);

    const [first, second] = historyResponse.body.data;
    expect(first.fromStatus).toBe('OPEN');
    expect(first.toStatus).toBe('IN_PROGRESS');
    expect(second.fromStatus).toBe('IN_PROGRESS');
    expect(second.toStatus).toBe('RESOLVED');
  });

  it('rejects a user viewing status history for a ticket they do not own', async () => {
    const otherUserLogin = await login('user2@example.com', 'User234!');

    const response = await api
      .get(`/api/tickets/${ticketId}/status-history`)
      .set('Authorization', `Bearer ${otherUserLogin}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('rejects status history requests without authentication', async () => {
    const response = await api.get(`/api/tickets/${ticketId}/status-history`);

    expect(response.status).toBe(401);
  });
});
