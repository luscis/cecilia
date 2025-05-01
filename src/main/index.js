import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { spawn } from 'child_process'

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
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

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
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

let ceciChild = null
let window = null

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  window = createWindow()
  window.on('closed', () => {
    if (ceciChild && !ceciChild.killed) {
      ceciChild.kill()
      ceciChild.removeAllListeners()
      ceciChild = null
    }
  })

  // IPC define
  const ceciOut = (data) => {
    if (window && !window.isDestroyed()) {
      window.webContents.send('ceciOut', data)
    }
  }

  ipcMain.on('startCeci', () => {
    if (ceciChild) {
      window.webContents.send('ceciOut', { type: 'info', data: 'already running' })
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

    ceciChild = spawn(executable, ['-conf', conf], { shell: true })

    ceciChild.on('close', (code) => {
      console.log(`exit: ${code}`)
      ceciOut({ type: 'exit', data: code })
    })

    ceciChild.stdout.on('data', (data) => {
      var line = data.toString()
      console.log(line)
      ceciOut({ type: 'stdout', data: line })
    })

    ceciChild.stderr.on('data', (data) => {
      var line = data.toString()
      console.log(line)
      ceciOut({ type: 'stderr', data: line })
    })
  })

  ipcMain.on('stopCeci', () => {
    if (ceciChild && !ceciChild.killed) {
      ceciChild.kill()
      ceciOut({ type: 'info', data: 'exit' })
      ceciChild = null
    } else {
      ceciOut({ type: 'info', data: 'no running' })
    }
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
