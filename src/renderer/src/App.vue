<script setup>
import Versions from './components/Versions.vue'
import { ref, computed, onMounted } from 'vue'

const ceciLogs = ref([])

const ceciLogContect = computed(() => {
  return ceciLogs.value.map((line) => line.data).join('\n')
})

const ceciLogContainer = ref(null)

onMounted(() => {
  window.electron.ipcRenderer.on('ceciOut', (event, line) => {
    ceciLogs.value.push(line)
  })
})

const startHandle = () => window.electron.ipcRenderer.send('startCeci')
const stopHandle = () => window.electron.ipcRenderer.send('stopCeci')
</script>

<template>
  <pre ref="ceciLogContainer">{{ ceciLogContect }}</pre>
  <div class="actions">
    <div class="action">
      <a target="_blank" rel="noreferrer" @click="startHandle">Start Ceci</a>
    </div>
    <div class="action">
      <a target="_blank" rel="noreferrer" @click="stopHandle">Stop Ceci</a>
    </div>
  </div>
  <Versions />
</template>
