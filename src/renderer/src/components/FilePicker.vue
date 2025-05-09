<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const filePath = ref('')
const fileContent = ref('')
const error = ref('')

const openFile = () => window.ipcRenderer.send('open-file')

onMounted(() => {
  window.ipcRenderer.on('file-opened', (event, { filePath: path, fileContent: content }) => {
    filePath.value = path
    fileContent.value = content
  })
  window.ipcRenderer.on('file-error', (event, message) => {
    error.value = message
  })
})

onUnmounted(() => {
  window.ipcRenderer.removeAllListeners('file-opened')
  window.ipcRenderer.removeAllListeners('file-error')
})
</script>

<template>
  <el-button @click="openFile">Open File</el-button>
  <p v-if="filePath">{{ filePath }}</p>
  <el-input v-model="fileContent" type="textarea" :autosize="{ minRows: 13 }" />
  <p v-if="error">Error: {{ error }}</p>
</template>
