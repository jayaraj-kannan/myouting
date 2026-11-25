import admin from 'firebase-admin';
import { config } from '../config/env';
import { logger } from '../utils/logger';

if (!admin.apps.length) {
  try {
    if (
      config.firebase.privateKey &&
      config.firebase.privateKey.includes('BEGIN PRIVATE KEY') &&
      config.firebase.clientEmail &&
      config.firebase.projectId
    ) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: config.firebase.projectId,
          clientEmail: config.firebase.clientEmail,
          privateKey: config.firebase.privateKey,
        }),
      });
      logger.info('Firebase Admin initialized with service account certificate');
    } else if (config.firebase.projectId) {
      admin.initializeApp({
        projectId: config.firebase.projectId,
      });
      logger.info({ projectId: config.firebase.projectId }, 'Firebase Admin initialized with project ID');
    } else {
      admin.initializeApp();
      logger.info('Firebase Admin initialized with application default credentials');
    }
  } catch (err: any) {
    logger.error({ err }, 'Error initializing Firebase Admin');
    // Ensure an app is initialized
    if (!admin.apps.length) {
      admin.initializeApp();
    }
  }
}

export const firebaseAdmin = admin;
export const auth = admin.auth();
export const db = admin.firestore();
