"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const productoApi = {
    getAll: () => electron_1.ipcRenderer.invoke('producto:getAll'),
    getById: (id) => electron_1.ipcRenderer.invoke('producto:getById', id),
    create: (data) => electron_1.ipcRenderer.invoke('producto:create', data),
    update: (id, data) => electron_1.ipcRenderer.invoke('producto:update', id, data),
    delete: (id) => electron_1.ipcRenderer.invoke('producto:delete', id),
};
electron_1.contextBridge.exposeInMainWorld('api', {
    producto: productoApi,
});
//# sourceMappingURL=index.js.map