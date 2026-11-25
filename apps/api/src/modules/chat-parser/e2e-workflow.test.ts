import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { createApp } from '../../app';
import { auth } from '../../services/firebase';
import { GeminiAiProvider } from '../../providers/gemini-provider';

// Spy on Firebase Auth verification for tests
vi.spyOn(auth, 'verifyIdToken').mockResolvedValue({
  uid: 'usr_organizer_alex',
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
  id: 'plan_e2e',
  workspaceId: 'ws_e2e',
  title: 'Pondicherry Group Outing',
  description: 'Actionable weekend outing plan',
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
  ownerId: 'usr_organizer_alex',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

vi.spyOn(GeminiAiProvider.prototype, 'chatWithAssistant').mockResolvedValue({
  answer: 'The proposed budget discussed in the chat is approximately ₹2,500 per person.',
  citations: [{ messageId: 'msg_3', sender: 'Karthik', text: 'Keep budget around ₹2500' }],
});

const app = createApp();

describe('OutingMate End-to-End Vertical Slice Workflow', () => {
  it('executes full cycle: Upload WhatsApp TXT -> Parse -> Extract Facts -> Generate Plan -> Confirm -> Ask Voice Assistant -> Vote Polls', async () => {
    // 1. Create workspace
    const wsRes = await request(app)
      .post('/api/v1/workspaces')
      .set('Authorization', 'Bearer valid_test_token')
      .send({
        title: 'College Friends Reunion',
        description: 'Pondicherry Road Trip',
      });
    expect(wsRes.status).toBe(201);
    const workspaceId = wsRes.body.workspace.id;

    // 2. Read sample fixture and upload
    const fixturePath = path.resolve(__dirname, '../../../../../fixtures/sample_whatsapp_chat.txt');
    const rawChat = fs.readFileSync(fixturePath, 'utf8');

    const importRes = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/imports`)
      .set('Authorization', 'Bearer valid_test_token')
      .field('consentConfirmed', 'true')
      .field('text', rawChat);

    expect(importRes.status).toBe(201);
    expect(importRes.body.messageCount).toBe(13);
    const importId = importRes.body.import.id;

    // 3. Inspect parsed messages
    const msgsRes = await request(app)
      .get(`/api/v1/imports/${importId}/messages`)
      .set('Authorization', 'Bearer valid_test_token');
    expect(msgsRes.status).toBe(200);
    expect(msgsRes.body.messages.length).toBe(13);

    // 4. Retrieve Extracted Insights with Evidence
    const insightsRes = await request(app)
      .get(`/api/v1/workspaces/${workspaceId}/insights`)
      .set('Authorization', 'Bearer valid_test_token');
    expect(insightsRes.status).toBe(200);
    const insights = insightsRes.body.insights;
    expect(insights.destination.value).toBe('Pondicherry');
    expect(insights.destination.evidenceMessageIds.length).toBeGreaterThan(0);
    expect(insights.budget.value.amount).toBe(2500);

    // 5. Generate Outing Plan
    const planRes = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/plans/generate`)
      .set('Authorization', 'Bearer valid_test_token');
    expect(planRes.status).toBe(201);
    const plan = planRes.body.plan;
    expect(plan.destination.name).toBe('Pondicherry');
    expect(plan.itinerary.length).toBeGreaterThanOrEqual(1);
    expect(plan.budget.estimatedPerPerson).toBe(2500);

    // 6. User confirms the plan
    const updateRes = await request(app)
      .patch(`/api/v1/plans/${plan.id}`)
      .set('Authorization', 'Bearer valid_test_token')
      .send({ status: 'confirmed' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.plan.status).toBe('confirmed');

    // 7. Contextual AI Assistant query with message citation
    const askRes = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/assistant/messages`)
      .set('Authorization', 'Bearer valid_test_token')
      .send({ message: 'What is the budget per person?' });
    expect(askRes.status).toBe(200);
    expect(askRes.body.message.content).toContain('2,500');

    // 8. Collaboration: create poll and record vote
    const pollRes = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/votes`)
      .set('Authorization', 'Bearer valid_test_token')
      .send({
        title: 'Serenity Beach or Promenade Beach for Sunset?',
        options: ['Serenity Beach', 'Promenade Beach'],
      });
    expect(pollRes.status).toBe(201);
    const pollId = pollRes.body.poll.id;
    const optId = pollRes.body.poll.options[0].id;

    const voteRes = await request(app)
      .post(`/api/v1/votes/${pollId}/responses`)
      .set('Authorization', 'Bearer valid_test_token')
      .send({ optionId: optId });
    expect(voteRes.status).toBe(200);
    expect(voteRes.body.poll.options[0].votes.length).toBe(1);
  });
});
