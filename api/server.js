const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.static(path.join(__dirname, '../public')));

// 🔹 ROTA PARA SERVIR OS MAPAS DISPONÍVEIS
app.get('/api/maps', (req, res) => {
    const coordinatesPath = path.join(__dirname, '../public/coordinates');
    if (!fs.existsSync(coordinatesPath)) {
        return res.status(500).json({ error: "Diretório de mapas não encontrado" });
    }

    const files = fs.readdirSync(coordinatesPath);
    const maps = files.map(file => {
        const filePath = path.join(coordinatesPath, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return {
            id: path.basename(file, '.json'),
            mapName: data.mapName
        };
    });

    res.json(maps);
});

// 🔹 ROTA PARA SERVIR DADOS DOS MAPAS
app.get('/api/coordinates/:mapName', (req, res) => {
    const mapName = req.params.mapName;
    const lang = req.query.lang || 'en';
    const filePath = path.join(__dirname, `../public/coordinates/${mapName}.json`);
    const translationPath = path.join(__dirname, `../public/locales/${lang}.json`);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Mapa não encontrado" });
    }

    let translations = {};
    if (fs.existsSync(translationPath)) {
        translations = JSON.parse(fs.readFileSync(translationPath, 'utf8'));
    }

    let mapData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // 🔹 Traduzindo os ícones interativos
    mapData.markers.forEach(marker => {
        if (marker.popup) {
            marker.popup.title = translations[marker.popup.title] || marker.popup.title;
            marker.popup.description = translations[marker.popup.description] || marker.popup.description;
        }
    });

    res.json(mapData);
});

// 🔹 ROTA PARA SERVIR TRADUÇÕES
app.get('/api/locales/:lang.json', (req, res) => {
    const lang = req.params.lang;
    const translationPath = path.join(__dirname, `./locales/${lang}.json`);

    if (!fs.existsSync(translationPath)) {
        return res.status(404).json({ error: "Tradução não encontrada" });
    }

    res.sendFile(translationPath);
});

// 🔹 SERVIR O `index.html` PARA O FRONTEND
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 🔹 INICIA O SERVIDOR
// app.listen(PORT, () => {
//     console.log(`Servidor rodando em http://localhost:${PORT}`);
// });

// 🔹 EXPORTAÇÃO PARA O VERCEL ENTENDER
module.exports = app;
