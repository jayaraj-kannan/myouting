<template>
  <div class="space-y-6">
    <!-- Confirmation Banner if confirmed -->
    <div
      v-if="plan?.status === 'confirmed'"
      class="bg-emerald-600 text-white p-4 rounded-2xl flex items-center justify-between shadow-md"
    >
      <div class="flex items-center space-x-3">
        <span class="text-2xl">🎉</span>
        <div>
          <div class="font-bold text-sm">Outing Plan Confirmed by Group!</div>
          <div class="text-xs text-emerald-100">Everyone can view the confirmed timeline, tasks, and budget split.</div>
        </div>
      </div>
      <span class="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full uppercase">Confirmed</span>
    </div>

    <!-- Plan Header Overview -->
    <div class="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div class="flex items-center space-x-2">
          <span
            class="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
            :class="plan?.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'"
          >
            {{ plan?.status || 'draft' }}
          </span>
          <span class="text-xs text-slate-400">Generated from group intelligence</span>
        </div>
        <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
          {{ plan?.title || 'Weekend Outing Plan' }}
        </h1>
        <p class="text-xs text-slate-500 mt-1 max-w-xl">
          {{ plan?.description }}
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <button
          v-if="plan?.status !== 'confirmed'"
          @click="confirmPlan"
          class="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition shadow-sm"
        >
          ✓ Mark Plan Confirmed
        </button>

        <router-link
          :to="`/outings/${workspaceId}/assistant`"
          class="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-4 py-2.5 rounded-xl transition flex items-center space-x-1"
        >
          <span>🎙️ Ask AI Assistant</span>
        </router-link>
      </div>
    </div>

    <!-- Key Metrics Ribbon -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div class="bg-white p-4 rounded-2xl border border-slate-200">
        <span class="text-[10px] font-semibold text-slate-400 uppercase">Destination</span>
        <div class="text-lg font-bold text-slate-800 mt-0.5">📍 {{ plan?.destination.name || 'Pondicherry' }}</div>
      </div>
      <div class="bg-white p-4 rounded-2xl border border-slate-200">
        <span class="text-[10px] font-semibold text-slate-400 uppercase">Estimated Budget</span>
        <div class="text-lg font-bold text-emerald-600 mt-0.5">₹{{ (plan?.budget.estimatedPerPerson || 2500).toLocaleString('en-IN') }}/head</div>
      </div>
      <div class="bg-white p-4 rounded-2xl border border-slate-200">
        <span class="text-[10px] font-semibold text-slate-400 uppercase">Duration</span>
        <div class="text-lg font-bold text-slate-800 mt-0.5">🗓️ {{ plan?.dates.durationDays || 2 }} Days</div>
      </div>
      <div class="bg-white p-4 rounded-2xl border border-slate-200">
        <span class="text-[10px] font-semibold text-slate-400 uppercase">Transport Mode</span>
        <div class="text-lg font-bold text-slate-800 mt-0.5">🚗 {{ plan?.transportation.mode || 'Car' }}</div>
      </div>
    </div>

    <!-- Two-Column Layout: Itinerary & Side Cards -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Itinerary Timeline (2 cols) -->
      <div class="lg:col-span-2 space-y-4">
        <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 class="text-base font-bold text-slate-900 flex items-center space-x-2">
              <span>📅 Day-by-Day Itinerary</span>
            </h2>
            <button
              @click="regenerateItinerary"
              :disabled="regenerating"
              class="text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg transition"
            >
              {{ regenerating ? 'Regenerating...' : '✨ Regenerate with AI' }}
            </button>
          </div>

          <!-- Itinerary Items List -->
          <div class="space-y-4">
            <div
              v-for="item in plan?.itinerary"
              :key="item.id"
              class="relative pl-6 pb-4 border-l-2 border-emerald-500 last:border-l-0 last:pb-0"
            >
              <!-- Timeline bullet -->
              <div class="absolute -left-2 top-0 w-4 h-4 rounded-full bg-emerald-600 ring-4 ring-emerald-100"></div>

              <div class="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-2">
                    <span class="text-xs font-bold text-emerald-700">Day {{ item.dayNumber }} • {{ item.time }}</span>
                    <span class="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                      {{ item.activityType }}
                    </span>
                  </div>
                  <span v-if="item.estimatedCost" class="text-xs font-semibold text-slate-600">
                    ₹{{ item.estimatedCost }}
                  </span>
                </div>
                <div class="text-sm font-bold text-slate-900">{{ item.title }}</div>
                <div class="text-xs text-slate-600">{{ item.description }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Tasks, Budget Breakdown, Decisions -->
      <div class="space-y-5">
        <!-- Budget Breakdown -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider">💰 Cost Breakdown / Person</h3>
          <div class="space-y-2 text-xs">
            <div class="flex justify-between text-slate-600">
              <span>Travel & Fuel Split:</span>
              <span class="font-bold">₹{{ plan?.budget.breakdown?.travel || 750 }}</span>
            </div>
            <div class="flex justify-between text-slate-600">
              <span>Accommodation:</span>
              <span class="font-bold">₹{{ plan?.budget.breakdown?.stay || 650 }}</span>
            </div>
            <div class="flex justify-between text-slate-600">
              <span>Meals & Cafes:</span>
              <span class="font-bold">₹{{ plan?.budget.breakdown?.food || 850 }}</span>
            </div>
            <div class="flex justify-between text-slate-600">
              <span>Activities / Sightseeing:</span>
              <span class="font-bold">₹{{ plan?.budget.breakdown?.activities || 250 }}</span>
            </div>
            <div class="pt-2 border-t border-slate-100 flex justify-between font-extrabold text-slate-900 text-sm">
              <span>Total Estimated:</span>
              <span class="text-emerald-600">₹{{ (plan?.budget.estimatedPerPerson || 2500).toLocaleString('en-IN') }}</span>
            </div>
          </div>
        </div>

        <!-- Task Checklist -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
            <span>📋 Preparation Tasks</span>
            <span class="text-[10px] text-slate-400 font-normal">Check off when done</span>
          </h3>
          <ul class="space-y-2 text-xs">
            <li
              v-for="task in plan?.tasks"
              :key="task.id"
              class="flex items-start space-x-2.5 p-2 rounded-lg bg-slate-50 border border-slate-100"
            >
              <input
                type="checkbox"
                :checked="task.status === 'completed'"
                @change="toggleTask(task)"
                class="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <div class="flex-1">
                <span :class="task.status === 'completed' ? 'line-through text-slate-400' : 'font-medium text-slate-800'">
                  {{ task.title }}
                </span>
                <span v-if="task.assigneeName" class="block text-[10px] text-emerald-700 font-semibold mt-0.5">
                  Assigned: {{ task.assigneeName }}
                </span>
              </div>
            </li>
          </ul>
        </div>

        <!-- Pending Decisions -->
        <div v-if="plan?.pendingDecisions?.length" class="bg-amber-50 p-5 rounded-2xl border border-amber-200 space-y-3">
          <h3 class="text-xs font-bold text-amber-900 uppercase tracking-wider">⚖️ Decisions Needed</h3>
          <div class="space-y-2 text-xs">
            <div v-for="dec in plan.pendingDecisions" :key="dec.id" class="bg-white p-2.5 rounded-xl border border-amber-200">
              <div class="font-bold text-amber-900">{{ dec.topic }}</div>
              <div class="text-[11px] text-amber-800 mt-1">Options: {{ dec.options.join(', ') }}</div>
            </div>
            <router-link
              :to="`/outings/${workspaceId}/collaboration`"
              class="block text-center bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs py-2 rounded-xl transition mt-2"
            >
              Vote on Polls →
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useWorkspaceStore } from '../stores/workspace';
import { api } from '../services/api';

