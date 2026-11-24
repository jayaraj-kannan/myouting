import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { store } from '../../services/store';
import { ApiError } from '../../utils/errors';
import { VotePoll, TaskItem, ExpenseItem, CommentItem } from '../../types';

export const collaborationRouter = Router();

// GET /workspaces/:id/votes
collaborationRouter.get('/workspaces/:id/votes', authenticate, (req, res) => {
  const workspaceId = req.params.id as string;
  const votes = store.votes.get(workspaceId) || [];
  res.json({ votes });
});

// POST /workspaces/:id/votes
collaborationRouter.post('/workspaces/:id/votes', authenticate, (req, res) => {
  const workspaceId = req.params.id as string;
  const { title, category, options } = req.body;

  if (!title || !options || !Array.isArray(options) || options.length < 2) {
    throw new ApiError(400, 'BAD_REQUEST', 'Title and at least 2 options are required');
  }

  const pollId = `poll_${Date.now()}`;
  const newPoll: VotePoll = {
    id: pollId,
    workspaceId,
    title,
    category: category || 'general',
    options: options.map((opt: string, i: number) => ({
      id: `opt_${i + 1}`,
      text: opt,
      votes: [],
    })),
    createdBy: req.user!.userId,
    closed: false,
    createdAt: new Date().toISOString(),
  };

  const list = store.votes.get(workspaceId) || [];
  list.push(newPoll);
  store.votes.set(workspaceId, list);

  res.status(201).json({ poll: newPoll });
});

// POST /votes/:id/responses
collaborationRouter.post('/votes/:id/responses', authenticate, (req, res) => {
  const pollId = req.params.id as string;
  const { optionId } = req.body;
  const userId = req.user!.userId;

  let targetPoll: VotePoll | null = null;
  for (const list of store.votes.values()) {
    const found = list.find(p => p.id === pollId);
    if (found) {
      targetPoll = found;
      break;
    }
  }

  if (!targetPoll) {
    throw new ApiError(404, 'POLL_NOT_FOUND', 'Poll not found');
  }

  // Remove existing vote by this user across options
  for (const opt of targetPoll.options) {
    opt.votes = opt.votes.filter(uId => uId !== userId);
  }

  // Add user vote to selected option
  const selectedOpt = targetPoll.options.find(o => o.id === optionId);
  if (!selectedOpt) {
    throw new ApiError(404, 'OPTION_NOT_FOUND', 'Option not found in poll');
  }
  selectedOpt.votes.push(userId);

  res.json({ success: true, poll: targetPoll });
});

// GET /workspaces/:id/tasks
collaborationRouter.get('/workspaces/:id/tasks', authenticate, (req, res) => {
  const workspaceId = req.params.id as string;
  const tasks = store.tasks.get(workspaceId) || [];
  res.json({ tasks });
});

// POST /workspaces/:id/tasks
collaborationRouter.post('/workspaces/:id/tasks', authenticate, (req, res) => {
  const workspaceId = req.params.id as string;
  const { title, description, assignedTo, assignedToName, dueDate } = req.body;

  if (!title) {
    throw new ApiError(400, 'BAD_REQUEST', 'Task title is required');
  }

  const taskId = `task_${Date.now()}`;
  const newTask: TaskItem = {
    id: taskId,
    workspaceId,
    title,
    description: description || undefined,
    assignedTo: assignedTo || undefined,
    assignedToName: assignedToName || undefined,
    status: 'pending',
    dueDate: dueDate || undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const list = store.tasks.get(workspaceId) || [];
  list.push(newTask);
  store.tasks.set(workspaceId, list);

  res.status(201).json({ task: newTask });
});

// PATCH /tasks/:id
collaborationRouter.patch('/tasks/:id', authenticate, (req, res) => {
  const taskId = req.params.id as string;
  const { status, title, assignedTo, assignedToName, dueDate } = req.body;

  let targetTask: TaskItem | null = null;
  for (const list of store.tasks.values()) {
    const found = list.find(t => t.id === taskId);
    if (found) {
      targetTask = found;
      break;
    }
  }

  if (!targetTask) {
    throw new ApiError(404, 'TASK_NOT_FOUND', 'Task not found');
  }

  if (status) targetTask.status = status;
  if (title) targetTask.title = title;
  if (assignedTo !== undefined) targetTask.assignedTo = assignedTo;
  if (assignedToName !== undefined) targetTask.assignedToName = assignedToName;
  if (dueDate !== undefined) targetTask.dueDate = dueDate;
  targetTask.updatedAt = new Date().toISOString();

  res.json({ task: targetTask });
});

// GET /workspaces/:id/expenses
collaborationRouter.get('/workspaces/:id/expenses', authenticate, (req, res) => {
  const workspaceId = req.params.id as string;
  const expenses = store.expenses.get(workspaceId) || [];
  res.json({ expenses });
});

// POST /workspaces/:id/expenses
collaborationRouter.post('/workspaces/:id/expenses', authenticate, (req, res) => {
  const workspaceId = req.params.id as string;
  const { title, amount, currency, category, splitUserIds } = req.body;

  if (!title || !amount) {
    throw new ApiError(400, 'BAD_REQUEST', 'Title and amount are required');
  }

  const newExpense: ExpenseItem = {
    id: `exp_${Date.now()}`,
    workspaceId,
    title,
    amount: Number(amount),
    currency: currency || 'INR',
    category: category || 'General',
    paidByUserId: req.user!.userId,
    paidByName: req.user!.displayName,
    splitUserIds: splitUserIds || [req.user!.userId],
    createdAt: new Date().toISOString(),
  };

  const list = store.expenses.get(workspaceId) || [];
  list.push(newExpense);
  store.expenses.set(workspaceId, list);

  res.status(201).json({ expense: newExpense });
});

// GET /workspaces/:id/comments
collaborationRouter.get('/workspaces/:id/comments', authenticate, (req, res) => {
  const workspaceId = req.params.id as string;
  const comments = store.comments.get(workspaceId) || [];
  res.json({ comments });
});

// POST /workspaces/:id/comments
collaborationRouter.post('/workspaces/:id/comments', authenticate, (req, res) => {
  const workspaceId = req.params.id as string;
  const { text } = req.body;

  if (!text || !text.trim()) {
    throw new ApiError(400, 'BAD_REQUEST', 'Comment text is required');
  }

  const newComment: CommentItem = {
    id: `cmt_${Date.now()}`,
    workspaceId,
    userId: req.user!.userId,
    userName: req.user!.displayName,
    text,
    createdAt: new Date().toISOString(),
  };

  const list = store.comments.get(workspaceId) || [];
  list.push(newComment);
  store.comments.set(workspaceId, list);

  res.status(201).json({ comment: newComment });
});
