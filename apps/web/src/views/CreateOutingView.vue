<template>
  <div class="max-w-2xl mx-auto space-y-6">
    <div class="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
      <h1 class="text-xl font-bold text-slate-900 mb-1">Create New Outing</h1>
      <p class="text-xs text-slate-500 mb-6">
        Start a new trip with your group. You can import a WhatsApp export or create the outing manually.
      </p>

      <!-- Mode selection toggle -->
      <div class="grid grid-cols-2 gap-3 mb-6">
        <button
          type="button"
          @click="isImportMode = true"
          class="p-4 rounded-xl border text-left transition"
          :class="isImportMode ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20' : 'border-slate-200 hover:border-slate-300'"
        >
          <div class="text-2xl mb-1">💬</div>
          <div class="font-bold text-sm text-slate-900">From WhatsApp Export</div>
          <div class="text-xs text-slate-500 mt-0.5">AI extracts destination, budget, itinerary & decisions</div>
        </button>

        <button
          type="button"
          @click="isImportMode = false"
          class="p-4 rounded-xl border text-left transition"
          :class="!isImportMode ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20' : 'border-slate-200 hover:border-slate-300'"
        >
          <div class="text-2xl mb-1">📝</div>
          <div class="font-bold text-sm text-slate-900">Manual Planning</div>
          <div class="text-xs text-slate-500 mt-0.5">Fill in details and invite friends to collaborate</div>
        </button>
      </div>

      <form @submit.prevent="createOuting" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Outing Title *
          </label>
          <input
            v-model="form.title"
            required
            type="text"
            placeholder="e.g. Pondicherry French Quarter Road Trip"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Target Destination
          </label>
          <input
            v-model="form.destination"
            type="text"
            placeholder="e.g. Pondicherry"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Estimated Budget / Person (₹)
            </label>
            <input
              v-model="form.estimatedBudget"
              type="number"
              placeholder="2500"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Expected Group Size
            </label>
            <input
              v-model="form.groupSize"
              type="number"
              placeholder="5"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Short Description / Note
          </label>
          <textarea
            v-model="form.description"
            rows="2"
            placeholder="Weekend road trip with college friends to celebrate birthday"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          ></textarea>
        </div>

        <div class="pt-4 flex items-center justify-end space-x-3">
          <router-link to="/" class="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800">
            Cancel
          </router-link>
          <button
            type="submit"
            :disabled="loading"
            class="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2 rounded-xl text-sm transition shadow-sm disabled:opacity-50"
          >
            {{ isImportMode ? 'Next: Upload WhatsApp Chat →' : 'Create Outing Workspace' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { api } from '../services/api';
import { useWorkspaceStore } from '../stores/workspace';

const router = useRouter();
const route = useRoute();
const wsStore = useWorkspaceStore();

const isImportMode = ref<boolean>(true);
const loading = ref(false);

const form = ref({
  title: '',
  destination: '',
  estimatedBudget: 2500,
  groupSize: 5,
  description: '',
});

async function createOuting() {
  if (!form.value.title) return;
  try {
    loading.value = true;
    const res = await api.createWorkspace({
      ...form.value,
      sourceType: isImportMode.value ? 'chat_import' : 'manual',
    });

    await wsStore.loadWorkspaces();
    await wsStore.selectWorkspace(res.workspace.id);

    if (isImportMode.value) {
      router.push(`/outings/${res.workspace.id}/import`);
    } else {
      router.push(`/outings/${res.workspace.id}/plan`);
    }
  } catch (err: any) {
    alert(err.message || 'Error creating outing');
  } finally {
    loading.value = false;
  }
}
</script>
