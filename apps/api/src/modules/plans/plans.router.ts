import { Router } from 'express';
import { authenticate, requireWorkspaceRole } from '../../middleware/auth';
import { store } from '../../services/store';
import { ApiError } from '../../utils/errors';
import { GeminiAiProvider } from '../../providers/gemini-provider';
import { OutingPlan } from '../../types';

export const plansRouter = Router();
const aiProvider = new GeminiAiProvider();

// POST /workspaces/:id/plans/generate
plansRouter.post('/workspaces/:id/plans/generate', authenticate, requireWorkspaceRole(['owner', 'editor']), async (req, res, next) => {
  try {
    const workspaceId = req.params.id as string;
    const workspace = store.workspaces.get(workspaceId);
    if (!workspace) {
      throw new ApiError(404, 'WORKSPACE_NOT_FOUND', 'Workspace not found');
    }

    let insights = store.insights.get(workspaceId);
    if (!insights) {
      // If no insights exist yet, check if there are imported messages
      const imports = Array.from(store.imports.values()).filter(i => i.workspaceId === workspaceId);
      if (imports.length > 0) {
        const msgs = store.messages.get(imports[0].id) || [];
        insights = await aiProvider.extractInsights(msgs);
        store.insights.set(workspaceId, insights);
      } else {
        // Generate draft plan with sensible defaults
        insights = await aiProvider.extractInsights([]);
        store.insights.set(workspaceId, insights);
      }
    }

    const plan = await aiProvider.generatePlan(workspaceId, insights, req.user!.userId);

    // Save plan
    const existing = store.plans.get(workspaceId) || [];
    existing.push(plan);
    store.plans.set(workspaceId, existing);

    // Update workspace destination & budget
    if (plan.destination?.name) workspace.destination = plan.destination.name;
    if (plan.dates?.startDate) workspace.startDate = plan.dates.startDate;
    if (plan.dates?.endDate) workspace.endDate = plan.dates.endDate;
    if (plan.budget?.estimatedPerPerson) workspace.estimatedBudget = plan.budget.estimatedPerPerson;
    workspace.status = 'planning';
    workspace.updatedAt = new Date().toISOString();

    res.status(201).json({ plan });
  } catch (err) {
    next(err);
  }
});

// GET /workspaces/:id/plans
plansRouter.get('/workspaces/:id/plans', authenticate, (req, res) => {
  const workspaceId = req.params.id as string;
  const plans = store.plans.get(workspaceId) || [];
  res.json({ plans });
});

// GET /plans/:id
plansRouter.get('/plans/:id', authenticate, (req, res) => {
  const planId = req.params.id as string;
  for (const list of store.plans.values()) {
    const found = list.find(p => p.id === planId);
    if (found) return res.json({ plan: found });
  }
  throw new ApiError(404, 'PLAN_NOT_FOUND', 'Plan not found');
});

// PATCH /plans/:id
plansRouter.patch('/plans/:id', authenticate, (req, res) => {
  const planId = req.params.id as string;
  let targetPlan: OutingPlan | null = null;

  for (const [_, list] of store.plans.entries()) {
    const found = list.find(p => p.id === planId);
    if (found) {
      targetPlan = found;
      break;
    }
  }

  if (!targetPlan) {
    throw new ApiError(404, 'PLAN_NOT_FOUND', 'Plan not found');
  }

  const { title, description, destination, dates, budget, itinerary, tasks, pendingDecisions, status } = req.body;

  if (title) targetPlan.title = title;
  if (description !== undefined) targetPlan.description = description;
  if (destination) targetPlan.destination = { ...targetPlan.destination, ...destination };
  if (dates) targetPlan.dates = { ...targetPlan.dates, ...dates };
  if (budget) targetPlan.budget = { ...targetPlan.budget, ...budget };
  if (itinerary) targetPlan.itinerary = itinerary;
  if (tasks) targetPlan.tasks = tasks;
  if (pendingDecisions) targetPlan.pendingDecisions = pendingDecisions;
  if (status) targetPlan.status = status;
  targetPlan.updatedAt = new Date().toISOString();

  res.json({ plan: targetPlan });
});

// POST /plans/:id/regenerate-section
plansRouter.post('/plans/:id/regenerate-section', authenticate, async (req, res, next) => {
  try {
    const planId = req.params.id as string;
    const { section, prompt } = req.body;

    let targetPlan: OutingPlan | null = null;
    for (const list of store.plans.values()) {
      const found = list.find(p => p.id === planId);
      if (found) {
        targetPlan = found;
        break;
      }
    }

    if (!targetPlan) {
      throw new ApiError(404, 'PLAN_NOT_FOUND', 'Plan not found');
    }

    const updatedSectionData = await aiProvider.regenerateSection(targetPlan, section, prompt);
    if (section === 'itinerary' && updatedSectionData) {
      targetPlan.itinerary = updatedSectionData;
    } else if (section === 'budget' && updatedSectionData) {
      targetPlan.budget = updatedSectionData;
    }

    targetPlan.updatedAt = new Date().toISOString();
    res.json({ success: true, plan: targetPlan, sectionData: updatedSectionData });
  } catch (err) {
    next(err);
  }
});
