<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const logs = ref([])
const logContent = ref(null)

const start = () => window.ipcRenderer.send('start-ceci')
const stop = () => window.ipcRenderer.send('stop-ceci')

onMounted(() => {
  window.ipcRenderer.on('ceci-out', (event, line) => {
    logs.value.push(line)
    logContent.value = logs.value.map((line) => line.data).join('\n')
  })
})
onUnmounted(() => {
  window.ipcRenderer.removeAllListeners('ceci-out')
})
</script>

<template>
  <el-row>
    <el-button @click="start">Start Ceci</el-button>
    <el-button @click="stop">Stop Ceci</el-button>
  </el-row>
  <el-input v-model="logContent" type="textarea" :autosize="{ maxRows: 8 }" />
</template>
