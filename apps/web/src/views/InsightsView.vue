<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
      <div>
        <div class="flex items-center space-x-2">
          <span class="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
            AI Extracted Insights
          </span>
          <span class="text-xs text-slate-400">• Traceable to source chat</span>
        </div>
        <h1 class="text-xl sm:text-2xl font-extrabold text-slate-900 mt-2">
          {{ wsStore.activeWorkspace?.destination || 'Outing' }} Group Intelligence
        </h1>
        <p class="text-xs text-slate-500 mt-1">
          {{ wsStore.currentInsights?.summary || 'Analyzing group conversation facts and preferences...' }}
        </p>
      </div>

      <div class="flex items-center space-x-3">
        <button
          @click="showChatModal = true"
          class="border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2.5 rounded-xl text-xs transition"
        >
          📜 Inspect Raw Messages
        </button>

        <button
          @click="generatePlan"
          :disabled="generating"
          class="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-xl text-xs transition shadow-sm flex items-center space-x-2"
        >
          <span>{{ generating ? 'Generating...' : '⚡ Generate Outing Plan →' }}</span>
        </button>
      </div>
    </div>

    <!-- Main Fact Cards Grid -->
    <div v-if="insights" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      <!-- Destination Fact -->
      <div class="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-500 uppercase">Target Destination</span>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
            {{ insights.destination?.status || 'proposed' }}
          </span>
        </div>

        <div class="text-xl font-extrabold text-slate-900">
          📍 {{ insights.destination?.value || 'Pondicherry' }}
        </div>

        <div v-if="insights.destination?.evidenceMessageIds?.length" class="text-[11px] text-slate-500 flex items-center space-x-1">
          <span>Source:</span>
          <span
            v-for="id in insights.destination.evidenceMessageIds"
            :key="id"
            class="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-bold cursor-pointer hover:bg-slate-200"
            @click="showChatModal = true"
          >
            {{ id }}
          </span>
        </div>

        <div v-if="insights.alternativeDestinations?.value?.length" class="text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span class="font-medium text-slate-600">Alternatives discussed:</span>
          {{ insights.alternativeDestinations.value.join(', ') }}
        </div>
      </div>

      <!-- Budget Fact -->
      <div class="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-500 uppercase">Proposed Budget</span>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
            {{ insights.budget?.status || 'proposed' }}
          </span>
        </div>

        <div class="text-xl font-extrabold text-slate-900">
          ₹{{ (insights.budget?.value.amount || 2500).toLocaleString('en-IN') }}
          <span class="text-xs font-normal text-slate-500">/ person</span>
        </div>

        <div class="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1">
          <div>Travel: ₹{{ insights.budget?.value.breakdown?.travel || 750 }}</div>
          <div>Food: ₹{{ insights.budget?.value.breakdown?.food || 850 }}</div>
          <div>Stay: ₹{{ insights.budget?.value.breakdown?.stay || 650 }}</div>
          <div>Misc: ₹{{ insights.budget?.value.breakdown?.activities || 250 }}</div>
        </div>

        <div v-if="insights.budget?.evidenceMessageIds?.length" class="text-[11px] text-slate-500 flex items-center space-x-1 pt-2 border-t border-slate-100">
          <span>Source:</span>
          <span
            v-for="id in insights.budget.evidenceMessageIds"
            :key="id"
            class="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-bold cursor-pointer hover:bg-slate-200"
            @click="showChatModal = true"
          >
            {{ id }}
          </span>
        </div>
      </div>

      <!-- Dates & Duration -->
      <div class="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-500 uppercase">Dates & Timing</span>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
            {{ insights.date?.status || 'proposed' }}
          </span>
        </div>

        <div class="text-xl font-extrabold text-slate-900">
          🗓️ {{ insights.date?.value.durationDays || 2 }} Days
          <span class="text-xs font-medium text-slate-500 block mt-0.5">
            {{ insights.date?.value.startDate || 'Dec 5' }} – {{ insights.date?.value.endDate || 'Dec 6, 2026' }}
          </span>
        </div>

        <div class="text-xs text-slate-600">
          Departure: <span class="font-semibold text-slate-800">Saturday 5:30 AM (Road trip)</span>
        </div>

        <div v-if="insights.date?.evidenceMessageIds?.length" class="text-[11px] text-slate-500 flex items-center space-x-1 pt-2 border-t border-slate-100">
          <span>Source:</span>
          <span
            v-for="id in insights.date.evidenceMessageIds"
            :key="id"
            class="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-bold cursor-pointer hover:bg-slate-200"
            @click="showChatModal = true"
          >
            {{ id }}
          </span>
        </div>
      </div>
    </div>

    <!-- Additional Insights Grid: Activities, Conflicts, and Tasks -->
    <div v-if="insights" class="grid grid-cols-1 md:grid-cols-3 gap-5">
      <!-- Activities -->
      <div class="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <div class="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
          <span>🏄 Suggested Activities</span>
          <span class="text-xs text-slate-400">{{ (insights.activities?.value || []).length }}</span>
        </div>
        <ul class="space-y-2 text-xs text-slate-700">
          <li v-for="(act, i) in (insights.activities?.value || [])" :key="i" class="flex items-start space-x-2">
            <span class="text-emerald-500 font-bold">•</span>
            <div>
              <span class="font-semibold text-slate-800">{{ act.name }}</span>
              <span v-if="act.suggestedBy" class="text-slate-400 text-[10px] block">Suggested by {{ act.suggestedBy }}</span>
            </div>
          </li>
        </ul>
      </div>

      <!-- Conflicts & Pending Questions -->
      <div class="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <div class="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
          <span>⚖️ Pending Decisions / Polls</span>
          <span class="text-xs text-amber-600 font-bold">{{ (insights.conflicts || []).length + (insights.openQuestions || []).length }}</span>
        </div>
        <div class="space-y-2.5 text-xs">
          <div
            v-for="(c, i) in (insights.conflicts || [])"
            :key="i"
            class="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-amber-900"
          >
            <div class="font-bold text-[11px]">{{ c.topic }}</div>
            <div class="text-[10px] text-amber-800 mt-1">Options: {{ c.competingOptions.join(' vs ') }}</div>
          </div>
          <div
            v-for="(q, i) in (insights.openQuestions || [])"
            :key="'q_' + i"
            class="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-700"
          >
            <div class="font-medium text-[11px]">{{ q.question }}</div>
          </div>
        </div>
      </div>

      <!-- Tasks Checklist -->
      <div class="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <div class="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
          <span>✅ Action Items Extracted</span>
          <span class="text-xs text-slate-400">{{ (insights.tasks || []).length }}</span>
        </div>
        <ul class="space-y-2 text-xs">
          <li
            v-for="(t, i) in (insights.tasks || [])"
            :key="i"
            class="flex items-start space-x-2 bg-slate-50 p-2 rounded-lg border border-slate-100"
          >
            <input type="checkbox" class="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500" />
            <div class="flex-1">
              <span class="font-medium text-slate-800">{{ t.description }}</span>
              <span v-if="t.assignedTo" class="block text-[10px] text-emerald-700 font-semibold mt-0.5">
                Assigned: {{ t.assignedTo }}
              </span>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <!-- Source Messages Inspect Modal -->
    <div v-if="showChatModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div class="bg-white rounded-3xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl border border-slate-200">
        <div class="p-5 border-b border-slate-200 flex items-center justify-between">
          <h3 class="font-bold text-slate-900 text-sm">Source WhatsApp Messages Traceability</h3>
          <button @click="showChatModal = false" class="text-slate-400 hover:text-slate-600 text-lg">✕</button>
        </div>
        <div class="p-5 overflow-y-auto space-y-3 flex-1 font-mono text-xs">
          <div v-if="chatMessages.length === 0" class="text-center py-8 text-slate-400">
            No messages found for this workspace.
          </div>
          <div
            v-for="msg in chatMessages"
            :key="msg.messageId"
            class="p-2.5 rounded-xl border border-slate-100 bg-slate-50/70"
          >
            <div class="flex items-center justify-between text-[10px] text-slate-400 mb-1">
              <span class="font-bold text-emerald-700 font-sans">{{ msg.senderLabel }}</span>
              <span class="bg-white px-1.5 py-0.5 rounded border border-slate-200">{{ msg.messageId }}</span>
            </div>
            <div class="text-slate-800 font-sans text-xs whitespace-pre-wrap">{{ msg.text }}</div>
          </div>
        </div>
        <div class="p-4 border-t border-slate-200 text-right">
          <button @click="showChatModal = false" class="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-4 py-2 rounded-xl">
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useWorkspaceStore } from '../stores/workspace';

const route = useRoute();
const router = useRouter();
const wsStore = useWorkspaceStore();

const workspaceId = route.params.id as string;
const generating = ref(false);
const showChatModal = ref(false);

const insights = computed(() => wsStore.currentInsights);

import { api } from '../services/api';
import { NormalizedMessage } from '../types';

const chatMessages = ref<NormalizedMessage[]>([]);

onMounted(async () => {
  if (wsStore.activeWorkspace?.id !== workspaceId) {
    await wsStore.selectWorkspace(workspaceId);
  }
  try {
    const res = await api.getWorkspaceMessages(workspaceId);
    chatMessages.value = res.messages || [];
  } catch (err) {
    console.error('Failed to load messages', err);
  }
});

async function generatePlan() {
  try {
    generating.value = true;
    await wsStore.generatePlan(workspaceId);
    router.push(`/outings/${workspaceId}/plan`);
  } catch (err: any) {
    alert(err.message || 'Error generating plan');
  } finally {
    generating.value = false;
  }
}
</script>
