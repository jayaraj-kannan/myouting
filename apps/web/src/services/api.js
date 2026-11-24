const BASE_URL = '/api/v1';
export class ApiClient {
    token = null;
    constructor() {
        this.token = localStorage.getItem('outingmate_token') || 'demo-token';
    }
    setToken(token) {
        this.token = token;
        localStorage.setItem('outingmate_token', token);
    }
    clearToken() {
        this.token = null;
        localStorage.removeItem('outingmate_token');
    }
    async request(endpoint, options = {}) {
        const headers = {
            ...options.headers,
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
            }
            catch { }
            throw new Error(errorMsg);
        }
        return res.json();
    }
    // Users
    getMe() {
        return this.request('/users/me');
    }
    updateProfile(data) {
        return this.request('/users/me', {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }
    deleteAccount() {
        return this.request('/users/me', { method: 'DELETE' });
    }
    // Workspaces
    listWorkspaces() {
        return this.request('/workspaces');
    }
    getWorkspace(id) {
        return this.request(`/workspaces/${id}`);
    }
    createWorkspace(data) {
        return this.request('/workspaces', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
    updateWorkspace(id, data) {
        return this.request(`/workspaces/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }
    deleteWorkspace(id) {
        return this.request(`/workspaces/${id}`, { method: 'DELETE' });
    }
    createInvite(workspaceId, role = 'member') {
        return this.request(`/workspaces/${workspaceId}/invitations`, {
            method: 'POST',
            body: JSON.stringify({ role }),
        });
    }
    acceptInvite(token) {
        return this.request(`/invitations/${token}/accept`, {
            method: 'POST',
        });
    }
    // Imports
    uploadChat(workspaceId, formData) {
        return this.request(`/workspaces/${workspaceId}/imports`, {
            method: 'POST',
            body: formData,
        });
    }
    getImportSummary(importId) {
        return this.request(`/imports/${importId}/summary`);
    }
    getImportMessages(importId) {
        return this.request(`/imports/${importId}/messages`);
    }
    deleteImport(importId) {
        return this.request(`/imports/${importId}`, { method: 'DELETE' });
    }
    // Insights
    getInsights(workspaceId) {
        return this.request(`/workspaces/${workspaceId}/insights`);
    }
    correctInsight(id, data) {
        return this.request(`/insights/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }
    // Plans
    generatePlan(workspaceId) {
        return this.request(`/workspaces/${workspaceId}/plans/generate`, {
            method: 'POST',
        });
    }
    getPlans(workspaceId) {
        return this.request(`/workspaces/${workspaceId}/plans`);
    }
    getPlan(planId) {
        return this.request(`/plans/${planId}`);
    }
    updatePlan(planId, data) {
        return this.request(`/plans/${planId}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }
    regenerateSection(planId, section, prompt) {
        return this.request(`/plans/${planId}/regenerate-section`, {
            method: 'POST',
            body: JSON.stringify({ section, prompt }),
        });
    }
    // Assistant
    askAssistant(workspaceId, message, sessionId) {
        return this.request(`/workspaces/${workspaceId}/assistant/messages`, {
            method: 'POST',
            body: JSON.stringify({ message, sessionId }),
        });
    }
    getAssistantHistory(sessionId) {
        return this.request(`/assistant/sessions/${sessionId}`);
    }
    transcribeSpeech(formData) {
        return this.request('/speech/transcribe', {
            method: 'POST',
            body: formData,
        });
    }
    synthesizeSpeech(text, languageCode = 'en-IN') {
        return this.request('/speech/synthesize', {
            method: 'POST',
            body: JSON.stringify({ text, languageCode }),
        });
    }
    // Collaboration
    getVotes(workspaceId) {
        return this.request(`/workspaces/${workspaceId}/votes`);
    }
    createVote(workspaceId, data) {
        return this.request(`/workspaces/${workspaceId}/votes`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
    submitVote(pollId, optionId) {
        return this.request(`/votes/${pollId}/responses`, {
            method: 'POST',
            body: JSON.stringify({ optionId }),
        });
    }
    getTasks(workspaceId) {
        return this.request(`/workspaces/${workspaceId}/tasks`);
    }
    createTask(workspaceId, data) {
        return this.request(`/workspaces/${workspaceId}/tasks`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
    updateTask(taskId, data) {
        return this.request(`/tasks/${taskId}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }
    getExpenses(workspaceId) {
        return this.request(`/workspaces/${workspaceId}/expenses`);
    }
    createExpense(workspaceId, data) {
        return this.request(`/workspaces/${workspaceId}/expenses`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
    getComments(workspaceId) {
        return this.request(`/workspaces/${workspaceId}/comments`);
    }
    addComment(workspaceId, text) {
        return this.request(`/workspaces/${workspaceId}/comments`, {
            method: 'POST',
            body: JSON.stringify({ text }),
        });
    }
    getFlags() {
        return this.request('/flags');
    }
}
export const api = new ApiClient();
