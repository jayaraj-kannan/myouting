<template>
  <div class="max-w-2xl mx-auto space-y-6">
    <div class="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
      <h1 class="text-xl font-bold text-slate-900 mb-1">Create New Outing</h1>
      <p class="text-xs text-slate-500 mb-6">
        Drop a WhatsApp chat export to automatically extract plans with AI and voice summary, or organize manually.
      </p>

      <!-- Mode Selection Toggle -->
      <div v-if="!resultData" class="grid grid-cols-2 gap-3 mb-6">
        <button
          type="button"
          @click="isImportMode = true"
          class="p-4 rounded-2xl border text-left transition"
          :class="isImportMode ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20 shadow-xs' : 'border-slate-200 hover:border-slate-300'"
        >
          <div class="text-2xl mb-1">💬</div>
          <div class="font-bold text-sm text-slate-900">From WhatsApp Export</div>
          <div class="text-xs text-slate-500 mt-0.5">Zero input needed. Drop chat file & get voice plan summary</div>
        </button>

        <button
          type="button"
          @click="isImportMode = false"
          class="p-4 rounded-2xl border text-left transition"
          :class="!isImportMode ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20 shadow-xs' : 'border-slate-200 hover:border-slate-300'"
        >
          <div class="text-2xl mb-1">📝</div>
          <div class="font-bold text-sm text-slate-900">Manual Planning</div>
          <div class="text-xs text-slate-500 mt-0.5">Enter details and invite friends manually</div>
        </button>
      </div>

      <!-- ============================================== -->
      <!-- IMPORT MODE: ZERO INPUT NEEDED                 -->
      <!-- ============================================== -->
      <div v-if="isImportMode && !resultData" class="space-y-5">
        <!-- Explainer -->
        <div class="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 flex items-start space-x-3">
          <span class="text-xl">✨</span>
          <div class="text-xs text-emerald-900 leading-relaxed">
            <span class="font-bold">Zero input required:</span> Just drop your exported WhatsApp chat (<code>.txt</code> or <code>.zip</code>).
            OutingMate reads the conversation, sends it to <span class="font-semibold text-emerald-800">Gemini</span> to extract destination, dates, budget & itinerary, and converts the plan summary into spoken audio with <span class="font-semibold text-emerald-800">Sarvam Voice</span>.
          </div>
        </div>

        <!-- Sample Chat One-Click Button -->
        <div class="flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5">
          <div>
            <div class="text-xs font-bold text-slate-800">No export file ready?</div>
            <div class="text-[11px] text-slate-500">Test instantly with a realistic Pondicherry group road trip conversation.</div>
          </div>
          <button
            type="button"
            @click="loadSampleChat"
            class="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition shadow-xs"
          >
            Load Sample Chat
          </button>
        </div>

        <!-- Dropzone -->
        <div
          class="border-2 border-dashed rounded-2xl p-8 text-center transition cursor-pointer"
          :class="selectedFile ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-300 hover:border-emerald-400 bg-slate-50/50'"
          @click="triggerFileInput"
          @dragover.prevent
          @drop.prevent="onFileDrop"
        >
          <input
            ref="fileInputRef"
            type="file"
            accept=".txt,.zip"
            class="hidden"
            @change="onFileSelected"
          />

          <div class="text-4xl mb-2">{{ selectedFile ? '📄' : '📥' }}</div>

          <div v-if="selectedFile">
            <div class="text-sm font-bold text-slate-900">{{ selectedFile.name }}</div>
            <div class="text-xs text-slate-500 mt-1">{{ ((selectedFile.size || 0) / 1024).toFixed(1) }} KB • Ready to analyze</div>
            <button
              type="button"
              @click.stop="selectedFile = null"
              class="text-xs text-rose-600 font-semibold mt-2 hover:underline inline-block"
            >
              Remove file
            </button>
          </div>

          <div v-else>
            <div class="text-sm font-semibold text-slate-800">Drop your WhatsApp export (.zip or .txt) here</div>
            <div class="text-xs text-slate-400 mt-1">or click to browse from your device</div>
          </div>
        </div>

        <!-- Or Paste Option -->
        <div v-if="!selectedFile">
          <button
            type="button"
            @click="showPasteArea = !showPasteArea"
            class="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center space-x-1"
          >
            <span>{{ showPasteArea ? '▼ Hide Paste Box' : '▶ Or paste exported chat text directly' }}</span>
          </button>

          <textarea
            v-if="showPasteArea"
            v-model="pastedText"
            rows="5"
            placeholder="Paste exported WhatsApp messages here..."
            class="mt-2 w-full font-mono text-xs rounded-xl border border-slate-300 p-3 focus:ring-2 focus:ring-emerald-500 outline-none"
          ></textarea>
        </div>

        <!-- Processing Progress Box -->
        <div v-if="processing" class="bg-slate-900 text-white p-5 rounded-2xl space-y-3">
          <div class="flex items-center space-x-3">
            <div class="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
            <div class="text-sm font-bold">{{ processingStepText }}</div>
          </div>
          <div class="grid grid-cols-3 gap-2 text-[10px] uppercase font-bold text-slate-400">
            <div :class="processingStep >= 1 ? 'text-emerald-400' : ''">1. Parse Chat ✓</div>
            <div :class="processingStep >= 2 ? 'text-emerald-400' : ''">2. Gemini AI Plan</div>
            <div :class="processingStep >= 3 ? 'text-emerald-400' : ''">3. Sarvam Voice</div>
          </div>
        </div>

        <!-- Submit Button -->
        <div class="pt-2 flex items-center justify-between">
          <router-link to="/" class="text-xs font-semibold text-slate-500 hover:text-slate-800">
            Cancel
          </router-link>

          <button
            type="button"
            @click="processDirectImport"
            :disabled="processing || (!selectedFile && !pastedText.trim())"
            class="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-6 py-2.5 rounded-xl transition shadow-sm disabled:opacity-50 flex items-center space-x-2"
          >
            <span>{{ processing ? 'Processing...' : 'Generate Plan & Sarvam Voice →' }}</span>
          </button>
        </div>
      </div>

      <!-- ============================================== -->
      <!-- RESULT SCREEN: VOICE SUMMARY & DETAILS         -->
      <!-- ============================================== -->
      <div v-else-if="resultData" class="space-y-6 animate-in fade-in duration-200">
        <!-- Success Banner -->
        <div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <span class="text-xl">🎉</span>
            <div>
              <div class="text-xs font-bold text-emerald-900">Outing Created Automatically!</div>
              <div class="text-[11px] text-emerald-700">All core metadata extracted and people mapped to this event.</div>
            </div>
          </div>
          <span class="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
            {{ resultData.workspace.title }}
          </span>
        </div>

        <!-- Sarvam Audio Player Card -->
        <div
          v-if="audioSrc"
          class="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white p-5 rounded-2xl shadow-md space-y-3"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2 text-xs font-bold tracking-wider uppercase text-emerald-200">
              <span>🎙️ Sarvam AI Voice Summary</span>
              <span class="bg-emerald-500/30 text-emerald-100 text-[10px] px-2 py-0.5 rounded-full">bulbul:v1</span>
            </div>
            <button
              v-if="isPlaying"
              @click="togglePlay"
              class="text-xs text-emerald-200 hover:text-white"
            >
              Pause
            </button>
          </div>

          <div class="flex items-center space-x-4">
            <button
              @click="togglePlay"
              class="w-12 h-12 rounded-full bg-white text-emerald-800 flex items-center justify-center font-bold text-lg shadow hover:bg-emerald-50 transition shrink-0"
              :title="isPlaying ? 'Pause' : 'Play audio summary'"
            >
              {{ isPlaying ? '⏸' : '▶' }}
            </button>

            <div class="flex-1">
              <div class="text-sm font-bold flex items-center justify-between">
                <span>{{ isPlaying ? 'Playing Voice Summary...' : 'Listen to Spoken Outing Summary' }}</span>
                <span class="text-xs text-emerald-200 font-mono">{{ formatTime(audioCurrentTime) }}</span>
              </div>
              <div class="w-full bg-emerald-900/50 rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  class="bg-emerald-300 h-full transition-all duration-150"
                  :style="{ width: audioDuration ? `${(audioCurrentTime / audioDuration) * 100}%` : '0%' }"
                ></div>
              </div>
            </div>

            <button
              @click="replayAudio"
              class="text-xs text-emerald-200 hover:text-white bg-emerald-800/60 p-2 rounded-xl transition"
              title="Replay from start"
            >
              🔄
            </button>
          </div>
        </div>

        <!-- Spoken Summary Text (Gemini) -->
        <div class="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-2">
          <div class="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
            <span>📝 Gemini Plan Summary</span>
          </div>
          <p class="text-xs text-slate-700 leading-relaxed font-medium italic">
            "{{ resultData.summaryText }}"
          </p>
        </div>

        <!-- Core Metadata Extracted -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="bg-white p-3.5 rounded-xl border border-slate-200">
            <div class="text-[10px] uppercase font-bold text-slate-400">Destination</div>
            <div class="text-sm font-extrabold text-slate-900 mt-0.5">
              📍 {{ resultData.workspace.destination || 'TBD' }}
            </div>
          </div>

          <div class="bg-white p-3.5 rounded-xl border border-slate-200">
            <div class="text-[10px] uppercase font-bold text-slate-400">Budget / Person</div>
            <div class="text-sm font-extrabold text-slate-900 mt-0.5">
              ₹{{ (resultData.workspace.estimatedBudget || 2500).toLocaleString('en-IN') }}
            </div>
          </div>

          <div class="bg-white p-3.5 rounded-xl border border-slate-200">
            <div class="text-[10px] uppercase font-bold text-slate-400">Status</div>
            <div class="text-sm font-extrabold text-emerald-600 mt-0.5 uppercase">
              {{ resultData.workspace.status }}
            </div>
          </div>

          <div class="bg-white p-3.5 rounded-xl border border-slate-200">
            <div class="text-[10px] uppercase font-bold text-slate-400">People Mapped</div>
            <div class="text-sm font-extrabold text-teal-600 mt-0.5">
              👥 {{ resultData.workspace.members?.length || resultData.workspace.groupSize }} people
            </div>
          </div>
        </div>

        <!-- Mapped People Chips -->
        <div class="space-y-2">
          <div class="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Mapped People ({{ resultData.workspace.members?.length }})
          </div>
          <div class="flex flex-wrap gap-2">
            <div
              v-for="member in resultData.workspace.members"
              :key="member.userId"
              class="inline-flex items-center space-x-1.5 bg-slate-100 text-slate-800 px-2.5 py-1 rounded-xl text-xs font-medium"
            >
              <span class="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px] font-bold">
                {{ member.displayName.charAt(0).toUpperCase() }}
              </span>
              <span>{{ member.displayName }}</span>
              <span v-if="member.role === 'owner'" class="text-[9px] font-bold text-purple-700 bg-purple-100 px-1 rounded">Host</span>
            </div>
          </div>
        </div>

        <!-- Navigation Actions -->
        <div class="pt-4 border-t border-slate-100 flex items-center justify-between">
          <router-link
            to="/"
            class="text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            ← Back to Dashboard
          </router-link>

          <button
            @click="goToPlan"
            class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition shadow-sm flex items-center space-x-1.5"
          >
            <span>Explore Full Plan & Itinerary →</span>
          </button>
        </div>
      </div>

      <!-- ============================================== -->
      <!-- MANUAL PLANNING MODE                           -->
      <!-- ============================================== -->
      <form v-else-if="!isImportMode" @submit.prevent="createManualOuting" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Outing Title *
          </label>
          <input
            v-model="manualForm.title"
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
            v-model="manualForm.destination"
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
              v-model="manualForm.estimatedBudget"
              type="number"
              placeholder="2500"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Expected People Count
            </label>
            <input
              v-model="manualForm.groupSize"
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
            v-model="manualForm.description"
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
            :disabled="manualLoading"
            class="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2 rounded-xl text-sm transition shadow-sm disabled:opacity-50"
          >
            Create Outing Plan
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../services/api';
import { useWorkspaceStore } from '../stores/workspace';

