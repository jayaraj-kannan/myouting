<template>
  <div class="space-y-6">
    <!-- Header with Invite Action -->
    <div class="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-slate-900">Collaboration & Group Decision Center</h1>
        <p class="text-xs text-slate-500 mt-1">Vote on decisions, assign roles, split expenses, and coordinate with friends.</p>
      </div>

      <button
        @click="generateInvite"
        class="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition shadow-sm flex items-center space-x-2"
      >
        <span>🔗 Invite Members</span>
      </button>
    </div>

    <!-- Generated Invite Banner if present -->
    <div v-if="inviteUrl" class="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center justify-between">
      <div class="text-xs text-emerald-900 truncate mr-2">
        <span class="font-bold">Shareable Invitation Link:</span> {{ inviteUrl }}
      </div>
      <button
        @click="copyInvite"
        class="bg-white border border-emerald-300 text-emerald-800 font-bold text-xs px-3 py-1.5 rounded-lg whitespace-nowrap hover:bg-emerald-100"
      >
        {{ copied ? 'Copied! ✓' : 'Copy Link' }}
      </button>
    </div>

    <!-- 3-Column Grid: Polls & Voting, Expenses, and Member List -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Column 1: Live Polls / Voting (lg:col-span-2) -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Polls Card -->
        <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 class="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <span>🗳️ Group Polls & Decisions</span>
              <span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {{ polls.length }} Active
              </span>
            </h2>
            <button
              @click="showNewPoll = !showNewPoll"
              class="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              + Create Poll
            </button>
          </div>

          <!-- New Poll Form -->
          <div v-if="showNewPoll" class="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div class="font-bold text-xs text-slate-800">Create New Poll</div>
            <input
              v-model="newPollTitle"
              type="text"
              placeholder="Question, e.g. Which cafe for Sunday brunch?"
              class="w-full text-xs rounded-xl border border-slate-300 p-2.5 outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <div class="space-y-1.5">
              <input
                v-model="newPollOption1"
                type="text"
                placeholder="Option 1"
                class="w-full text-xs rounded-lg border border-slate-300 p-2 outline-none"
              />
              <input
                v-model="newPollOption2"
                type="text"
                placeholder="Option 2"
                class="w-full text-xs rounded-lg border border-slate-300 p-2 outline-none"
              />
            </div>
            <div class="flex justify-end space-x-2 pt-2">
              <button @click="showNewPoll = false" class="text-xs text-slate-500 px-3 py-1.5">Cancel</button>
              <button @click="createPoll" class="bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
                Create Poll
              </button>
            </div>
          </div>

          <!-- Polls List -->
          <div class="space-y-4">
            <div
              v-for="poll in polls"
              :key="poll.id"
              class="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3"
            >
              <div class="text-sm font-bold text-slate-800">{{ poll.title }}</div>
              <div class="space-y-2">
                <div
                  v-for="opt in poll.options"
                  :key="opt.id"
                  @click="vote(poll.id, opt.id)"
                  class="cursor-pointer bg-white p-3 rounded-xl border transition relative overflow-hidden"
                  :class="opt.votes.includes(authStore.user?.userId || '') ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-slate-200 hover:border-slate-300'"
                >
                  <!-- Progress bar fill background -->
                  <div
                    class="absolute left-0 top-0 bottom-0 bg-emerald-100/60 transition-all duration-300 pointer-events-none"
                    :style="{ width: getPercentage(poll, opt.votes.length) + '%' }"
                  ></div>

                  <div class="relative z-10 flex items-center justify-between text-xs">
                    <span class="font-semibold text-slate-800">{{ opt.text }}</span>
                    <span class="font-bold text-emerald-800">
                      {{ opt.votes.length }} votes ({{ getPercentage(poll, opt.votes.length) }}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Shared Expenses Card -->
        <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 class="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <span>💳 Expense Tracker & Split</span>
            </h2>
            <button
              @click="showNewExpense = !showNewExpense"
              class="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              + Add Expense
            </button>
          </div>

          <!-- Add Expense Form -->
          <div v-if="showNewExpense" class="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div class="font-bold text-xs text-slate-800">Record New Group Expense</div>
            <div class="grid grid-cols-2 gap-2">
              <input
                v-model="expenseTitle"
                type="text"
                placeholder="Title, e.g. Villa Booking"
                class="text-xs rounded-lg border border-slate-300 p-2 outline-none"
              />
              <input
                v-model="expenseAmount"
                type="number"
                placeholder="Amount (₹)"
                class="text-xs rounded-lg border border-slate-300 p-2 outline-none"
              />
            </div>
            <div class="flex justify-end space-x-2 pt-2">
              <button @click="showNewExpense = false" class="text-xs text-slate-500 px-3 py-1.5">Cancel</button>
              <button @click="createExpense" class="bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
                Save Expense
              </button>
            </div>
          </div>

          <!-- Expenses List -->
          <div class="space-y-2 text-xs">
            <div
              v-for="exp in expenses"
              :key="exp.id"
              class="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100"
            >
              <div>
                <div class="font-bold text-slate-800">{{ exp.title }}</div>
                <div class="text-[10px] text-slate-500">Paid by {{ exp.paidByName }} • Split with {{ exp.splitUserIds.length }} people</div>
              </div>
              <div class="text-right">
                <div class="font-extrabold text-slate-900">₹{{ exp.amount.toLocaleString('en-IN') }}</div>
                <div class="text-[10px] text-emerald-600 font-bold">
                  ₹{{ Math.round(exp.amount / (exp.splitUserIds.length || 1)) }}/person
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Column 2: Workspace Members & Comments (1 col) -->
      <div class="space-y-6">
        <!-- Members List -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
            <span>👥 Group Members</span>
            <span class="text-xs text-slate-400">{{ members.length }}</span>
          </h3>

          <div class="space-y-2">
            <div
              v-for="m in members"
              :key="m.userId"
              class="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100"
            >
              <div class="flex items-center space-x-2.5">
                <div class="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                  {{ m.displayName.charAt(0) }}
                </div>
                <div>
                  <div class="font-semibold text-xs text-slate-800">{{ m.displayName }}</div>
                  <div class="text-[10px] text-slate-400 capitalize">{{ m.role }}</div>
                </div>
              </div>
              <span
                class="text-[10px] font-bold px-2 py-0.5 rounded-full"
                :class="m.role === 'owner' ? 'bg-purple-100 text-purple-800' : 'bg-slate-200 text-slate-700'"
              >
                {{ m.role }}
              </span>
            </div>
          </div>
        </div>

        <!-- Comments Feed -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider">💬 Group Discussion Notes</h3>
          <div class="space-y-2 max-h-56 overflow-y-auto">
            <div
              v-for="c in comments"
              :key="c.id"
              class="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
            >
              <div class="font-bold text-emerald-800 text-[11px]">{{ c.userName }}</div>
              <div class="text-slate-700 mt-0.5">{{ c.text }}</div>
            </div>
          </div>

          <form @submit.prevent="addComment" class="pt-2 flex items-center space-x-2">
            <input
              v-model="newCommentText"
              type="text"
              placeholder="Add a note or comment..."
              class="flex-1 text-xs rounded-xl border border-slate-300 p-2 outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              :disabled="!newCommentText.trim()"
              class="bg-emerald-600 text-white font-bold text-xs px-3 py-2 rounded-xl disabled:opacity-50"
            >
              Post
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useWorkspaceStore } from '../stores/workspace';
import { useAuthStore } from '../stores/auth';
import { api } from '../services/api';
import { VotePoll, ExpenseItem, CommentItem } from '../types';

