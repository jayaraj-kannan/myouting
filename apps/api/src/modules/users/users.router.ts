import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { store } from '../../services/store';
import { ApiError } from '../../utils/errors';

export const usersRouter = Router();

// GET /users/me
usersRouter.get('/me', authenticate, (req, res) => {
  const userId = req.user!.userId;
  let profile = store.users.get(userId);

  if (!profile) {
    profile = {
      userId,
      displayName: req.user!.displayName || 'User',
      email: req.user!.email || null,
      phoneNumber: null,
      photoURL: req.user!.photoURL || null,
      preferredLanguage: 'en-IN',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.users.set(userId, profile);
  }

  res.json({ user: profile });
});

// PATCH /users/me
usersRouter.patch('/me', authenticate, (req, res) => {
  const userId = req.user!.userId;
  let profile = store.users.get(userId);
  if (!profile) {
    throw new ApiError(404, 'USER_NOT_FOUND', 'User profile not found');
  }

  const { displayName, preferredLanguage, photoURL } = req.body;
  if (displayName) profile.displayName = displayName;
  if (preferredLanguage) profile.preferredLanguage = preferredLanguage;
  if (photoURL !== undefined) profile.photoURL = photoURL;
  profile.updatedAt = new Date().toISOString();

  store.users.set(userId, profile);
  res.json({ user: profile });
});

// DELETE /users/me
usersRouter.delete('/me', authenticate, (req, res) => {
  const userId = req.user!.userId;
  store.users.delete(userId);
  res.json({ success: true, message: 'Account and profile deleted successfully' });
});