const route = useRoute();
const wsStore = useWorkspaceStore();

const workspaceId = route.params.id as string;
const regenerating = ref(false);

const plan = computed(() => wsStore.currentPlan);

onMounted(async () => {
  if (wsStore.activeWorkspace?.id !== workspaceId) {
    await wsStore.selectWorkspace(workspaceId);
  }
  if (!wsStore.currentPlan) {
    await wsStore.loadPlans(workspaceId);
  }
});

async function confirmPlan() {
  if (!plan.value) return;
  try {
    const res = await api.updatePlan(plan.value.id, { status: 'confirmed' });
    wsStore.currentPlan = res.plan;
    if (wsStore.activeWorkspace) {
      wsStore.activeWorkspace.status = 'confirmed';
    }
  } catch (err: any) {
    alert(err.message || 'Error confirming plan');
  }
}

async function regenerateItinerary() {
  if (!plan.value) return;
  try {
    regenerating.value = true;
    const res = await api.regenerateSection(plan.value.id, 'itinerary', 'Include scenic breakfast and artisan pottery stop');
    if (res.plan) {
      wsStore.currentPlan = res.plan;
    }
  } catch (err: any) {
    alert(err.message || 'Error regenerating itinerary');
  } finally {
    regenerating.value = false;
  }
}

function toggleTask(task: any) {
  task.status = task.status === 'completed' ? 'pending' : 'completed';
}
</script>
