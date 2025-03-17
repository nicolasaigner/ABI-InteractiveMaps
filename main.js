import { app, BrowserWindow, Menu } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import Store from 'electron-store';
import { startServer } from './api/server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const store = new Store();
let mainWindow;
let serverInstance;

// 🔹 Impedir múltiplas instâncias do Electron
if (!app.requestSingleInstanceLock()) {
    app.quit();
    process.exit(0);
}

async function createWindow() {
    // 🔹 Recupera o estado da última sessão
    const windowState = store.get('windowState', {
        width: 1280,
        height: 720,
        x: 100,
        y: 100,
        isMaximized: false
    });

    console.log("🔹 Criando janela Electron...");
    mainWindow = new BrowserWindow({
        width: windowState.width,
        height: windowState.height,
        x: windowState.x,
        y: windowState.y,
        show: false,
        webPreferences: { nodeIntegration: false }
    });

    mainWindow.once('ready-to-show', () => {
        console.log("✅ Janela pronta, exibindo...");
        mainWindow.show();
        if (windowState.isMaximized) {
            mainWindow.maximize();
        }
        mainWindow.focus();
    });

    console.log("🔹 Carregando http://localhost:4000");
    mainWindow.loadURL('http://localhost:4000').catch((err) => {
        console.error("❌ Erro ao carregar página:", err);
        mainWindow.loadURL(`file://${__dirname}/public/index.html`);
    });

    // 🔹 Salvar posição, tamanho e estado da janela ao fechar ou mover
    mainWindow.on('resize', () => {
        if (!mainWindow.isMaximized()) {
            store.set('windowState', mainWindow.getBounds());
        }
    });

    mainWindow.on('move', () => {
        if (!mainWindow.isMaximized()) {
            store.set('windowState', mainWindow.getBounds());
        }
    });

    mainWindow.on('maximize', () => {
        store.set('windowState', { ...store.get('windowState'), isMaximized: true });
    });

    mainWindow.on('unmaximize', () => {
        store.set('windowState', { ...store.get('windowState'), isMaximized: false });
    });

    // 🔹 Minimizar corretamente para a barra de tarefas
    mainWindow.on('minimize', (event) => {
        event.preventDefault();
        mainWindow.minimize();
    });

    // 🔹 Fecha completamente o aplicativo ao fechar a janela
    mainWindow.on('close', () => {
        console.log("🛑 Fechando aplicativo...");
        quitApp();
    });
}

// 🔹 Função para encerrar o app e o servidor
function quitApp() {
    console.log("🛑 Encerrando aplicativo...");
    if (serverInstance) {
        console.log("🛑 Encerrando servidor...");
        serverInstance.close(() => {
            console.log("✅ Servidor encerrado.");
            app.quit();
        });
    } else {
        app.quit();
    }
}

// 🔹 Iniciar servidor antes de abrir a UI
app.whenReady().then(async () => {
    serverInstance = await startServer();
    createWindow();
});

// 🔹 Garante que o servidor fecha ao sair do Electron
app.on('before-quit', quitApp);
