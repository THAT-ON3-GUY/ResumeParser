import { contextBridge, ipcRenderer, webUtils } from 'electron'



contextBridge.exposeInMainWorld('electron', {

  webUtils: {

    getPathForFile: (file) => webUtils.getPathForFile(file)

  },

  readResume: (filePath) => ipcRenderer.invoke('resume:read', filePath),

  parseResume: (filePath) => ipcRenderer.invoke('resume:parse', filePath),

  runSearch: (candidateId) => ipcRenderer.invoke('search:run', candidateId),

  getAllCandidates: () => ipcRenderer.invoke('db:get-all'),

  deleteCandidate: (id) => ipcRenderer.invoke('db:delete', id),

  clearAllCandidates: () => ipcRenderer.invoke('db:clear-all'),

  getSettings: () => ipcRenderer.invoke('settings:get'),

  setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),

  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),

  connectLinkedIn: () => ipcRenderer.invoke('linkedin:login'),

  getLinkedInStatus: () => ipcRenderer.invoke('linkedin:status'),

  disconnectLinkedIn: () => ipcRenderer.invoke('linkedin:disconnect'),

  onLinkedInConnected: (callback) => {

    const handler = (_event, payload) => callback(payload)

    ipcRenderer.on('linkedin:connected', handler)

    return () => ipcRenderer.removeListener('linkedin:connected', handler)

  },

  onLinkedInSessionExpired: (callback) => {

    const handler = (_event, payload) => callback(payload)

    ipcRenderer.on('linkedin:session-expired', handler)

    return () => ipcRenderer.removeListener('linkedin:session-expired', handler)

  }

})

