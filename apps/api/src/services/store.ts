import {
  UserProfile,
  Workspace,
  ChatImportRecord,
  NormalizedMessage,
  ExtractedInsights,
  OutingPlan,
  VotePoll,
  TaskItem,
  ExpenseItem,
  CommentItem,
  AssistantMessage,
} from '../types';
import { db } from './firebase';
import { logger } from '../utils/logger';

export class DataStore {
  public users = new Map<string, UserProfile>();
  public workspaces = new Map<string, Workspace>();
  public invitations = new Map<string, { invitationId: string; workspaceId: string; role: 'editor' | 'member'; expiresAt: string }>();
  public imports = new Map<string, ChatImportRecord>();
  public messages = new Map<string, NormalizedMessage[]>(); // importId -> messages
  public insights = new Map<string, ExtractedInsights>(); // workspaceId -> insights
  public plans = new Map<string, OutingPlan[]>(); // workspaceId -> plans
  public votes = new Map<string, VotePoll[]>(); // workspaceId -> polls
  public tasks = new Map<string, TaskItem[]>(); // workspaceId -> tasks
  public expenses = new Map<string, ExpenseItem[]>(); // workspaceId -> expenses
  public comments = new Map<string, CommentItem[]>(); // workspaceId -> comments
  public assistantSessions = new Map<string, AssistantMessage[]>(); // sessionId -> messages

  constructor() {
    // No mock seed data: fresh state per spec
  }

  // Firestore sync helper
  async syncToFirestore(collectionName: string, docId: string, data: any) {
    try {
      if (db) {
        await db.collection(collectionName).doc(docId).set(data, { merge: true });
      }
    } catch (err: any) {
      logger.debug({ err: err.message, collectionName, docId }, 'Firestore background sync note');
    }
  }

  async deleteFromFirestore(collectionName: string, docId: string) {
    try {
      if (db) {
        await db.collection(collectionName).doc(docId).delete();
      }
    } catch (err: any) {
      logger.debug({ err: err.message, collectionName, docId }, 'Firestore background delete note');
    }
  }
}

export const store = new DataStore();
