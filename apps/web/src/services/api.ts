const BASE_URL = '/api/v1';

export class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('outingmate_token') || 'demo-token';
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('outingmate_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('outingmate_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let errorMsg = `HTTP Error ${res.status}`;
      try {
        const errJson = await res.json();
        if (errJson.error?.message) {
          errorMsg = errJson.error.message;
        }
      } catch {}
      throw new Error(errorMsg);
    }

    return res.json() as Promise<T>;
  }

  // Users
  getMe() {
    return this.request<{ user: any }>('/users/me');
  }

  updateProfile(data: { displayName?: string; preferredLanguage?: string }) {
    return this.request<{ user: any }>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  deleteAccount() {
    return this.request<{ success: boolean }>('/users/me', { method: 'DELETE' });
  }

  // Workspaces
  listWorkspaces() {
    return this.request<{ workspaces: any[] }>('/workspaces');
  }

  getWorkspace(id: string) {
    return this.request<{ workspace: any }>(`/workspaces/${id}`);
  }

  createWorkspace(data: any) {
    return this.request<{ workspace: any }>('/workspaces', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateWorkspace(id: string, data: any) {
    return this.request<{ workspace: any }>(`/workspaces/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  deleteWorkspace(id: string) {
    return this.request<{ success: boolean }>(`/workspaces/${id}`, { method: 'DELETE' });
  }

  createInvite(workspaceId: string, role = 'member') {
    return this.request<{ invitation: any; inviteUrl: string }>(`/workspaces/${workspaceId}/invitations`, {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
  }

  acceptInvite(token: string) {
    return this.request<{ success: boolean; workspace: any }>(`/invitations/${token}/accept`, {
      method: 'POST',
    });
  }

  // Imports
  uploadChat(workspaceId: string, formData: FormData) {
    return this.request<{ import: any; messageCount: number; summary: any }>(`/workspaces/${workspaceId}/imports`, {
      method: 'POST',
      body: formData,
    });
  }

  getImportSummary(importId: string) {
    return this.request<{ summary: any }>(`/imports/${importId}/summary`);
  }

  getImportMessages(importId: string) {
    return this.request<{ messages: any[] }>(`/imports/${importId}/messages`);
  }

  deleteImport(importId: string) {
    return this.request<{ success: boolean }>(`/imports/${importId}`, { method: 'DELETE' });
  }

  // Insights
  getInsights(workspaceId: string) {
    return this.request<{ insights: any }>(`/workspaces/${workspaceId}/insights`);
  }

  correctInsight(id: string, data: any) {
    return this.request<{ success: boolean; insights: any }>(`/insights/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Plans
  generatePlan(workspaceId: string) {
    return this.request<{ plan: any }>(`/workspaces/${workspaceId}/plans/generate`, {
      method: 'POST',
    });
  }

  getPlans(workspaceId: string) {
    return this.request<{ plans: any[] }>(`/workspaces/${workspaceId}/plans`);
  }

  getPlan(planId: string) {
    return this.request<{ plan: any }>(`/plans/${planId}`);
  }

  updatePlan(planId: string, data: any) {
    return this.request<{ plan: any }>(`/plans/${planId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  regenerateSection(planId: string, section: string, prompt?: string) {
    return this.request<{ success: boolean; plan: any; sectionData: any }>(`/plans/${planId}/regenerate-section`, {
      method: 'POST',
      body: JSON.stringify({ section, prompt }),
    });
  }

  // Assistant
  askAssistant(workspaceId: string, message: string, sessionId?: string) {
    return this.request<{ message: any; sessionId: string }>(`/workspaces/${workspaceId}/assistant/messages`, {
      method: 'POST',
      body: JSON.stringify({ message, sessionId }),
    });
  }

  getAssistantHistory(sessionId: string) {
    return this.request<{ messages: any[] }>(`/assistant/sessions/${sessionId}`);
  }

  transcribeSpeech(formData: FormData) {
    return this.request<{ transcript: string; languageCode: string; confidence?: number }>('/speech/transcribe', {
      method: 'POST',
      body: formData,
    });
  }

  synthesizeSpeech(text: string, languageCode = 'en-IN') {
    return this.request<{ audioBase64: string; format: string }>('/speech/synthesize', {
      method: 'POST',
      body: JSON.stringify({ text, languageCode }),
    });
  }

  // Collaboration
  getVotes(workspaceId: string) {
    return this.request<{ votes: any[] }>(`/workspaces/${workspaceId}/votes`);
  }

  createVote(workspaceId: string, data: any) {
    return this.request<{ poll: any }>(`/workspaces/${workspaceId}/votes`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  submitVote(pollId: string, optionId: string) {
    return this.request<{ success: boolean; poll: any }>(`/votes/${pollId}/responses`, {
      method: 'POST',
      body: JSON.stringify({ optionId }),
    });
  }

  getTasks(workspaceId: string) {
    return this.request<{ tasks: any[] }>(`/workspaces/${workspaceId}/tasks`);
  }

  createTask(workspaceId: string, data: any) {
    return this.request<{ task: any }>(`/workspaces/${workspaceId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateTask(taskId: string, data: any) {
    return this.request<{ task: any }>(`/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  getExpenses(workspaceId: string) {
    return this.request<{ expenses: any[] }>(`/workspaces/${workspaceId}/expenses`);
  }

  createExpense(workspaceId: string, data: any) {
    return this.request<{ expense: any }>(`/workspaces/${workspaceId}/expenses`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  getComments(workspaceId: string) {
    return this.request<{ comments: any[] }>(`/workspaces/${workspaceId}/comments`);
  }

  addComment(workspaceId: string, text: string) {
    return this.request<{ comment: any }>(`/workspaces/${workspaceId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  getFlags() {
    return this.request<{ flags: Record<string, boolean> }>('/flags');
  }
}

export const api = new ApiClient();
