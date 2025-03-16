const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static('public'));

// Rota para obter os mapas disponíveis
app.get('/api/maps', (req, res) => {
    const coordinatesPath = path.join(__dirname, '../public/coordinates');
    fs.readdir(coordinatesPath, (err, files) => {
        if (err) {
            res.status(500).json({ error: "Erro ao carregar os mapas" });
            return;
        }

        const maps = files.map(file => {
            const filePath = path.join(coordinatesPath, file);
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            return {
                id: path.basename(file, '.json'), // ID do mapa
                mapName: data.mapName // Nome correto do mapa
            };
        });

        res.json(maps);
    });
});


// Rota para obter os dados do mapa selecionado
app.get('/api/coordinates/:mapName', (req, res) => {
    const mapName = req.params.mapName;
    const lang = req.query.lang || 'en';
    const filePath = path.join(__dirname, `../public/coordinates/${mapName}.json`);
    const translationPath = path.join(__dirname, `../api/locales/${lang}.json`);

    if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: "Mapa não encontrado" });
        return;
    }

    let translations = {};
    if (fs.existsSync(translationPath)) {
        translations = JSON.parse(fs.readFileSync(translationPath, 'utf8'));
    }

    let mapData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    mapData.markers.forEach(marker => {
        if (marker.popup) {
            if (translations[marker.popup.title]) {
                marker.popup.title = translations[marker.popup.title];
            }
            if (translations[marker.popup.description]) {
                marker.popup.description = translations[marker.popup.description];
            }
        }
    });

    res.json(mapData);
});

// Rota para obter traduções
app.get('/api/locales/:lang.json', (req, res) => {
    const lang = req.params.lang;
    const translationPath = path.join(__dirname, `../api/locales/${lang}.json`);

    if (!fs.existsSync(translationPath)) {
        res.status(404).json({ error: "Tradução não encontrada" });
        return;
    }

    res.sendFile(translationPath);
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
