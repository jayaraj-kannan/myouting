import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import App from './App.vue';
import './style.css';
import { useAuthStore } from './stores/auth';
import { useWorkspaceStore } from './stores/workspace';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

// Preload user & flags
const authStore = useAuthStore();
const wsStore = useWorkspaceStore();

authStore.fetchUser().then(() => {
  wsStore.loadFlags();
});

app.mount('#app');
