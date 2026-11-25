import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/errors';
import { store } from '../services/store';
import { auth } from '../services/firebase';
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

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Authentication token is missing. Please provide Authorization: Bearer <idToken>'));
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Bearer token cannot be empty.'));
  }

  try {
    const decoded = await auth.verifyIdToken(token);
    const userId = decoded.uid;
    const displayName = decoded.name || decoded.email?.split('@')[0] || 'User';

    let profile = store.users.get(userId);
    if (!profile) {
      profile = {
        userId,
        displayName,
        email: decoded.email || null,
        photoURL: decoded.picture || null,
        preferredLanguage: 'en-IN',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.users.set(userId, profile);
      store.syncToFirestore('users', userId, profile);
    }

    req.user = {
      userId,
      email: decoded.email,
      displayName,
      photoURL: decoded.picture,
    };
    return next();
  } catch (err: any) {
    logger.error({ err: err.message }, 'Firebase token verification failed');
    return next(new ApiError(401, 'INVALID_TOKEN', `Authentication failed: ${err.message}`));
  }
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
