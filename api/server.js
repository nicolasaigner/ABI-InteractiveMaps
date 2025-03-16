const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());

const coordinatesPath = path.join(__dirname, '../public/coordinates');
const localesPath = path.join(__dirname, './locales'); // Agora correto dentro de api/

// Servir arquivos JSON de traduções
app.use('/api/locales', express.static(localesPath));

// Função para carregar traduções
function loadTranslations(lang) {
    const filePath = path.join(localesPath, `${lang}.json`);
    if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
    return {}; // Retorna vazio se não houver tradução
}

// Rota para obter os mapas com nomes traduzidos
app.get('/api/maps', (req, res) => {
    const lang = req.query.lang || 'pt-br';

    fs.readdir(coordinatesPath, (err, files) => {
        if (err) return res.status(500).json({ error: "Erro ao ler mapas." });

        const translations = loadTranslations(lang);
        let maps = [];

        files.forEach(file => {
            if (file.endsWith('.json')) {
                const filePath = path.join(coordinatesPath, file);
                const mapData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                const translatedName = translations[mapData.mapName] || mapData.mapName; // Traduz nome do mapa
                maps.push({ id: path.basename(file, '.json'), name: translatedName });
            }
        });

        res.json(maps);
    });
});

// Endpoint para carregar coordenadas traduzidas
app.get('/api/coordinates/:map', (req, res) => {
    const { map } = req.params;
    const lang = req.query.lang || 'pt-br';
    const translations = loadTranslations(lang);

    const filePath = path.join(coordinatesPath, `${map}.json`);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Mapa não encontrado." });

    let mapData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // Traduz categorias
    if (mapData.categories) {
        mapData.categories.forEach(category => {
            if (translations[category.name]) {
                category.name = translations[category.name];
            }
        });
    }

    // Traduz títulos e descrições dos popups
    if (mapData.markers) {
        mapData.markers.forEach(marker => {
            if (translations[marker.popup.title]) {
                marker.popup.title = translations[marker.popup.title];
            }
            if (marker.popup.description && translations[marker.popup.description]) {
                marker.popup.description = translations[marker.popup.description];
            }
        });
    }

    res.json(mapData);
});

// Servindo arquivos estáticos da pasta public/
app.use(express.static(path.join(__dirname, '../public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
