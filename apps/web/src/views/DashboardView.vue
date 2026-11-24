<template>
  <div class="space-y-8">
    <!-- Welcome Banner -->
    <div class="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
      <div class="max-w-2xl relative z-10">
        <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Hello, {{ authStore.user?.displayName || 'Organizer' }}! 👋
        </h1>
        <p class="mt-2 text-emerald-100 text-sm sm:text-base leading-relaxed">
          OutingMate analyzes your WhatsApp group conversations to extract destinations, budgets, dates, and member preferences, turning chaotic chats into a confirmed outing plan.
        </p>

        <div class="mt-6 flex flex-wrap gap-3">
          <router-link
            to="/outings/new?mode=import"
            class="inline-flex items-center space-x-2 bg-white text-emerald-800 font-semibold px-4 py-2.5 rounded-xl text-sm shadow hover:bg-emerald-50 transition"
          >
            <span>💬 Import WhatsApp Chat</span>
          </router-link>
          <router-link
            to="/outings/new"
            class="inline-flex items-center space-x-2 bg-emerald-800/60 hover:bg-emerald-800/80 text-white font-medium px-4 py-2.5 rounded-xl text-sm border border-emerald-400/30 transition"
          >
            <span>+ Create Plan Manually</span>
          </router-link>
        </div>
      </div>
      <!-- Background decorative circle -->
      <div class="absolute -right-10 -bottom-10 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none"></div>
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div class="text-xs font-semibold text-slate-500 uppercase">Active Outings</div>
        <div class="text-2xl font-bold text-slate-800 mt-1">{{ wsStore.workspaces.length }}</div>
      </div>
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div class="text-xs font-semibold text-slate-500 uppercase">AI Extractions</div>
        <div class="text-2xl font-bold text-emerald-600 mt-1">100%</div>
      </div>
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div class="text-xs font-semibold text-slate-500 uppercase">Voice Ready</div>
        <div class="text-2xl font-bold text-teal-600 mt-1">Sarvam STT</div>
      </div>
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div class="text-xs font-semibold text-slate-500 uppercase">Flagsmith A/B</div>
        <div class="text-2xl font-bold text-purple-600 mt-1">Active</div>
      </div>
    </div>

    <!-- Outings Section -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-bold text-slate-900">Your Outings & Workspaces</h2>
        <router-link to="/outings/new" class="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
          + Create Outing
        </router-link>
      </div>

      <div v-if="wsStore.loading" class="text-center py-12 text-slate-500 text-sm">
        Loading outings...
      </div>

      <div v-else-if="wsStore.workspaces.length === 0" class="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center space-y-3">
        <div class="text-3xl">🌴</div>
        <div class="font-semibold text-slate-700">No outings created yet</div>
        <p class="text-xs text-slate-500 max-w-sm mx-auto">
          Export a chat from WhatsApp and import it here, or start a new outing manually.
        </p>
        <router-link
          to="/outings/new?mode=import"
          class="inline-block mt-2 bg-emerald-600 text-white font-semibold text-xs px-4 py-2 rounded-lg hover:bg-emerald-700"
        >
          Import WhatsApp Chat
        </router-link>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div
          v-for="ws in wsStore.workspaces"
          :key="ws.id"
          class="bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition p-5 flex flex-col justify-between space-y-4"
        >
          <div>
            <div class="flex items-center justify-between">
              <span
                class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full"
                :class="{
                  'bg-amber-100 text-amber-800': ws.status === 'draft',
                  'bg-emerald-100 text-emerald-800': ws.status === 'planning',
                  'bg-blue-100 text-blue-800': ws.status === 'confirmed',
                }"
              >
                {{ ws.status }}
              </span>
              <span class="text-xs text-slate-400">
                {{ ws.sourceType === 'chat_import' ? '💬 WhatsApp' : '📝 Manual' }}
              </span>
            </div>

            <h3 class="text-base font-bold text-slate-900 mt-2 line-clamp-1">
              {{ ws.title }}
            </h3>
            <p class="text-xs text-slate-500 mt-1 line-clamp-2">
              {{ ws.description || 'No description provided.' }}
            </p>

            <div class="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-600">
              <div>
                <span class="text-slate-400 block text-[10px] uppercase">Destination</span>
                <span class="font-semibold">{{ ws.destination || 'TBD' }}</span>
              </div>
              <div>
                <span class="text-slate-400 block text-[10px] uppercase">Est. Budget</span>
                <span class="font-semibold">₹{{ (ws.estimatedBudget || 2500).toLocaleString('en-IN') }}/head</span>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between pt-2">
            <span class="text-xs text-slate-400 font-medium">
              👥 {{ ws.members.length }} members
            </span>
            <div class="space-x-2">
              <button
                @click="openWorkspace(ws.id)"
                class="bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition"
              >
                Open Workspace →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useWorkspaceStore } from '../stores/workspace';

const authStore = useAuthStore();
const wsStore = useWorkspaceStore();
const router = useRouter();

onMounted(async () => {
  await wsStore.loadWorkspaces();
});

async function openWorkspace(id: string) {
  await wsStore.selectWorkspace(id);
  router.push(`/outings/${id}/insights`);
}
</script>
