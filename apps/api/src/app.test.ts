import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from './app';
import { auth } from './services/firebase';
import { GeminiAiProvider } from './providers/gemini-provider';

// Spy on Firebase Auth verification for tests
vi.spyOn(auth, 'verifyIdToken').mockResolvedValue({
  uid: 'usr_alex',
  name: 'Alex (Organizer)',
  email: 'alex@outingmate.app',
} as any);

// Spy on Gemini calls to avoid network dependency in unit test runner
vi.spyOn(GeminiAiProvider.prototype, 'extractInsights').mockResolvedValue({
  outingIntent: 'weekend_trip',
  summary: 'The group is discussing a weekend trip to Pondicherry.',
  destination: {
    field: 'destination',
    category: 'logistics',
    value: 'Pondicherry',
    status: 'proposed',
    evidenceMessageIds: ['msg_1'],
  },
  budget: {
    field: 'budget',
    category: 'financial',
    value: { amount: 2500, currency: 'INR', perPerson: true },
    status: 'proposed',
    evidenceMessageIds: ['msg_3'],
  },
  openQuestions: [],
  conflicts: [],
  tasks: [],
} as any);

vi.spyOn(GeminiAiProvider.prototype, 'generatePlan').mockResolvedValue({
  id: 'plan_test',
  workspaceId: 'ws_test',
  title: 'Pondicherry Trip Plan',
  description: 'Weekend trip plan',
  sourceImportIds: [],
  destination: { name: 'Pondicherry', status: 'proposed' },
  dates: { startDate: '2026-12-05', endDate: '2026-12-06', durationDays: 2, status: 'proposed' },
  budget: { estimatedTotal: 10000, estimatedPerPerson: 2500, currency: 'INR', status: 'proposed' },
  transportation: { mode: 'Car', status: 'proposed' },
  itinerary: [
    {
      id: 'itn_1',
      dayNumber: 1,
      time: '06:00 AM',
      title: 'Departure',
      description: 'Leave for Pondicherry',
      activityType: 'travel',
      status: 'proposed',
    },
  ],
  activities: [],
  pendingDecisions: [],
  tasks: [],
  status: 'draft',
  ownerId: 'usr_alex',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

vi.spyOn(GeminiAiProvider.prototype, 'chatWithAssistant').mockResolvedValue({
  answer: 'The group is discussing traveling to Pondicherry.',
  citations: [{ messageId: 'msg_1', sender: 'Priya', text: "Let's plan a weekend trip to Pondicherry" }],
});

const app = createApp();

describe('OutingMate API Integration Tests', () => {
  let createdWorkspaceId = '';
  let createdImportId = '';

  it('GET /health returns 200 OK', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /api/v1/users/me returns authenticated user', async () => {
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', 'Bearer valid_test_token');
    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.displayName).toContain('Alex');
  });

  it('POST /api/v1/workspaces creates a new outing workspace', async () => {
    const res = await request(app)
      .post('/api/v1/workspaces')
      .set('Authorization', 'Bearer valid_test_token')
      .send({
        title: 'Ooty Hills Trekking Trip',
        destination: 'Ooty',
        estimatedBudget: 3500,
      });

    expect(res.status).toBe(201);
    expect(res.body.workspace.title).toBe('Ooty Hills Trekking Trip');
    createdWorkspaceId = res.body.workspace.id;
  });

  it('POST /api/v1/workspaces/:id/imports uploads and parses WhatsApp chat', async () => {
    const sampleChat = `24/11/2026, 10:00 - Priya: Hey guys, let's plan a weekend trip to Pondicherry!
24/11/2026, 10:02 - Rahul: Awesome idea! I can drive my car.
24/11/2026, 10:05 - Karthik: Keep the budget around ₹2500 per head.
24/11/2026, 10:10 - Ananya: Let's visit Promenade Beach and Auroville.`;

    const res = await request(app)
      .post(`/api/v1/workspaces/${createdWorkspaceId}/imports`)
      .set('Authorization', 'Bearer valid_test_token')
      .field('consentConfirmed', 'true')
      .field('text', sampleChat);

    expect(res.status).toBe(201);
    expect(res.body.messageCount).toBe(4);
    expect(res.body.import.status).toBe('completed');
    createdImportId = res.body.import.id;
  });

  it('GET /api/v1/workspaces/:id/insights returns extracted insights with evidence', async () => {
    const res = await request(app)
      .get(`/api/v1/workspaces/${createdWorkspaceId}/insights`)
      .set('Authorization', 'Bearer valid_test_token');

    expect(res.status).toBe(200);
    expect(res.body.insights).toBeDefined();
    expect(res.body.insights.destination.value).toBe('Pondicherry');
    expect(res.body.insights.destination.evidenceMessageIds.length).toBeGreaterThan(0);
  });

  it('POST /api/v1/workspaces/:id/plans/generate creates editable outing plan', async () => {
    const res = await request(app)
      .post(`/api/v1/workspaces/${createdWorkspaceId}/plans/generate`)
      .set('Authorization', 'Bearer valid_test_token');

    expect(res.status).toBe(201);
    expect(res.body.plan).toBeDefined();
    expect(res.body.plan.destination.name).toBe('Pondicherry');
    expect(res.body.plan.itinerary.length).toBeGreaterThan(0);
    expect(res.body.plan.budget.estimatedPerPerson).toBeGreaterThan(0);
  });

  it('POST /api/v1/workspaces/:id/assistant/messages answers contextual query with citations', async () => {
    const res = await request(app)
      .post(`/api/v1/workspaces/${createdWorkspaceId}/assistant/messages`)
      .set('Authorization', 'Bearer valid_test_token')
      .send({
        message: 'What destination was suggested in the chat?',
      });

    expect(res.status).toBe(200);
    expect(res.body.message.content).toContain('Pondicherry');
  });

  it('POST /api/v1/workspaces/:id/votes creates a poll and records response', async () => {
    const createPollRes = await request(app)
      .post(`/api/v1/workspaces/${createdWorkspaceId}/votes`)
      .set('Authorization', 'Bearer valid_test_token')
      .send({
        title: 'Choose Departure Time',
        options: ['6:00 AM', '8:00 AM'],
      });

    expect(createPollRes.status).toBe(201);
    const pollId = createPollRes.body.poll.id;
    const optionId = createPollRes.body.poll.options[0].id;

    const voteRes = await request(app)
      .post(`/api/v1/votes/${pollId}/responses`)
      .set('Authorization', 'Bearer valid_test_token')
      .send({ optionId });

    expect(voteRes.status).toBe(200);
    expect(voteRes.body.poll.options[0].votes).toContain('usr_alex');
  });
});
