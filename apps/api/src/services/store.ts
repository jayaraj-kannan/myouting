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
  ExtractedFact,
} from '../types';
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
    this.seedInitialDemoData();
  }

  private seedInitialDemoData() {
    // Default organizer user
    const demoUser: UserProfile = {
      userId: 'usr_demo_1',
      displayName: 'Alex (Organizer)',
      email: 'alex@outingmate.app',
      phoneNumber: '+919876543210',
      preferredLanguage: 'en-IN',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.users.set(demoUser.userId, demoUser);

    // Default workspace
    const demoWorkspace: Workspace = {
      id: 'ws_pondicherry_demo',
      title: 'Pondicherry French Quarter & Beach Getaway',
      description: 'Weekend road trip with college friends',
      sourceType: 'chat_import',
      destination: 'Pondicherry',
      startDate: '2026-12-05',
      endDate: '2026-12-06',
      estimatedBudget: 2500,
      currency: 'INR',
      groupSize: 5,
      status: 'planning',
      ownerId: demoUser.userId,
      members: [
        {
          userId: demoUser.userId,
          displayName: demoUser.displayName,
          role: 'owner',
          joinedAt: new Date().toISOString(),
          email: demoUser.email || undefined,
        },
        {
          userId: 'usr_priya',
          displayName: 'Priya Sharma',
          role: 'editor',
          joinedAt: new Date().toISOString(),
        },
        {
          userId: 'usr_karthik',
          displayName: 'Karthik Raja',
          role: 'member',
          joinedAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.workspaces.set(demoWorkspace.id, demoWorkspace);

    // Demo tasks
    this.tasks.set(demoWorkspace.id, [
      {
        id: 'task_1',
        workspaceId: demoWorkspace.id,
        title: 'Book 2 heritage sea-view rooms at French Quarter',
        assignedTo: demoUser.userId,
        assignedToName: 'Alex',
        status: 'in_progress',
        dueDate: '2026-11-28',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'task_2',
        workspaceId: demoWorkspace.id,
        title: 'Coordinate car seats & fuel pooling split',
        assignedTo: 'usr_karthik',
        assignedToName: 'Karthik',
        status: 'pending',
        dueDate: '2026-12-01',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    // Demo poll
    this.votes.set(demoWorkspace.id, [
      {
        id: 'poll_1',
        workspaceId: demoWorkspace.id,
        title: 'Saturday Departure Time',
        category: 'general',
        options: [
          { id: 'opt_1', text: '5:30 AM (beat the toll traffic)', votes: [demoUser.userId, 'usr_karthik'] },
          { id: 'opt_2', text: '7:00 AM (more relaxed start)', votes: ['usr_priya'] },
        ],
        createdBy: demoUser.userId,
        closed: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'poll_2',
        workspaceId: demoWorkspace.id,
        title: 'Preferred Beach Activity',
        category: 'activity',
        options: [
          { id: 'act_1', text: 'Surfing lesson at Serenity Beach', votes: [demoUser.userId] },
          { id: 'act_2', text: 'Promenade walk & French cafe brunch', votes: ['usr_priya', 'usr_karthik'] },
        ],
        createdBy: demoUser.userId,
        closed: false,
        createdAt: new Date().toISOString(),
      },
    ]);

    // Demo expenses
    this.expenses.set(demoWorkspace.id, [
      {
        id: 'exp_1',
        workspaceId: demoWorkspace.id,
        title: 'Villa Booking Advance',
        amount: 3000,
        currency: 'INR',
        category: 'Stay',
        paidByUserId: demoUser.userId,
        paidByName: 'Alex',
        splitUserIds: [demoUser.userId, 'usr_priya', 'usr_karthik'],
        createdAt: new Date().toISOString(),
      },
    ]);
  }
}

export const store = new DataStore();
