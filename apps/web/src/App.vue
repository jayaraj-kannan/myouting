<template>
  <div class="min-h-screen flex flex-col bg-slate-50 text-slate-800">
    <Navbar v-if="authStore.isAuthenticated" />
    <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from './stores/auth';
import Navbar from './components/Navbar.vue';

const authStore = useAuthStore();
</script>