const router = useRouter();
const wsStore = useWorkspaceStore();

const isImportMode = ref<boolean>(true);
const selectedFile = ref<File | null>(null);
const pastedText = ref('');
const showPasteArea = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);

const processing = ref(false);
const processingStep = ref(1);
const processingStepText = ref('Reading WhatsApp chat export...');

const resultData = ref<any>(null);
const audioSrc = ref<string | null>(null);
const isPlaying = ref(false);
const audioDuration = ref(0);
const audioCurrentTime = ref(0);
let audioObj: HTMLAudioElement | null = null;

// Manual mode form
const manualLoading = ref(false);
const manualForm = ref({
  title: '',
  destination: '',
  estimatedBudget: 2500,
  groupSize: 5,
  description: '',
});

function triggerFileInput() {
  fileInputRef.value?.click();
}

function onFileSelected(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    selectedFile.value = target.files[0];
  }
}

function onFileDrop(e: DragEvent) {
  if (e.dataTransfer && e.dataTransfer.files.length > 0) {
    selectedFile.value = e.dataTransfer.files[0];
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
24/11/2026, 14:25 - Ananya: For activities, we must do Promenade Beach evening walk, French colony cafes, and Auroville.
24/11/2026, 14:28 - Karthik: Check out this villa near Serenity Beach: https://pondicherry-villa.example.com/booking
24/11/2026, 14:30 - Priya: Villa looks awesome! Let's confirm by tomorrow evening so we can book rooms before they sell out.
24/11/2026, 14:32 - Rahul: Task for Karthik: confirm villa rates. Task for me: car servicing.`;
  showPasteArea.value = true;
}

async function processDirectImport() {
  if (!selectedFile.value && !pastedText.value.trim()) {
    alert('Please drop a WhatsApp export file or paste conversation text.');
    return;
  }

  try {
    processing.value = true;
    processingStep.value = 1;
    processingStepText.value = '1. Reading WhatsApp messages and participants...';

    const formData = new FormData();
    if (selectedFile.value) {
      formData.append('file', selectedFile.value);
    } else {
      formData.append('text', pastedText.value.trim());
    }

    setTimeout(() => {
      if (processing.value) {
        processingStep.value = 2;
        processingStepText.value = '2. Gemini extracting destination, dates, budget & creating plan...';
      }
    }, 1200);

    setTimeout(() => {
      if (processing.value) {
        processingStep.value = 3;
        processingStepText.value = '3. Sarvam AI synthesizing audio voice summary...';
      }
    }, 2800);

    const res = await api.importDirectChat(formData);
    resultData.value = res;

    // Refresh workspace store
    await wsStore.loadWorkspaces();
    await wsStore.selectWorkspace(res.workspace.id);

    // Audio setup
    if (res.audioBase64) {
      audioSrc.value = `data:audio/${res.audioFormat || 'wav'};base64,${res.audioBase64}`;
      setTimeout(() => {
        togglePlay();
      }, 500);
    }
  } catch (err: any) {
    alert(err.message || 'Error processing chat import');
  } finally {
    processing.value = false;
  }
}

function togglePlay() {
  if (!audioSrc.value) return;
  if (!audioObj) {
    audioObj = new Audio(audioSrc.value);
    audioObj.ontimeupdate = () => {
      audioCurrentTime.value = audioObj?.currentTime || 0;
    };
    audioObj.onloadedmetadata = () => {
      audioDuration.value = audioObj?.duration || 0;
    };
    audioObj.onended = () => {
      isPlaying.value = false;
      audioCurrentTime.value = 0;
    };
  }

  if (isPlaying.value) {
    audioObj.pause();
    isPlaying.value = false;
  } else {
    audioObj.play().catch(() => {});
    isPlaying.value = true;
  }
}

function replayAudio() {
  if (!audioObj && audioSrc.value) {
    togglePlay();
    return;
  }
  if (audioObj) {
    audioObj.currentTime = 0;
    audioObj.play().catch(() => {});
    isPlaying.value = true;
  }
}

function formatTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

async function goToPlan() {
  if (!resultData.value?.workspace?.id) return;
  router.push(`/outings/${resultData.value.workspace.id}/plan`);
}

async function createManualOuting() {
  if (!manualForm.value.title) return;
  try {
    manualLoading.value = true;
    const res = await api.createWorkspace({
      ...manualForm.value,
      sourceType: 'manual',
    });

    await wsStore.loadWorkspaces();
    await wsStore.selectWorkspace(res.workspace.id);
    router.push(`/outings/${res.workspace.id}/plan`);
  } catch (err: any) {
    alert(err.message || 'Error creating outing');
  } finally {
    manualLoading.value = false;
  }
}

onUnmounted(() => {
  if (audioObj) {
    audioObj.pause();
    audioObj = null;
  }
});
</script>
