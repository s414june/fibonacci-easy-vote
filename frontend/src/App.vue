<template>
  <main class="p-4">
    <h1 class="text-xl font-bold">匿名投票系統</h1>
    <p class="text-sm mb-4">你的代號：{{ alias }}</p>

    <div class="mb-4 space-y-2">
      <input v-model="newTopic" type="text" placeholder="新增投票項目" class="border p-1" />
      <button @click="createTopic" class="bg-blue-500 text-white px-2 py-1">建立新項目</button>

      <div>
        <label>選擇投票項目：</label>
        <select v-model="selectedTopic" class="border px-2 py-1">
          <option v-for="topic in topics" :key="topic" :value="topic">{{ topic }}</option>
        </select>
        <button @click="enterTopic" class="ml-2 bg-green-500 text-white px-2 py-1">進入投票</button>
        <button @click="refresh" class="ml-1 text-sm">🔄</button>
      </div>
    </div>

    <div v-if="currentTopic" class="mb-6">
      <h2 class="text-lg font-semibold mb-2">投票項目：{{ currentTopic }}</h2>
      <div class="space-x-2 mb-2">
        <button v-for="num in fibonacci" :key="num" @click="vote(num)" class="border px-2 py-1 hover:bg-blue-100">
          {{ num }}
        </button>
      </div>

      <ul class="mb-4">
        <li v-for="num in fibonacci" :key="num">
          {{ num }}：{{ voteData.votes?.[num] || 0 }}票
          <span v-if="voteData.voters?.[num]?.length">
            （{{ voteData.voters[num].join("、") }}）
          </span>
        </li>
      </ul>

      <div class="text-sm mb-2">
        平均值：{{ average }} （最接近 {{ nearestFib }}）
      </div>

      <canvas ref="chartRef" width="400" height="200" class="mb-2"></canvas>
      <button @click="downloadImage" class="text-sm underline">下載圖片</button>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import Chart from 'chart.js/auto';
import axiosInstance from './axios';

const fibonacci: number[] = [1, 2, 3, 5, 8, 13, 21, 34, 55];

const alias = ref<string>(localStorage.getItem('alias') || '');
const newTopic = ref<string>('');
const topics = ref<string[]>([]);
const selectedTopic = ref<string>('');
const currentTopic = ref<string>('');
const voteData = ref<{ votes: Record<number, number>; voters: Record<number, string[]> }>({ votes: {}, voters: {} });
const chartRef = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;

const average = computed<string>(() => {
  const voters = voteData.value.voters || {};
  let total = 0, count = 0;
  for (const [key, list] of Object.entries(voters)) {
    total += Number(key) * list.length;
    count += list.length;
  }
  return count ? (total / count).toFixed(2) : 'N/A';
});

const nearestFib = computed<string>(() => {
  if (average.value === 'N/A') return 'N/A';
  const avg = parseFloat(average.value);
  return fibonacci.reduce((prev, curr) =>
    Math.abs(curr - avg) < Math.abs(prev - avg) ? curr : prev
  ).toString();
});

onMounted(async () => {
  if (!alias.value) {
    const res = await axiosInstance.get('/register');
    const data: { alias: string } = res.data;
    alias.value = data.alias;
    localStorage.setItem('alias', alias.value);
  }
  await loadTopics();
});

async function loadTopics(): Promise<void> {
  const res = await axiosInstance.get('/topics');
  topics.value = res.data;
}

async function createTopic(): Promise<void> {
  if (!newTopic.value.trim()) return;
  await axiosInstance.post('/create-topic', {
    topic: newTopic.value
  });
  newTopic.value = '';
  await loadTopics();
}

async function enterTopic(): Promise<void> {
  if (!selectedTopic.value) return;
  currentTopic.value = selectedTopic.value;
  await loadVotes();
}

async function refresh(): Promise<void> {
  await loadTopics();
  if (currentTopic.value) await loadVotes();
}

async function vote(num: number): Promise<void> {
  await axiosInstance.post('/vote', {
    alias: alias.value,
    topic: currentTopic.value,
    option: num
  });
  await loadVotes();
}

async function loadVotes(): Promise<void> {
  const res = await axiosInstance.get('/votes');
  const allVotes: Record<string, { votes: Record<number, number>; voters: Record<number, string[]> }> = res.data;
  voteData.value = allVotes[currentTopic.value] || { votes: {}, voters: {} };
  await nextTick();
  updateChart();
}

function updateChart(): void {
  const ctx = chartRef.value?.getContext('2d');
  if (!ctx) return;

  const labels = fibonacci.map(String);
  const data = fibonacci.map(num => voteData.value.votes?.[num] || 0);

  const dataset = {
    label: `票數統計`,
    data,
    backgroundColor: '#60a5fa'
  };

  if (chartInstance) {
    chartInstance.data.labels = labels;
    chartInstance.data.datasets = [dataset];
    chartInstance.update();
  } else {
    chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [dataset]
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }
}

function downloadImage(): void {
  if (!chartRef.value) return;
  const link = document.createElement('a');
  link.download = `${currentTopic.value}_chart.png`;
  link.href = chartRef.value.toDataURL('image/png');
  link.click();
}
</script>

<style>
body {
  font-family: sans-serif;
}
</style>
