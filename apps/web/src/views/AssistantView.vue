<template>
  <div class="max-w-3xl mx-auto h-[calc(100vh-8rem)] flex flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
    <!-- Header -->
    <div class="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
      <div class="flex items-center space-x-3">
        <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white text-xl shadow-sm">
          🎙️
        </div>
        <div>
          <h2 class="text-sm font-bold text-slate-900">OutingMate Assistant</h2>
          <p class="text-[11px] text-slate-500">Gemini contextual intelligence & Sarvam voice STT/TTS</p>
        </div>
      </div>

      <div class="flex items-center space-x-2">
        <span class="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
          Chat & Plan Aware
        </span>
      </div>
    </div>

    <!-- Suggested Questions Chips -->
    <div class="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center space-x-2 overflow-x-auto text-xs">
      <span class="text-slate-400 font-medium whitespace-nowrap text-[11px]">Suggestions:</span>
      <button
        v-for="(chip, i) in quickQuestions"
        :key="i"
        @click="askQuickQuestion(chip)"
        class="bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-slate-700 px-2.5 py-1 rounded-full whitespace-nowrap text-[11px] transition"
      >
        {{ chip }}
      </button>
    </div>

    <!-- Message Thread -->
    <div ref="chatContainer" class="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
      <div v-for="msg in messages" :key="msg.id" class="flex flex-col" :class="msg.role === 'user' ? 'items-end' : 'items-start'">
        <div
          class="max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed"
          :class="msg.role === 'user' ? 'bg-emerald-600 text-white rounded-br-none' : 'bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200/80'"
        >
          <!-- Message text -->
          <div class="whitespace-pre-wrap">{{ msg.content }}</div>

          <!-- Citations if present -->
          <div v-if="msg.citations && msg.citations.length > 0" class="mt-3 pt-2 border-t border-slate-200/60 text-[11px] space-y-1">
            <span class="text-slate-500 font-semibold block text-[10px] uppercase">Source Citations:</span>
            <div v-for="(cit, ci) in msg.citations" :key="ci" class="bg-white/80 p-1.5 rounded text-slate-700 border border-slate-200">
              <span class="font-bold text-emerald-700">[{{ cit.messageId }} by {{ cit.sender }}]:</span> {{ cit.text }}
            </div>
          </div>

          <!-- Audio playback button for assistant response -->
          <div v-if="msg.role === 'assistant'" class="mt-2.5 pt-2 border-t border-slate-200/40 flex items-center justify-between">
            <button
              @click="playAssistantAudio(msg.content)"
              class="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center space-x-1"
            >
              <span>🔊 Listen (Sarvam TTS)</span>
            </button>
          </div>
        </div>
      </div>

      <div v-if="loading" class="flex items-center space-x-2 text-xs text-slate-400">
        <div class="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <span>Thinking...</span>
      </div>
    </div>

    <!-- Recording Status Banner if active -->
    <div v-if="isRecording" class="px-4 py-2 bg-rose-50 border-t border-rose-200 flex items-center justify-between text-xs text-rose-700">
      <div class="flex items-center space-x-2">
        <div class="w-3 h-3 rounded-full bg-rose-600 animate-ping"></div>
        <span class="font-bold">Recording voice note... ({{ recordingTime }}s)</span>
      </div>
      <button @click="stopRecording" class="font-bold text-rose-800 hover:underline">
        Stop & Transcribe →
      </button>
    </div>

    <!-- Input Footer with Text & Microphone -->
    <div class="p-3 sm:p-4 border-t border-slate-200 bg-white">
      <form @submit.prevent="sendMessage" class="flex items-center space-x-2">
        <button
          type="button"
          @click="toggleRecording"
          class="w-10 h-10 rounded-xl flex items-center justify-center transition"
          :class="isRecording ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'"
          title="Voice input using Sarvam STT"
        >
          🎙️
        </button>

        <input
          v-model="inputMessage"
          type="text"
          placeholder="Ask a question about destinations, budget, or the plan..."
          class="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
        />

        <button
          type="submit"
          :disabled="!inputMessage.trim() || loading"
          class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '../services/api';
import { AssistantMessage } from '../types';

const route = useRoute();
const workspaceId = route.params.id as string;

const inputMessage = ref('');
const loading = ref(false);
const chatContainer = ref<HTMLDivElement | null>(null);

const quickQuestions = [
  'What is the final budget discussed?',
  'Who is bringing the car?',
  'What activities were suggested?',
  'What decisions still need votes?',
];

const messages = ref<AssistantMessage[]>([]);

// Voice Recording state
const isRecording = ref(false);
const recordingTime = ref(0);
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let timerInterval: any = null;

onMounted(async () => {
  try {
    const res = await api.getAssistantHistory(`session_${workspaceId}`);
    if (res.messages && res.messages.length > 0) {
      messages.value = res.messages;
    }
  } catch {}
});

function scrollToBottom() {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });
}

async function sendMessage() {
  if (!inputMessage.value.trim() || loading.value) return;

  const text = inputMessage.value.trim();
  inputMessage.value = '';

  messages.value.push({
    id: `usr_${Date.now()}`,
    sessionId: `session_${workspaceId}`,
    role: 'user',
    content: text,
    createdAt: new Date().toISOString(),
  });
  scrollToBottom();

  try {
    loading.value = true;
    const res = await api.askAssistant(workspaceId, text, `session_${workspaceId}`);
    if (res.message) {
      messages.value.push(res.message);
      scrollToBottom();
    }
  } catch (err: any) {
    messages.value.push({
      id: `err_${Date.now()}`,
      sessionId: `session_${workspaceId}`,
      role: 'assistant',
      content: 'Sorry, I encountered an error answering your question. Please try again.',
      createdAt: new Date().toISOString(),
    });
  } finally {
    loading.value = false;
  }
}

function askQuickQuestion(q: string) {
  inputMessage.value = q;
  sendMessage();
}

async function toggleRecording() {
  if (isRecording.value) {
    stopRecording();
  } else {
    startRecording();
  }
}

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
      await sendAudioForTranscription(audioBlob);
    };

    mediaRecorder.start();
    isRecording.value = true;
    recordingTime.value = 0;
    timerInterval = setInterval(() => {
      recordingTime.value += 1;
    }, 1000);
  } catch (err) {
    alert('Microphone permission denied or not supported in this browser.');
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  isRecording.value = false;
  clearInterval(timerInterval);
}

async function sendAudioForTranscription(blob: Blob) {
  try {
    loading.value = true;
    const formData = new FormData();
    formData.append('audio', blob, 'recording.wav');
    formData.append('languageCode', 'en-IN');

    const res = await api.transcribeSpeech(formData);
    if (res.transcript) {
      inputMessage.value = res.transcript;
      sendMessage();
    }
  } catch (err: any) {
    alert('Voice transcription error: ' + (err.message || 'Failed'));
  } finally {
    loading.value = false;
  }
}

async function playAssistantAudio(text: string) {
  try {
    const res = await api.synthesizeSpeech(text);
    if (res.audioBase64) {
      const audio = new Audio(`data:audio/wav;base64,${res.audioBase64}`);
      await audio.play();
    }
  } catch (err: any) {
    alert(`Sarvam TTS error: ${err.message}`);
  }
}
</script>