const route = useRoute();
const wsStore = useWorkspaceStore();
const authStore = useAuthStore();
const workspaceId = route.params.id as string;

const polls = ref<VotePoll[]>([]);
const expenses = ref<ExpenseItem[]>([]);
const comments = ref<CommentItem[]>([]);
const inviteUrl = ref('');
const copied = ref(false);

const showNewPoll = ref(false);
const newPollTitle = ref('');
const newPollOption1 = ref('');
const newPollOption2 = ref('');

const showNewExpense = ref(false);
const expenseTitle = ref('');
const expenseAmount = ref<number | ''>('');

const newCommentText = ref('');

const members = computed(() => wsStore.activeWorkspace?.members || []);

onMounted(async () => {
  if (wsStore.activeWorkspace?.id !== workspaceId) {
    await wsStore.selectWorkspace(workspaceId);
  }
  await loadCollaborationData();
});

async function loadCollaborationData() {
  try {
    const [votesRes, expRes, cmtRes] = await Promise.all([
      api.getVotes(workspaceId),
      api.getExpenses(workspaceId),
      api.getComments(workspaceId),
    ]);
    polls.value = votesRes.votes || [];
    expenses.value = expRes.expenses || [];
    comments.value = cmtRes.comments || [];
  } catch {}
}

async function generateInvite() {
  try {
    const res = await api.createInvite(workspaceId, 'member');
    inviteUrl.value = res.inviteUrl;
  } catch (err: any) {
    alert(err.message || 'Error generating invite link');
  }
}

function copyInvite() {
  navigator.clipboard.writeText(inviteUrl.value);
  copied.value = true;
  setTimeout(() => (copied.value = false), 2000);
}

function getPercentage(poll: VotePoll, count: number): number {
  const total = poll.options.reduce((sum, o) => sum + o.votes.length, 0);
  if (total === 0) return 0;
  return Math.round((count / total) * 100);
}

async function vote(pollId: string, optionId: string) {
  try {
    const res = await api.submitVote(pollId, optionId);
    if (res.poll) {
      const idx = polls.value.findIndex(p => p.id === pollId);
      if (idx !== -1) polls.value[idx] = res.poll;
    }
  } catch (err: any) {
    alert(err.message || 'Error recording vote');
  }
}

async function createPoll() {
  if (!newPollTitle.value || !newPollOption1.value || !newPollOption2.value) return;
  try {
    const res = await api.createVote(workspaceId, {
      title: newPollTitle.value,
      options: [newPollOption1.value, newPollOption2.value],
    });
    polls.value.unshift(res.poll);
    showNewPoll.value = false;
    newPollTitle.value = '';
    newPollOption1.value = '';
    newPollOption2.value = '';
  } catch (err: any) {
    alert(err.message || 'Error creating poll');
  }
}

async function createExpense() {
  if (!expenseTitle.value || !expenseAmount.value) return;
  try {
    const res = await api.createExpense(workspaceId, {
      title: expenseTitle.value,
      amount: Number(expenseAmount.value),
      splitUserIds: members.value.map(m => m.userId),
    });
    expenses.value.unshift(res.expense);
    showNewExpense.value = false;
    expenseTitle.value = '';
    expenseAmount.value = '';
  } catch (err: any) {
    alert(err.message || 'Error creating expense');
  }
}

async function addComment() {
  if (!newCommentText.value.trim()) return;
  try {
    const res = await api.addComment(workspaceId, newCommentText.value);
    comments.value.push(res.comment);
    newCommentText.value = '';
  } catch (err: any) {
    alert(err.message || 'Error adding comment');
  }
}
</script>
