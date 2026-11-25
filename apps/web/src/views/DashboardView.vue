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

    <!-- Outing Overview Stats (User-centric & minimal) -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
        <div>
          <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">In Planning</div>
          <div class="text-2xl font-bold text-slate-800 mt-1">{{ inPlanningCount }}</div>
          <div class="text-xs text-slate-400 mt-0.5">
            {{ inPlanningCount === 1 ? '1 trip being coordinated' : `${inPlanningCount} trips being coordinated` }}
          </div>
        </div>
        <div class="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl">
          🗺️
        </div>
      </div>

      <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
        <div>
          <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Confirmed Trips</div>
          <div class="text-2xl font-bold text-emerald-600 mt-1">{{ confirmedCount }}</div>
          <div class="text-xs text-slate-400 mt-0.5">
            {{ confirmedCount === 1 ? '1 itinerary finalized' : `${confirmedCount} itineraries finalized` }}
          </div>
        </div>
        <div class="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl">
          🏖️
        </div>
      </div>

      <div
        @click="showPeopleModal = true"
        class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between cursor-pointer hover:border-teal-300 hover:shadow-md transition group"
      >
        <div>
          <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
            <span>People</span>
            <span class="text-[10px] text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded font-normal group-hover:underline">View mapped →</span>
          </div>
          <div class="text-2xl font-bold text-teal-600 mt-1">{{ totalMembers }}</div>
          <div class="text-xs text-slate-400 mt-0.5">
            {{ totalMembers === 1 ? '1 person mapped' : `${totalMembers} people mapped across outings` }}
          </div>
        </div>
        <div class="w-11 h-11 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center text-xl group-hover:scale-105 transition">
          👥
        </div>
      </div>
    </div>

    <!-- Outings Section -->
    <div class="space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex items-center space-x-3">
          <h2 class="text-lg font-bold text-slate-900">Your Outings & Workspaces</h2>
          <div v-if="wsStore.workspaces.length > 0" class="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-medium">
            <button
              @click="activeFilter = 'all'"
              class="px-2.5 py-1 rounded-lg transition"
              :class="activeFilter === 'all' ? 'bg-white text-slate-800 shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-800'"
            >
              All ({{ wsStore.workspaces.length }})
            </button>
            <button
              @click="activeFilter = 'planning'"
              class="px-2.5 py-1 rounded-lg transition"
              :class="activeFilter === 'planning' ? 'bg-white text-slate-800 shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-800'"
            >
              Planning ({{ inPlanningCount }})
            </button>
            <button
              @click="activeFilter = 'confirmed'"
              class="px-2.5 py-1 rounded-lg transition"
              :class="activeFilter === 'confirmed' ? 'bg-white text-slate-800 shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-800'"
            >
              Confirmed ({{ confirmedCount }})
            </button>
          </div>
        </div>

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
          class="inline-block mt-2 bg-emerald-600 text-white font-semibold text-xs px-4 py-2 rounded-lg hover:bg-emerald-700 transition"
        >
          Import WhatsApp Chat
        </router-link>
      </div>

      <div v-else-if="filteredWorkspaces.length === 0" class="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-xs">
        No outings match the selected filter.
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div
          v-for="ws in filteredWorkspaces"
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

            <!-- People mapped to this Outing / Event -->
            <div class="mt-4 pt-3 border-t border-slate-100 space-y-2">
              <div class="flex items-center justify-between text-xs">
                <span class="font-semibold text-slate-700 flex items-center space-x-1.5">
                  <span>👥</span>
                  <span>People</span>
                  <span class="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {{ ws.members?.length || ws.groupSize || 1 }}
                  </span>
                </span>
                <span class="text-[10px] text-slate-400">Mapped to this event</span>
              </div>

              <!-- People pills / chips -->
              <div class="flex items-center flex-wrap gap-1.5 min-h-[28px]">
                <div
                  v-for="member in (ws.members || []).slice(0, 3)"
                  :key="member.userId"
                  class="inline-flex items-center space-x-1 bg-slate-50 border border-slate-200/60 px-2 py-0.5 rounded-full text-[11px] text-slate-700"
                >
                  <span class="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px] font-bold">
                    {{ (member.displayName || 'U').charAt(0).toUpperCase() }}
                  </span>
                  <span class="truncate max-w-[85px] font-medium">{{ member.displayName }}</span>
                  <span v-if="member.role === 'owner'" class="text-[9px] font-bold text-purple-600 bg-purple-50 px-1 rounded">Host</span>
                </div>

                <span
                  v-if="(ws.members?.length || 0) > 3"
                  class="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full"
                >
                  +{{ (ws.members?.length || 0) - 3 }} more
                </span>

                <span
                  v-if="!ws.members || ws.members.length === 0"
                  class="text-xs text-slate-400 italic"
                >
                  {{ ws.groupSize ? `${ws.groupSize} people expected` : '1 person (Organizer)' }}
                </span>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between pt-3 border-t border-slate-100">
            <router-link
              :to="`/outings/${ws.id}/collaboration`"
              class="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center space-x-1"
            >
              <span>+ Manage People</span>
            </router-link>

            <button
              @click="openWorkspace(ws.id)"
              class="bg-slate-900 hover:bg-emerald-600 text-white text-xs font-semibold px-3.5 py-1.5 rounded-xl transition shadow-xs"
            >
              Open Outing →
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- People Mapping Modal -->
    <div
      v-if="showPeopleModal"
      class="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
      @click.self="showPeopleModal = false"
    >
      <div class="bg-white w-full max-w-xl rounded-3xl p-6 shadow-xl border border-slate-200 space-y-5 animate-in fade-in duration-150">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 class="text-base font-bold text-slate-900 flex items-center space-x-2">
              <span>👥 People Mapped to Outings & Events</span>
            </h2>
            <p class="text-xs text-slate-500 mt-0.5">Overview of participants mapped to each specific outing</p>
          </div>
          <button
            @click="showPeopleModal = false"
            class="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 rounded-lg"
          >
            ✕
          </button>
        </div>

        <div v-if="wsStore.workspaces.length === 0" class="text-center py-8 text-xs text-slate-500">
          No outings or people mapped yet.
        </div>

        <div v-else class="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <div
            v-for="ws in wsStore.workspaces"
            :key="ws.id"
            class="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3"
          >
            <div class="flex items-center justify-between">
              <div>
                <span class="font-bold text-sm text-slate-900">{{ ws.title }}</span>
                <span v-if="ws.destination" class="ml-2 text-xs text-slate-500">📍 {{ ws.destination }}</span>
              </div>
              <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                :class="{
                  'bg-amber-100 text-amber-800': ws.status === 'draft',
                  'bg-emerald-100 text-emerald-800': ws.status === 'planning',
                  'bg-blue-100 text-blue-800': ws.status === 'confirmed',
                }"
              >
                {{ ws.status }}
              </span>
            </div>

            <!-- List of people mapped to this outing -->
            <div class="space-y-1.5">
              <div class="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                People ({{ ws.members?.length || ws.groupSize || 1 }})
              </div>
              <div class="flex flex-wrap gap-2">
                <div
                  v-for="member in (ws.members || [])"
                  :key="member.userId"
                  class="inline-flex items-center space-x-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-xl text-xs shadow-2xs"
                >
                  <span class="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                    {{ (member.displayName || 'U').charAt(0).toUpperCase() }}
                  </span>
                  <span class="font-medium text-slate-800">{{ member.displayName }}</span>
                  <span
                    class="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase"
                    :class="member.role === 'owner' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'"
                  >
                    {{ member.role }}
                  </span>
                </div>

                <div
                  v-if="!ws.members || ws.members.length === 0"
                  class="text-xs text-slate-400 italic"
                >
                  {{ ws.groupSize ? `${ws.groupSize} people expected` : '1 person (Organizer)' }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="pt-2 border-t border-slate-100 flex items-center justify-between">
          <span class="text-xs text-slate-500 font-medium">Total: {{ totalMembers }} unique people across all events</span>
          <button
            @click="showPeopleModal = false"
            class="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-4 py-2 rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useWorkspaceStore } from '../stores/workspace';

const authStore = useAuthStore();
const wsStore = useWorkspaceStore();
const router = useRouter();

const activeFilter = ref<'all' | 'planning' | 'confirmed'>('all');
const showPeopleModal = ref(false);

const inPlanningCount = computed(() =>
  wsStore.workspaces.filter(w => w.status === 'planning' || w.status === 'draft').length
);

const confirmedCount = computed(() =>
  wsStore.workspaces.filter(w => w.status === 'confirmed').length
);

const totalMembers = computed(() => {
  const uniquePeople = new Set<string>();
  wsStore.workspaces.forEach(w => {
    if (w.members && w.members.length > 0) {
      w.members.forEach(m => uniquePeople.add(m.displayName.toLowerCase().trim()));
    } else if (w.groupSize) {
      for (let i = 0; i < w.groupSize; i++) {
        uniquePeople.add(`${w.id}_person_${i}`);
      }
    }
  });
  return uniquePeople.size || (wsStore.workspaces.length ? wsStore.workspaces.length : 0);
});

const filteredWorkspaces = computed(() => {
  if (activeFilter.value === 'planning') {
    return wsStore.workspaces.filter(w => w.status === 'planning' || w.status === 'draft');
  }
  if (activeFilter.value === 'confirmed') {
    return wsStore.workspaces.filter(w => w.status === 'confirmed');
  }
  return wsStore.workspaces;
});

onMounted(async () => {
  await wsStore.loadWorkspaces();
});

async function openWorkspace(id: string) {
  await wsStore.selectWorkspace(id);
  router.push(`/outings/${id}/insights`);
}
</script>
