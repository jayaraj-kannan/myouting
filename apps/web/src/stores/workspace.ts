import { defineStore } from 'pinia';
import { ref } from 'vue';
import { Workspace, ExtractedInsights, OutingPlan } from '../types';
import { api } from '../services/api';

export const useWorkspaceStore = defineStore('workspace', () => {
  const workspaces = ref<Workspace[]>([]);
  const activeWorkspace = ref<Workspace | null>(null);
  const currentInsights = ref<ExtractedInsights | null>(null);
  const currentPlan = ref<OutingPlan | null>(null);
  const featureFlags = ref<Record<string, boolean>>({
    chat_import_enabled: true,
    gemini_media_analysis_enabled: true,
    sarvam_stt_enabled: true,
    sarvam_tts_enabled: true,
    collaboration_enabled: true,
    voice_assistant_enabled: true,
  });
  const loading = ref<boolean>(false);
  const error = ref<string | null>(null);

  async function loadWorkspaces() {
    try {
      loading.value = true;
      const res = await api.listWorkspaces();
      workspaces.value = res.workspaces;
      if (!activeWorkspace.value && workspaces.value.length > 0) {
        await selectWorkspace(workspaces.value[0].id);
      }
    } catch (err: any) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  }

  async function selectWorkspace(id: string) {
    try {
      loading.value = true;
      const res = await api.getWorkspace(id);
      activeWorkspace.value = res.workspace;

      // Load insights & plans in parallel
      await Promise.all([loadInsights(id), loadPlans(id)]);
    } catch (err: any) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  }

  async function loadInsights(workspaceId: string) {
    try {
      const res = await api.getInsights(workspaceId);
      currentInsights.value = res.insights;
    } catch {
      currentInsights.value = null;
    }
  }

  async function loadPlans(workspaceId: string) {
    try {
      const res = await api.getPlans(workspaceId);
      if (res.plans && res.plans.length > 0) {
        currentPlan.value = res.plans[res.plans.length - 1];
      } else {
        currentPlan.value = null;
      }
    } catch {
      currentPlan.value = null;
    }
  }

  async function generatePlan(workspaceId: string) {
    try {
      loading.value = true;
      const res = await api.generatePlan(workspaceId);
      currentPlan.value = res.plan;
      if (activeWorkspace.value) {
        activeWorkspace.value.status = 'planning';
        if (res.plan.destination?.name) {
          activeWorkspace.value.destination = res.plan.destination.name;
        }
      }
      return res.plan;
    } finally {
      loading.value = false;
    }
  }

  async function loadFlags() {
    try {
      const res = await api.getFlags();
      if (res.flags) {
        featureFlags.value = res.flags;
      }
    } catch {}
  }

  return {
    workspaces,
    activeWorkspace,
    currentInsights,
    currentPlan,
    featureFlags,
    loading,
    error,
    loadWorkspaces,
    selectWorkspace,
    loadInsights,
    loadPlans,
    generatePlan,
    loadFlags,
  };
});
