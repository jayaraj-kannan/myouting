export type FactStatus = 'confirmed' | 'proposed' | 'inferred' | 'conflicting' | 'unknown';

export interface ExtractedFact<T = any> {
  field: string;
  category: string;
  value: T;
  status: FactStatus;
  confidence?: number;
  evidenceMessageIds: string[];
  reviewedBy?: string | null;
}

export interface ExtractedInsights {
  outingIntent: string;
  summary: string;
  destination?: ExtractedFact<string>;
  alternativeDestinations?: ExtractedFact<string[]>;
  date?: ExtractedFact<{
    startDate?: string;
    endDate?: string;
    durationDays?: number;
    preferredDates?: string[];
  }>;
  budget?: ExtractedFact<{
    amount?: number;
    currency: string;
    perPerson: boolean;
    breakdown?: Record<string, number>;
  }>;
  transport?: ExtractedFact<{
    mode?: string;
    details?: string;
  }>;
  participants?: ExtractedFact<{
    interested: string[];
    confirmed: string[];
    declined: string[];
    totalEstimated: number;
  }>;
  activities?: ExtractedFact<Array<{
    name: string;
    suggestedBy?: string;
    status: FactStatus;
  }>>;
  foodPreferences?: ExtractedFact<{
    dietary: string[];
    cuisinePreferences: string[];
    restaurantSuggestions: string[];
  }>;
  accommodation?: ExtractedFact<{
    type?: string;
    suggestions: string[];
  }>;
  openQuestions: Array<{
    question: string;
    askedBy?: string;
    evidenceMessageIds: string[];
    category?: string;
  }>;
  conflicts: Array<{
    topic: string;
    competingOptions: string[];
    evidenceMessageIds: string[];
    severity: 'low' | 'medium' | 'high';
  }>;
  tasks: Array<{
    description: string;
    assignedTo?: string;
    status: 'pending' | 'in_progress' | 'completed';
    evidenceMessageIds: string[];
  }>;
}

export interface ItineraryItem {
  id: string;
  dayNumber: number;
  time?: string;
  title: string;
  description: string;
  location?: string;
  estimatedCost?: number;
  activityType: 'travel' | 'meal' | 'activity' | 'rest' | 'lodging' | 'other';
  status: FactStatus;
}

export interface OutingPlan {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  sourceImportIds: string[];
  destination: {
    name: string;
    status: FactStatus;
    alternatives?: string[];
  };
  dates: {
    startDate: string | null;
    endDate: string | null;
    durationDays: number;
    status: FactStatus;
  };
  budget: {
    estimatedTotal: number;
    estimatedPerPerson: number;
    currency: string;
    status: FactStatus;
    breakdown?: Record<string, number>;
  };
  transportation: {
    mode: string;
    status: FactStatus;
    details?: string;
  };
  itinerary: ItineraryItem[];
  activities: Array<{
    id: string;
    title: string;
    status: FactStatus;
  }>;
  pendingDecisions: Array<{
    id: string;
    topic: string;
    options: string[];
  }>;
  tasks: Array<{
    id: string;
    title: string;
    assigneeName?: string;
    status: 'pending' | 'in_progress' | 'completed';
  }>;
  status: 'draft' | 'planning' | 'confirmed' | 'completed' | 'cancelled';
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  userId: string;
  displayName: string;
  role: 'owner' | 'editor' | 'member' | 'viewer';
  joinedAt: string;
  email?: string;
}

export interface Workspace {
  id: string;
  title: string;
  description?: string;
  sourceType: 'manual' | 'chat_import';
  destination?: string;
  startDate?: string;
  endDate?: string;
  estimatedBudget?: number;
  currency: string;
  groupSize?: number;
  status: 'draft' | 'planning' | 'confirmed' | 'completed' | 'cancelled';
  ownerId: string;
  members: WorkspaceMember[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatImportRecord {
  id: string;
  workspaceId: string;
  fileName: string;
  fileType: string;
  status: 'uploaded' | 'parsing' | 'parsed' | 'extracting' | 'completed' | 'failed';
  messageCount: number;
  attachmentCount: number;
  ownerId: string;
  createdAt: string;
}

export interface NormalizedMessage {
  messageId: string;
  timestamp: string;
  senderLabel: string;
  messageType: string;
  text: string;
  attachments: any[];
  links: any[];
  sourceLine: number;
}

export interface UserProfile {
  userId: string;
  displayName: string;
  email?: string | null;
  phoneNumber?: string | null;
  photoURL?: string | null;
  preferredLanguage: string;
}

export interface VotePoll {
  id: string;
  workspaceId: string;
  title: string;
  category: string;
  options: Array<{
    id: string;
    text: string;
    votes: string[];
  }>;
  createdBy: string;
  closed: boolean;
  createdAt: string;
}

export interface TaskItem {
  id: string;
  workspaceId: string;
  title: string;
  description?: string;
  assignedTo?: string;
  assignedToName?: string;
  status: 'pending' | 'in_progress' | 'completed';
  dueDate?: string;
}

export interface ExpenseItem {
  id: string;
  workspaceId: string;
  title: string;
  amount: number;
  currency: string;
  category: string;
  paidByUserId: string;
  paidByName: string;
  splitUserIds: string[];
  createdAt: string;
}

export interface CommentItem {
  id: string;
  workspaceId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

export interface AssistantMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Array<{
    messageId: string;
    sender: string;
    text: string;
  }>;
  createdAt: string;
}
