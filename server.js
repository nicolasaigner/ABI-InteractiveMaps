const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.static(__dirname));
app.use('/maps', express.static(path.join(__dirname, 'maps')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.get('/maps', (_, res) => res.json(['armory', 'farm', 'tv-station', 'valley']));

app.get('/coordinates/:map', (req, res) => {
    res.sendFile(`${__dirname}/coordinates/${req.params.map}.json`);
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
