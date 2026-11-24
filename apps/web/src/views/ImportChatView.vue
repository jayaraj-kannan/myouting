<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <div class="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h1 class="text-xl font-bold text-slate-900">Import WhatsApp Conversation</h1>
          <p class="text-xs text-slate-500 mt-0.5">
            Upload your exported chat (.txt or .zip) to extract plans, dates, budgets, and tasks.
          </p>
        </div>
        <span class="text-3xl">📥</span>
      </div>

      <!-- How to Export Guide (Accordion) -->
      <div class="mb-6 bg-slate-50 border border-slate-200 rounded-2xl p-4">
        <button
          @click="showInstructions = !showInstructions"
          class="flex items-center justify-between w-full text-xs font-bold text-slate-700 uppercase tracking-wider text-left"
        >
          <span>📱 How to export WhatsApp chat on Android & iOS</span>
          <span>{{ showInstructions ? '▲ Hide' : '▼ View Instructions' }}</span>
        </button>

        <div v-if="showInstructions" class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600 border-t border-slate-200 pt-3">
          <div>
            <div class="font-bold text-slate-800 mb-1">Android:</div>
            <ol class="list-decimal list-inside space-y-1">
              <li>Open group chat in WhatsApp</li>
              <li>Tap three dots (⋮) > <b>More</b></li>
              <li>Tap <b>Export chat</b></li>
              <li>Select <b>Without media</b> (or with media)</li>
              <li>Save or share the generated <code>.txt</code> or <code>.zip</code> file</li>
            </ol>
          </div>
          <div>
            <div class="font-bold text-slate-800 mb-1">iPhone (iOS):</div>
            <ol class="list-decimal list-inside space-y-1">
              <li>Open group chat in WhatsApp</li>
              <li>Tap the group name at the top</li>
              <li>Scroll down and tap <b>Export Chat</b></li>
              <li>Choose <b>Attach Media</b> or <b>Without Media</b></li>
              <li>Save to Files and upload here</li>
            </ol>
          </div>
        </div>
      </div>

      <!-- Quick Sample Chat Button -->
      <div class="mb-6 flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5">
        <div>
          <div class="text-xs font-bold text-emerald-900">Need a quick test?</div>
          <div class="text-[11px] text-emerald-700">Load a pre-configured sample Pondicherry weekend group discussion.</div>
        </div>
        <button
          type="button"
          @click="loadSampleChat"
          class="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition shadow-sm"
        >
          ✨ Load Sample Chat
        </button>
      </div>

      <!-- File Dropzone -->
      <div
        class="border-2 border-dashed rounded-2xl p-6 text-center transition cursor-pointer"
        :class="selectedFile ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-300 hover:border-emerald-400 bg-slate-50/50'"
        @click="triggerFileInput"
      >
        <input
          ref="fileInputRef"
          type="file"
          accept=".txt,.zip"
          class="hidden"
          @change="onFileSelected"
        />

        <div class="text-3xl mb-2">{{ selectedFile ? '📄' : '📁' }}</div>

        <div v-if="selectedFile">
          <div class="text-sm font-bold text-slate-800">{{ selectedFile.name }}</div>
          <div class="text-xs text-slate-500 mt-1">{{ (selectedFile.size / 1024).toFixed(1) }} KB</div>
          <button
            type="button"
            @click.stop="selectedFile = null"
            class="text-xs text-rose-600 font-semibold mt-2 hover:underline"
          >
            Remove file
          </button>
        </div>

        <div v-else>
          <div class="text-sm font-semibold text-slate-700">Click to upload or drag & drop</div>
          <div class="text-xs text-slate-400 mt-1">Accepts WhatsApp .txt exports or .zip with media (up to 100MB)</div>
        </div>
      </div>

      <!-- Or Paste Chat Text Direct -->
      <div class="mt-4">
        <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
          Or Paste Chat Text Directly
        </label>
        <textarea
          v-model="pastedText"
          rows="6"
          placeholder="24/11/2026, 14:30 - Priya: Hey guys, let's plan a Pondicherry weekend trip!&#10;24/11/2026, 14:31 - Rahul: Awesome, budget should be around Rs 2500 per person."
          class="w-full font-mono text-xs rounded-xl border border-slate-300 p-3 focus:ring-2 focus:ring-emerald-500 outline-none"
        ></textarea>
      </div>

      <!-- Mandatory Consent Checkbox -->
      <div class="mt-6 pt-4 border-t border-slate-100 flex items-start space-x-3">
        <input
          id="consentCheckbox"
          v-model="consentConfirmed"
          type="checkbox"
          class="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
        />
        <label for="consentCheckbox" class="text-xs text-slate-600 leading-normal cursor-pointer select-none">
          I confirm that I have the right and appropriate consent of the group participants to import and process this conversation. I understand data is used solely to generate outing plans for this group.
        </label>
      </div>

      <!-- Submit & Processing Status -->
      <div class="mt-6 flex items-center justify-between">
        <div v-if="processing" class="flex items-center space-x-2 text-xs text-emerald-700 font-medium">
          <div class="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <span>{{ processingStatus }}</span>
        </div>
        <div v-else></div>

        <button
          @click="submitImport"
          :disabled="processing || !consentConfirmed || (!selectedFile && !pastedText.trim())"
          class="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition shadow-sm disabled:opacity-50"
        >
          {{ processing ? 'Processing...' : 'Analyze & Extract Insights →' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../services/api';
import { useWorkspaceStore } from '../stores/workspace';

const route = useRoute();
const router = useRouter();
const wsStore = useWorkspaceStore();

const workspaceId = route.params.id as string;
const showInstructions = ref(false);
const selectedFile = ref<File | null>(null);
const pastedText = ref('');
const consentConfirmed = ref(true);
const processing = ref(false);
const processingStatus = ref('Uploading export...');
const fileInputRef = ref<HTMLInputElement | null>(null);

function triggerFileInput() {
  fileInputRef.value?.click();
}

function onFileSelected(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    selectedFile.value = target.files[0];
  }
}

function loadSampleChat() {
  pastedText.value = `24/11/2026, 14:00 - Messages and calls are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.
24/11/2026, 14:05 - Priya: Hey everyone! It's been so long since our college group met up. How about a weekend trip to Pondicherry?
24/11/2026, 14:06 - Rahul: Pondicherry sounds perfect! The French Quarter cafes are lovely this time of the year.
24/11/2026, 14:08 - Karthik: Count me in! I can bring my SUV, so 5 of us can easily travel by car together.
24/11/2026, 14:10 - Ananya: Yay! What dates are we thinking? How about next weekend, Dec 5th and 6th?
24/11/2026, 14:12 - Priya: Dec 5-6 works for me. We should leave early morning Saturday (around 5:30 AM) from Chennai to avoid toll traffic.
24/11/2026, 14:15 - Vikram: I might have some office work on Friday evening, so Saturday morning 5:30 AM departure is great.
24/11/2026, 14:18 - Rahul: What should our budget target be? Let's keep it under ₹2500 per head including stay and petrol.
24/11/2026, 14:20 - Priya: ₹2500 per person is reasonable. We can split fuel and tolls equally.
24/11/2026, 14:25 - Ananya: For activities, we must do:
1. Promenade Beach evening walk
2. Auroville Matrimandir viewpoint
3. French colony bakery breakfast at Cafe des Arts
24/11/2026, 14:28 - Karthik: Check out this villa near Serenity Beach: https://pondicherry-villa.example.com/booking
24/11/2026, 14:30 - Priya: Villa looks awesome! Let's confirm by tomorrow evening so we can book rooms before they sell out.
24/11/2026, 14:32 - Rahul: Task for Karthik: confirm villa rates. Task for me: car servicing.`;
}

async function submitImport() {
  if (!consentConfirmed.value) {
    alert('Please confirm consent checkbox before processing.');
    return;
  }

  try {
    processing.value = true;
    processingStatus.value = 'Uploading conversation export...';

    const formData = new FormData();
    formData.append('consentConfirmed', 'true');

    if (selectedFile.value) {
      formData.append('file', selectedFile.value);
    } else if (pastedText.value.trim()) {
      formData.append('text', pastedText.value.trim());
    }

    processingStatus.value = 'Parsing messages & attachments...';
    const res = await api.uploadChat(workspaceId, formData);

    processingStatus.value = 'Extracting outing intelligence with Gemini AI...';
    await api.getInsights(workspaceId);

    // Refresh workspace state
    await wsStore.selectWorkspace(workspaceId);

    router.push(`/outings/${workspaceId}/insights`);
  } catch (err: any) {
    alert(err.message || 'Error processing chat import');
  } finally {
    processing.value = false;
  }
}
</script>
