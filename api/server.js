const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

// Define basePath para rodar localmente e no Vercel
const basePath = path.join(__dirname, '../public');

// Servindo arquivos estáticos (frontend + assets)
app.use(express.static(basePath));
app.use('/maps', express.static(path.join(basePath, 'maps')));
app.use('/icons', express.static(path.join(basePath, 'icons')));
app.use('/coordinates', express.static(path.join(basePath, 'coordinates')));

// Rotas da API
app.get('/api/maps', (_, res) => {
    res.json(['armory', 'farm', 'tv-station', 'valley']);
});

app.get('/api/coordinates/:map', (req, res) => {
    res.sendFile(path.join(basePath, `coordinates/${req.params.map}.json`));
});

// 🔥 Esta parte corrige o problema do 404 na raiz ("/")
app.get('*', (req, res) => {
    res.sendFile(path.join(basePath, 'index.html'));
});

// Configuração para rodar localmente ou no Vercel
const PORT = process.env.PORT || 3000;
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
}

// Exporta o app para Vercel
module.exports = app;
