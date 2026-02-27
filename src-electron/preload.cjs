const { contextBridge, ipcRenderer } = require("electron");

function listen(channel, handler) {
  const wrapped = (_event, payload) => {
    handler({ payload });
  };
  ipcRenderer.on(channel, wrapped);
  return Promise.resolve(() => {
    ipcRenderer.removeListener(channel, wrapped);
  });
}

const tauriBridge = {
  core: {
    invoke(commandName, payload) {
      return ipcRenderer.invoke("tauri-invoke", commandName, payload || {});
    }
  },
  event: {
    listen(eventName, callback) {
      if (eventName !== "native-menu-action") {
        return Promise.resolve(() => {});
      }
      return listen(eventName, callback);
    }
  }
};

contextBridge.exposeInMainWorld("__TAURI__", tauriBridge);
