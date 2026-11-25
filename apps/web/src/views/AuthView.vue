<template>
  <div class="max-w-md mx-auto my-12 p-8 bg-white rounded-2xl shadow-sm border border-slate-200">
    <!-- Header -->
    <div class="text-center mb-8">
      <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md font-extrabold text-2xl mx-auto mb-3">
        OM
      </div>
      <h1 class="text-2xl font-bold text-slate-900">Welcome to OutingMate</h1>
      <p class="text-sm text-slate-500 mt-1">Turn group conversations into actionable outing plans</p>
    </div>

    <!-- Phone OTP Login Form -->
    <div class="space-y-4">
      <div v-if="!otpSent">
        <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
          Phone Number
        </label>
        <div class="flex">
          <span class="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 text-slate-500 text-sm font-medium">
            +91
          </span>
          <input
            v-model="phoneNumber"
            type="tel"
            placeholder="9876543210"
            maxlength="10"
            class="flex-1 rounded-r-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          />
        </div>

        <div id="recaptcha-container" class="mt-3"></div>

        <button
          @click="sendOtp"
          :disabled="!isValidPhone || loading"
          class="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition shadow-sm disabled:opacity-50"
        >
          {{ loading ? 'Sending...' : 'Send Verification OTP' }}
        </button>
      </div>

      <div v-else class="space-y-4">
        <div class="text-sm text-slate-600">
          Enter the 6-digit OTP sent to <span class="font-semibold">+91 {{ phoneNumber }}</span>
        </div>
        <input
          v-model="otpCode"
          type="text"
          placeholder="Enter 6-digit OTP"
          maxlength="6"
          class="w-full text-center tracking-widest text-xl font-bold rounded-lg border border-slate-300 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
        />
        <button
          @click="verifyOtp"
          :disabled="loading || otpCode.trim().length !== 6"
          class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition shadow-sm disabled:opacity-50"
        >
          {{ loading ? 'Verifying...' : 'Verify & Sign In' }}
        </button>
      </div>
    </div>

    <!-- Divider -->
    <div class="relative my-6">
      <div class="absolute inset-0 flex items-center">
        <div class="w-full border-t border-slate-200"></div>
      </div>
      <div class="relative flex justify-center text-xs uppercase">
        <span class="bg-white px-2 text-slate-400 font-medium">or continue with</span>
      </div>
    </div>

    <!-- Google Sign-In -->
    <div class="space-y-3">
      <button
        @click="loginWithGoogle"
        :disabled="loading"
        class="w-full flex items-center justify-center space-x-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium py-2.5 px-4 rounded-xl text-sm transition disabled:opacity-50"
      >
        <span>🌐 Sign in with Google</span>
      </button>
    </div>

    <!-- Privacy & Consent Notice -->
    <div class="mt-8 pt-6 border-t border-slate-100 text-[11px] text-slate-400 text-center leading-relaxed">
      By signing in, you agree to our Terms of Service & Privacy Policy. Imported chat data is processed privately and never used to train public models.
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useWorkspaceStore } from '../stores/workspace';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithPhoneNumber,
  RecaptchaVerifier,
} from '../services/firebase';

const authStore = useAuthStore();
const wsStore = useWorkspaceStore();
const router = useRouter();

const phoneNumber = ref('');
const otpSent = ref(false);
const otpCode = ref('');
const loading = ref(false);
let confirmationResult: any = null;
let recaptchaVerifier: RecaptchaVerifier | null = null;

const isValidPhone = computed(() => phoneNumber.value.trim().length === 10);

function getOrCreateRecaptcha() {
  if (!recaptchaVerifier) {
    recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
    });
  }
  return recaptchaVerifier;
}

async function sendOtp() {
  if (!isValidPhone.value) return;
  try {
    loading.value = true;
    const verifier = getOrCreateRecaptcha();
    confirmationResult = await signInWithPhoneNumber(auth, `+91${phoneNumber.value.trim()}`, verifier);
    otpSent.value = true;
  } catch (err: any) {
    alert(`Failed to send OTP: ${err.message}`);
  } finally {
    loading.value = false;
  }
}

async function verifyOtp() {
  if (!confirmationResult || otpCode.value.trim().length !== 6) return;
  try {
    loading.value = true;
    const userCredential = await confirmationResult.confirm(otpCode.value.trim());
    const idToken = await userCredential.user.getIdToken();
    localStorage.setItem('outingmate_token', idToken);
    await authStore.fetchUser();
    await wsStore.loadWorkspaces();
    router.push('/');
  } catch (err: any) {
    alert(`OTP verification failed: ${err.message}`);
  } finally {
    loading.value = false;
  }
}

async function loginWithGoogle() {
  try {
    loading.value = true;
    const userCredential = await signInWithPopup(auth, googleProvider);
    const idToken = await userCredential.user.getIdToken();
    localStorage.setItem('outingmate_token', idToken);
    await authStore.fetchUser();
    await wsStore.loadWorkspaces();
    router.push('/');
  } catch (err: any) {
    alert(`Google sign-in error: ${err.message}`);
  } finally {
    loading.value = false;
  }
}
</script>
