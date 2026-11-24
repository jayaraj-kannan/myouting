<template>
  <header class="bg-white border-b border-slate-200 sticky top-0 z-30">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <!-- Logo and App Title -->
        <div class="flex items-center space-x-3">
          <router-link to="/" class="flex items-center space-x-2">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm font-bold text-lg">
              OM
            </div>
            <span class="font-extrabold text-xl tracking-tight bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              OutingMate
            </span>
          </router-link>

          <!-- Workspace Selector Dropdown -->
          <div v-if="wsStore.activeWorkspace" class="hidden md:flex items-center ml-4 pl-4 border-l border-slate-200">
            <select
              :value="wsStore.activeWorkspace.id"
              @change="onWorkspaceChange"
              class="text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 px-3 rounded-lg border-0 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer max-w-xs truncate"
            >
              <option v-for="ws in wsStore.workspaces" :key="ws.id" :value="ws.id">
                📍 {{ ws.title }}
              </option>
            </select>
          </div>
        </div>

        <!-- Navigation Links for Active Workspace -->
        <nav v-if="wsStore.activeWorkspace" class="hidden lg:flex items-center space-x-1">
          <router-link
            :to="`/outings/${wsStore.activeWorkspace.id}/insights`"
            class="px-3 py-1.5 rounded-lg text-sm font-medium transition"
            :class="$route.path.includes('/insights') ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-100'"
          >
            Insights
          </router-link>
          <router-link
            :to="`/outings/${wsStore.activeWorkspace.id}/plan`"
            class="px-3 py-1.5 rounded-lg text-sm font-medium transition"
            :class="$route.path.includes('/plan') ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-100'"
          >
            Outing Plan
          </router-link>
          <router-link
            :to="`/outings/${wsStore.activeWorkspace.id}/assistant`"
            class="px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center space-x-1"
            :class="$route.path.includes('/assistant') ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-100'"
          >
            <span>AI Assistant</span>
            <span class="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">Voice</span>
          </router-link>
          <router-link
            :to="`/outings/${wsStore.activeWorkspace.id}/collaboration`"
            class="px-3 py-1.5 rounded-lg text-sm font-medium transition"
            :class="$route.path.includes('/collaboration') ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-100'"
          >
            Polls & Members
          </router-link>
          <router-link
            :to="`/outings/${wsStore.activeWorkspace.id}/import`"
            class="px-3 py-1.5 rounded-lg text-sm font-medium transition text-slate-600 hover:bg-slate-100"
          >
            Import Chat
          </router-link>
        </nav>

        <!-- Right Side: User & Actions -->
        <div class="flex items-center space-x-3">
          <router-link
            to="/outings/new"
            class="hidden sm:inline-flex items-center px-3.5 py-1.5 border border-transparent text-xs font-semibold rounded-lg shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition"
          >
            + New Outing
          </router-link>

          <router-link
            to="/settings"
            class="p-2 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
            title="Settings & Profile"
          >
            ⚙️
          </router-link>

          <div class="flex items-center space-x-2 pl-2 border-l border-slate-200">
            <div class="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
              {{ authStore.user?.displayName?.charAt(0) || 'U' }}
            </div>
            <span class="hidden sm:block text-xs font-medium text-slate-700 max-w-[100px] truncate">
              {{ authStore.user?.displayName }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Mobile Sub-navigation Bar -->
    <div v-if="wsStore.activeWorkspace" class="lg:hidden flex overflow-x-auto border-t border-slate-100 px-4 py-2 space-x-2 text-xs font-medium">
      <router-link :to="`/outings/${wsStore.activeWorkspace.id}/insights`" class="px-2.5 py-1 rounded-md whitespace-nowrap" :class="$route.path.includes('/insights') ? 'bg-emerald-100 text-emerald-800' : 'text-slate-600'">Insights</router-link>
      <router-link :to="`/outings/${wsStore.activeWorkspace.id}/plan`" class="px-2.5 py-1 rounded-md whitespace-nowrap" :class="$route.path.includes('/plan') ? 'bg-emerald-100 text-emerald-800' : 'text-slate-600'">Plan</router-link>
      <router-link :to="`/outings/${wsStore.activeWorkspace.id}/assistant`" class="px-2.5 py-1 rounded-md whitespace-nowrap" :class="$route.path.includes('/assistant') ? 'bg-emerald-100 text-emerald-800' : 'text-slate-600'">AI Assistant</router-link>
      <router-link :to="`/outings/${wsStore.activeWorkspace.id}/collaboration`" class="px-2.5 py-1 rounded-md whitespace-nowrap" :class="$route.path.includes('/collaboration') ? 'bg-emerald-100 text-emerald-800' : 'text-slate-600'">Polls</router-link>
      <router-link :to="`/outings/${wsStore.activeWorkspace.id}/import`" class="px-2.5 py-1 rounded-md whitespace-nowrap" :class="$route.path.includes('/import') ? 'bg-emerald-100 text-emerald-800' : 'text-slate-600'">Import</router-link>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useAuthStore } from '../stores/auth';
import { useWorkspaceStore } from '../stores/workspace';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const wsStore = useWorkspaceStore();
const router = useRouter();

function onWorkspaceChange(e: Event) {
  const target = e.target as HTMLSelectElement;
  wsStore.selectWorkspace(target.value);
  router.push(`/outings/${target.value}/insights`);
}
</script>
