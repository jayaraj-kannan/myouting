import { describe, it, expect } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { createApp } from '../../app';

const app = createApp();

describe('OutingMate End-to-End Vertical Slice Workflow', () => {
  it('executes full cycle: Upload WhatsApp TXT -> Parse -> Extract Facts -> Generate Plan -> Confirm -> Ask Voice Assistant -> Vote Polls', async () => {
    // 1. Create workspace
    const wsRes = await request(app)
      .post('/api/v1/workspaces')
      .set('Authorization', 'Bearer demo-token')
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
      .set('Authorization', 'Bearer demo-token')
      .field('consentConfirmed', 'true')
      .field('text', rawChat);

    expect(importRes.status).toBe(201);
    expect(importRes.body.messageCount).toBe(13);
    const importId = importRes.body.import.id;

    // 3. Inspect parsed messages
    const msgsRes = await request(app)
      .get(`/api/v1/imports/${importId}/messages`)
      .set('Authorization', 'Bearer demo-token');
    expect(msgsRes.status).toBe(200);
    expect(msgsRes.body.messages.length).toBe(13);

    // 4. Retrieve Extracted Insights with Evidence
    const insightsRes = await request(app)
      .get(`/api/v1/workspaces/${workspaceId}/insights`)
      .set('Authorization', 'Bearer demo-token');
    expect(insightsRes.status).toBe(200);
    const insights = insightsRes.body.insights;
    expect(insights.destination.value).toBe('Pondicherry');
    expect(insights.destination.evidenceMessageIds.length).toBeGreaterThan(0);
    expect(insights.budget.value.amount).toBe(2500);

    // 5. Generate Outing Plan
    const planRes = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/plans/generate`)
      .set('Authorization', 'Bearer demo-token');
    expect(planRes.status).toBe(201);
    const plan = planRes.body.plan;
    expect(plan.destination.name).toBe('Pondicherry');
    expect(plan.itinerary.length).toBeGreaterThanOrEqual(4);
    expect(plan.budget.estimatedPerPerson).toBe(2500);

    // 6. User confirms the plan
    const updateRes = await request(app)
      .patch(`/api/v1/plans/${plan.id}`)
      .set('Authorization', 'Bearer demo-token')
      .send({ status: 'confirmed' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.plan.status).toBe('confirmed');

    // 7. Contextual AI Assistant query with message citation
    const askRes = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/assistant/messages`)
      .set('Authorization', 'Bearer demo-token')
      .send({ message: 'What is the budget per person?' });
    expect(askRes.status).toBe(200);
    expect(askRes.body.message.content).toContain('2,500');

    // 8. Collaboration: create poll and record vote
    const pollRes = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/votes`)
      .set('Authorization', 'Bearer demo-token')
      .send({
        title: 'Serenity Beach or Promenade Beach for Sunset?',
        options: ['Serenity Beach', 'Promenade Beach'],
      });
    expect(pollRes.status).toBe(201);
    const pollId = pollRes.body.poll.id;
    const optId = pollRes.body.poll.options[0].id;

    const voteRes = await request(app)
      .post(`/api/v1/votes/${pollId}/responses`)
      .set('Authorization', 'Bearer demo-token')
      .send({ optionId: optId });
    expect(voteRes.status).toBe(200);
    expect(voteRes.body.poll.options[0].votes.length).toBe(1);
  });
});
