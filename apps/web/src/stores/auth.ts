import { defineStore } from 'pinia';
import { ref } from 'vue';
import { UserProfile } from '../types';
import { api } from '../services/api';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserProfile | null>(null);
  const token = ref<string | null>(localStorage.getItem('outingmate_token') || 'demo-token');
  const isAuthenticated = ref<boolean>(!!token.value);
  const loading = ref<boolean>(false);

  async function fetchUser() {
    try {
      loading.value = true;
      const res = await api.getMe();
      user.value = res.user;
      isAuthenticated.value = true;
    } catch {
      // If error, keep default demo user
      user.value = {
        userId: 'usr_demo_1',
        displayName: 'Alex (Organizer)',
        email: 'alex@outingmate.app',
        preferredLanguage: 'en-IN',
      };
      isAuthenticated.value = true;
    } finally {
      loading.value = false;
    }
  }

  function loginDemo(name = 'Alex (Organizer)') {
    token.value = 'demo-token';
    api.setToken('demo-token');
    user.value = {
      userId: 'usr_demo_1',
      displayName: name,
      email: 'alex@outingmate.app',
      preferredLanguage: 'en-IN',
    };
    isAuthenticated.value = true;
  }

  function loginPhone(phoneNumber: string) {
    const userId = `usr_${Date.now()}`;
    token.value = userId;
    api.setToken(userId);
    user.value = {
      userId,
      displayName: `User (${phoneNumber.slice(-4)})`,
      phoneNumber,
      preferredLanguage: 'en-IN',
    };
    isAuthenticated.value = true;
  }

  function logout() {
    token.value = null;
    user.value = null;
    isAuthenticated.value = false;
    api.clearToken();
  }

  return {
    user,
    token,
    isAuthenticated,
    loading,
    fetchUser,
    loginDemo,
    loginPhone,
    logout,
  };
});
