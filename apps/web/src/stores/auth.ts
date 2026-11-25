import { defineStore } from 'pinia';
import { ref } from 'vue';
import { UserProfile } from '../types';
import { api } from '../services/api';
import { auth, onAuthStateChanged, signOut, FirebaseUser } from '../services/firebase';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserProfile | null>(null);
  const token = ref<string | null>(localStorage.getItem('outingmate_token') || null);
  const isAuthenticated = ref<boolean>(!!token.value);
  const loading = ref<boolean>(false);

  // Initialize Firebase Auth listener
  onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
    if (firebaseUser) {
      try {
        const idToken = await firebaseUser.getIdToken();
        token.value = idToken;
        api.setToken(idToken);
        isAuthenticated.value = true;
        await fetchUser();
      } catch (err) {
        console.error('Error refreshing Firebase token:', err);
      }
    } else {
      token.value = null;
      user.value = null;
      isAuthenticated.value = false;
      api.clearToken();
    }
  });

  async function fetchUser() {
    if (!token.value) return;
    try {
      loading.value = true;
      const res = await api.getMe();
      user.value = res.user;
      isAuthenticated.value = true;
    } catch (err) {
      console.error('Error fetching user profile:', err);
    } finally {
      loading.value = false;
    }
  }

  async function logout() {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Error signing out:', err);
    }
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
    logout,
  };
});
