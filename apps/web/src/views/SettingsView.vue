<template>
  <div class="max-w-2xl mx-auto space-y-6">
    <div class="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
      <h1 class="text-xl font-bold text-slate-900">Settings & Account Preferences</h1>

      <!-- Profile Section -->
      <div class="space-y-4 pb-6 border-b border-slate-100">
        <h2 class="text-xs font-bold text-slate-700 uppercase tracking-wider">User Profile</h2>
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Display Name</label>
          <input
            v-model="displayName"
            type="text"
            class="w-full text-sm rounded-xl border border-slate-300 p-2.5 outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Preferred Language</label>
          <select
            v-model="preferredLanguage"
            class="w-full text-sm rounded-xl border border-slate-300 p-2.5 outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="en-IN">English (India) - en-IN</option>
            <option value="hi-IN">Hindi - hi-IN</option>
            <option value="ta-IN">Tamil - ta-IN</option>
            <option value="te-IN">Telugu - te-IN</option>
            <option value="kn-IN">Kannada - kn-IN</option>
          </select>
        </div>

        <button
          @click="saveProfile"
          class="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2 rounded-xl transition shadow-sm"
        >
          Save Profile
        </button>
      </div>

      <!-- Feature Flags & Experiment Cohort (Flagsmith) -->
      <div class="space-y-3 pb-6 border-b border-slate-100">
        <div class="flex items-center justify-between">
          <h2 class="text-xs font-bold text-slate-700 uppercase tracking-wider">Flagsmith Feature Flags</h2>
          <span class="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">Active</span>
        </div>
        <div class="space-y-2 text-xs">
          <div
            v-for="(val, key) in wsStore.featureFlags"
            :key="key"
            class="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100"
          >
            <span class="font-mono text-slate-700">{{ key }}</span>
            <span :class="val ? 'text-emerald-700 font-bold' : 'text-slate-400'">
              {{ val ? 'Enabled ✓' : 'Disabled' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Privacy & Data Governance (Section 10) -->
      <div class="space-y-3 pb-6 border-b border-slate-100">
        <h2 class="text-xs font-bold text-slate-700 uppercase tracking-wider">Privacy & Data Governance</h2>
        <p class="text-xs text-slate-500 leading-relaxed">
          OutingMate processes conversation exports strictly for creating outing plans. Data is stored in secure workspace-isolated environments and can be deleted at any time.
        </p>
        <button
          @click="clearAllImports"
          class="text-xs font-semibold text-rose-600 border border-rose-200 hover:bg-rose-50 px-3 py-1.5 rounded-xl transition"
        >
          🗑️ Clear Imported Chats & Derived Data
        </button>
      </div>

      <!-- Account Actions -->
      <div class="pt-2 flex items-center justify-between">
        <button
          @click="logout"
          class="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl transition"
        >
          Sign Out
        </button>

        <button
          @click="deleteAccount"
          class="text-xs font-semibold text-rose-600 hover:underline"
        >
          Delete Account
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useWorkspaceStore } from '../stores/workspace';
import { api } from '../services/api';

const authStore = useAuthStore();
const wsStore = useWorkspaceStore();
const router = useRouter();

const displayName = ref(authStore.user?.displayName || '');
const preferredLanguage = ref(authStore.user?.preferredLanguage || 'en-IN');

async function saveProfile() {
  try {
    await api.updateProfile({
      displayName: displayName.value,
      preferredLanguage: preferredLanguage.value,
    });
    if (authStore.user) {
      authStore.user.displayName = displayName.value;
      authStore.user.preferredLanguage = preferredLanguage.value;
    }
    alert('Profile saved successfully!');
  } catch (err: any) {
    alert(err.message || 'Error saving profile');
  }
}

function clearAllImports() {
  if (confirm('Are you sure you want to delete all imported chats and reset insights?')) {
    wsStore.currentInsights = null;
    alert('Imported data and insights cleared.');
  }
}

function logout() {
  authStore.logout();
  router.push('/auth');
}

async function deleteAccount() {
  if (confirm('Permanently delete your account and personal data?')) {
    await api.deleteAccount();
    authStore.logout();
    router.push('/auth');
  }
}
</script>
