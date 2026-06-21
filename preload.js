const { contextBridge, ipcRenderer } = require('electron');

const chrono = require('chrono-node');

contextBridge.exposeInMainWorld('electronAPI', {
  parseDate: (text) => {
    const parsed = chrono.parse(text);
    if (!parsed || parsed.length === 0) return null;
    
    const result = parsed[0].start;
    const dateObj = result.date();
    if (!dateObj) return null;
    
    // Format to YYYY-MM-DD
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    let str = `${yyyy}-${mm}-${dd}`;
    
    // If hour was explicitly mentioned, add time
    if (result.isCertain('hour')) {
      const hh = String(dateObj.getHours()).padStart(2, '0');
      const min = String(dateObj.getMinutes()).padStart(2, '0');
      str += ` ${hh}:${min}`;
    }
    
    return str;
  },
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveFile: (data) => ipcRenderer.invoke('dialog:saveFile', data),
  importMarkdown: () => ipcRenderer.invoke('dialog:importMarkdown'),
  exportMarkdown: (data) => ipcRenderer.invoke('dialog:exportMarkdown', data),
  quitApp: () => ipcRenderer.send('app:quit')
});
