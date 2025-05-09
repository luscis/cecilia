import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { spawn } from 'child_process'

let window = null

function createWindow() {
  // Create the browser window.
  window = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  window.on('ready-to-show', () => {
    window.show()
  })

  window.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    window.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

const getResourcePath = () => {
  let resourcePath

  if (process.env.NODE_ENV === 'development') {
    resourcePath = join(__dirname, '..', '..', 'resources')
  } else {
    resourcePath = process.resourcesPath
  }

  return resourcePath
}

app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()
  window.on('closed', () => {
    if (ceciChild && !ceciChild.killed) {
      ceciChild.kill()
      ceciChild.removeAllListeners()
      ceciChild = null
    }
  })

  let ceciChild = null

  // IPC define
  ipcMain.on('start-ceci', (event) => {
    if (ceciChild) {
      event.reply('ceci-out', { type: 'info', data: 'already running' })
      return
    }

    var executable = join(getResourcePath(), process.platform)
    var conf = join(getResourcePath(), 'ceci.yaml')

    if (process.platform == 'win32') {
      executable = join(executable, 'openceci.exe')
    } else if (process.platform == 'darwin') {
      executable = join(executable, 'openceci')
    } else {
      console.error(`Error opening ceci: not support ${process.platform}`)
      return
    }

    ceciChild = spawn(executable, ['-conf', conf])

    ceciChild.on('close', (code) => {
      event.reply('ceci-out', { type: 'exit', data: code })
      ceciChild = null
    })

    ceciChild.stdout.on('data', (data) => {
      event.reply('ceci-out', { type: 'stdout', data: data.toString() })
    })

    ceciChild.stderr.on('data', (data) => {
      event.reply('ceci-out', { type: 'stderr', data: data.toString() })
    })
  })

  ipcMain.on('stop-ceci', (event) => {
    if (ceciChild && !ceciChild.killed) {
      ceciChild.kill()
      ceciChild = null
      event.reply('ceci-out', { type: 'info', data: 'stoped' })
    } else {
      event.reply('ceci-out', { type: 'info', data: 'no running' })
    }
  })

  ipcMain.on('open-file', async (event) => {
    try {
      const result = await dialog.showOpenDialog(window, {
        properties: ['openFile'],
        filters: [{ name: 'Text Files', extensions: ['yaml', 'json'] }]
      })

      if (!result.canceled) {
        const filePath = result.filePaths[0]
        const fileContent = await fs.readFile(filePath, 'utf-8') // Async read
        event.reply('file-opened', { filePath, fileContent })
      }
    } catch (error) {
      event.reply('file-error', error.message)
    }
  })
})

app.on('window-all-closed', () => {
  app.quit()
})
