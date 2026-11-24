import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/errors';
import { store } from '../services/store';
import { config } from '../config/env';
import { logger } from '../utils/logger';

export interface AuthenticatedUser {
  userId: string;
  email?: string;
  displayName: string;
  photoURL?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const devUserId = req.headers['x-user-id'] as string;

  // Development / Demo token fallback
  if (!authHeader && !devUserId) {
    // If running in development and no token, default to demo organizer user
    const defaultUser = store.users.get('usr_demo_1');
    if (defaultUser) {
      req.user = {
        userId: defaultUser.userId,
        email: defaultUser.email || undefined,
        displayName: defaultUser.displayName,
      };
      return next();
    }
    return next(new ApiError(401, 'UNAUTHORIZED', 'Authentication token is missing.'));
  }

  let token = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (devUserId) {
    token = devUserId;
  }

  // Check demo token
  if (token.startsWith('demo-') || token === 'usr_demo_1' || token === 'demo-token') {
    const demoUser = store.users.get('usr_demo_1');
    if (demoUser) {
      req.user = {
        userId: demoUser.userId,
        email: demoUser.email || undefined,
        displayName: demoUser.displayName,
      };
      return next();
    }
  }

  // If Firebase Admin is available and not in mock mode, verify with Firebase Admin
  if (!config.firebase.useMock && config.firebase.projectId) {
    try {
      const admin = require('firebase-admin');
      const decoded = await admin.auth().verifyIdToken(token);
      req.user = {
        userId: decoded.uid,
        email: decoded.email,
        displayName: decoded.name || 'User',
        photoURL: decoded.picture,
      };
      return next();
    } catch (err: any) {
      logger.error({ err }, 'Firebase token verification failed');
      return next(new ApiError(401, 'INVALID_TOKEN', 'Firebase token verification failed'));
    }
  }

  // Mock / Dev authenticated user
  const existingUser = store.users.get(token) || {
    userId: token,
    displayName: 'User',
    preferredLanguage: 'en-IN',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  req.user = {
    userId: existingUser.userId,
    email: existingUser.email || undefined,
    displayName: existingUser.displayName,
  };
  return next();
}

export function requireWorkspaceRole(allowedRoles: Array<'owner' | 'editor' | 'member' | 'viewer'>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const workspaceId = (req.params.workspaceId || req.params.id) as string;
    if (!workspaceId) {
      return next(new ApiError(400, 'BAD_REQUEST', 'Workspace ID is required'));
    }

    const workspace = store.workspaces.get(workspaceId);
    if (!workspace) {
      return next(new ApiError(404, 'WORKSPACE_NOT_FOUND', `Workspace ${workspaceId} not found`));
    }

    const userId = req.user?.userId;
    if (!userId) {
      return next(new ApiError(401, 'UNAUTHORIZED', 'User not authenticated'));
    }

    const member = workspace.members.find(m => m.userId === userId);
    if (!member) {
      // If user is owner or system admin
      if (workspace.ownerId === userId) {
        return next();
      }
      return next(new ApiError(403, 'FORBIDDEN', 'You are not a member of this workspace'));
    }

    if (!allowedRoles.includes(member.role)) {
      return next(new ApiError(403, 'INSUFFICIENT_PERMISSIONS', `Role ${member.role} does not have permission`));
    }

    return next();
  };
}
