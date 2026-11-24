import { Router } from 'express';
import { authenticate, requireWorkspaceRole } from '../../middleware/auth';
import { store } from '../../services/store';
import { ApiError } from '../../utils/errors';
import { Workspace } from '../../types';

export const workspacesRouter = Router();

// GET /workspaces - List workspaces user belongs to
workspacesRouter.get('/', authenticate, (req, res) => {
  const userId = req.user!.userId;
  const list: Workspace[] = [];

  for (const ws of store.workspaces.values()) {
    if (ws.ownerId === userId || ws.members.some(m => m.userId === userId)) {
      list.push(ws);
    }
  }

  res.json({ workspaces: list });
});

// POST /workspaces - Create workspace
workspacesRouter.post('/', authenticate, (req, res) => {
  const userId = req.user!.userId;
  const { title, description, sourceType, destination, startDate, endDate, estimatedBudget, currency, groupSize } = req.body;

  if (!title) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Title is required');
  }

  const workspaceId = `ws_${Date.now()}`;
  const newWorkspace: Workspace = {
    id: workspaceId,
    title,
    description: description || '',
    sourceType: sourceType || 'manual',
    destination: destination || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    estimatedBudget: estimatedBudget ? Number(estimatedBudget) : undefined,
    currency: currency || 'INR',
    groupSize: groupSize ? Number(groupSize) : undefined,
    status: 'draft',
    ownerId: userId,
    members: [
      {
        userId,
        displayName: req.user!.displayName,
        role: 'owner',
        joinedAt: new Date().toISOString(),
        email: req.user!.email,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.workspaces.set(workspaceId, newWorkspace);
  res.status(201).json({ workspace: newWorkspace });
});

// GET /workspaces/:id
workspacesRouter.get('/:id', authenticate, (req, res) => {
  const workspaceId = req.params.id as string;
  const workspace = store.workspaces.get(workspaceId);
  if (!workspace) {
    throw new ApiError(404, 'WORKSPACE_NOT_FOUND', 'Workspace not found');
  }
  res.json({ workspace });
});

// PATCH /workspaces/:id
workspacesRouter.patch('/:id', authenticate, requireWorkspaceRole(['owner', 'editor']), (req, res) => {
  const workspaceId = req.params.id as string;
  const workspace = store.workspaces.get(workspaceId);
  if (!workspace) {
    throw new ApiError(404, 'WORKSPACE_NOT_FOUND', 'Workspace not found');
  }

  const { title, description, destination, startDate, endDate, estimatedBudget, currency, status, groupSize } = req.body;
  if (title) workspace.title = title;
  if (description !== undefined) workspace.description = description;
  if (destination !== undefined) workspace.destination = destination;
  if (startDate !== undefined) workspace.startDate = startDate;
  if (endDate !== undefined) workspace.endDate = endDate;
  if (estimatedBudget !== undefined) workspace.estimatedBudget = Number(estimatedBudget);
  if (currency) workspace.currency = currency;
  if (status) workspace.status = status;
  if (groupSize !== undefined) workspace.groupSize = Number(groupSize);
  workspace.updatedAt = new Date().toISOString();

  store.workspaces.set(workspace.id, workspace);
  res.json({ workspace });
});

// DELETE /workspaces/:id
workspacesRouter.delete('/:id', authenticate, requireWorkspaceRole(['owner']), (req, res) => {
  const workspaceId = req.params.id as string;
  const workspace = store.workspaces.get(workspaceId);
  if (!workspace) {
    throw new ApiError(404, 'WORKSPACE_NOT_FOUND', 'Workspace not found');
  }

  store.workspaces.delete(workspaceId);
  res.json({ success: true, message: 'Workspace deleted' });
});

// POST /workspaces/:id/invitations
workspacesRouter.post('/:id/invitations', authenticate, requireWorkspaceRole(['owner', 'editor']), (req, res) => {
  const workspaceId = req.params.id as string;
  const workspace = store.workspaces.get(workspaceId);
  if (!workspace) {
    throw new ApiError(404, 'WORKSPACE_NOT_FOUND', 'Workspace not found');
  }

  const token = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const invitation = {
    invitationId: token,
    workspaceId: workspace.id,
    role: (req.body.role || 'member') as 'editor' | 'member',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };

  store.invitations.set(token, invitation);

  const inviteUrl = `${req.headers.origin || 'http://localhost:5173'}/invite/${token}`;
  res.json({
    invitation,
    inviteUrl,
  });
});

// POST /invitations/:token/accept
workspacesRouter.post('/invitations/:token/accept', authenticate, (req, res) => {
  const token = req.params.token as string;
  const invitation = store.invitations.get(token);
  if (!invitation) {
    throw new ApiError(404, 'INVITATION_NOT_FOUND', 'Invalid or expired invitation link');
  }

  const workspace = store.workspaces.get(invitation.workspaceId);
  if (!workspace) {
    throw new ApiError(404, 'WORKSPACE_NOT_FOUND', 'Workspace no longer exists');
  }

  const userId = req.user!.userId;
  const alreadyMember = workspace.members.some(m => m.userId === userId);
  if (!alreadyMember) {
    workspace.members.push({
      userId,
      displayName: req.user!.displayName,
      role: invitation.role,
      joinedAt: new Date().toISOString(),
      email: req.user!.email,
    });
    workspace.updatedAt = new Date().toISOString();
  }

  res.json({ success: true, workspace });
});
