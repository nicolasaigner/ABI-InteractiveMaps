/*  ──────────────────────────────────────────────────────────────────────────
 *  ABI Interactive Maps – script.js (Inventário de chaves + melhorias UI)
 *  © Nícolas Aigner 2025
 *  ────────────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    /* ═════════════ VARIÁVEIS / ESTADO ═════════════ */
    let map, markersLayer, currentMap;
    let translations = {};
    const KEY_CATEGORY_ID = '3';                       // categoryId das chaves

    /* Elementos fixos já presentes no HTML */
    const languageSelector  = document.getElementById('language-selector');
    const mapTitle          = document.getElementById('map-title');
    const sidebar           = document.getElementById('sidebar');
    const toggleSidebar     = document.getElementById('toggle-sidebar');
    const toggleAllCheckbox = document.getElementById('toggle-all');
    const filtersContainer  = document.getElementById('filters-container');

    /* Elementos criados em runtime */
    let myKeysFilterCheckbox,       // filho “Minhas chaves”
        keyInventoryContainer,
        parentKeyCheckbox;          // pai “Salas com Chave”

    /* ════════ Persistência (localStorage) ════════ */
    const lastSelectedMap  = localStorage.getItem('lastSelectedMap') ?? null;
    const savedFilters     = JSON.parse(localStorage.getItem('selectedFilters') ?? '{}');
    const savedLanguage    = localStorage.getItem('selectedLanguage') || 'en';
    const userKeyInventory = JSON.parse(localStorage.getItem('userKeyInventory') ?? '{}');
    languageSelector.value = savedLanguage;

    /* ────────── UTIL / TRADUÇÃO ────────── */
    const t = (txt) => translations[txt] ?? txt;

    async function loadTranslations(lang) {
        try {
            const r = await fetch(`/api/locales/${lang}.json`);
            if (!r.ok) throw new Error('Tradução não encontrada');
            translations = await r.json();
            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.dataset.i18n;
                if (translations[key]) el.textContent = translations[key];
            });
        } catch (e) {
            console.warn('⚠️ Tradução não carregada:', e.message);
            translations = {};
        }
    }

    /* ────────── Inventário ⇄ localStorage ────────── */
    const getInventory = () => userKeyInventory[currentMap?.id] ?? [];
    const saveInventory = (inv) => {
        userKeyInventory[currentMap.id] = inv;
        localStorage.setItem('userKeyInventory', JSON.stringify(userKeyInventory));
    };

    /* ═════════════ CARREGAR LISTA DE MAPAS ═════════════ */
    async function fetchMaps() {
        await loadTranslations(languageSelector.value);
        const maps = await (await fetch('/api/maps')).json();
        if (!maps?.length) return console.error('Nenhum mapa recebido da API');

        const menu = document.getElementById('maps-menu');
        menu.innerHTML = '';
        maps.forEach(m => {
            const li = document.createElement('li'); li.className = 'nav-item';
            const a  = document.createElement('a');
            a.className = 'nav-link'; a.href = '#'; a.textContent = t(m.mapName);
            a.onclick = () => { localStorage.setItem('lastSelectedMap', m.id); loadMap(m.id); };
            li.appendChild(a); menu.appendChild(li);
        });

        const first = maps.find(m => m.id === lastSelectedMap) ?? maps[0];
        loadMap(first.id);
    }

    /* ═════════════ UI – INVENTÁRIO DE CHAVES ═════════════ */
    function buildKeyInventoryUI() {
        if (!keyInventoryContainer) {
            keyInventoryContainer = document.createElement('div');
            keyInventoryContainer.id = 'key-inventory-container';
            keyInventoryContainer.className = 'mt-3';
            sidebar.appendChild(keyInventoryContainer);
        }
        keyInventoryContainer.innerHTML = '';

        const hdr = document.createElement('h6');
        hdr.className = 'text-light mt-2';
        hdr.textContent = t('my_keys_inventory') || 'Minhas Chaves';
        keyInventoryContainer.appendChild(hdr);

        const inv = new Set(getInventory());
        currentMap.markers
            .filter(m => m.categoryId === KEY_CATEGORY_ID)
            .forEach(marker => {
                const wrap = document.createElement('div'); wrap.className = 'form-check';

                const cb = document.createElement('input');
                cb.type = 'checkbox'; cb.className = 'form-check-input';
                cb.value = marker.id; cb.checked = inv.has(marker.id);
                cb.onchange = () => {
                    const list = new Set(getInventory());
                    cb.checked ? list.add(marker.id) : list.delete(marker.id);
                    saveInventory([...list]); renderMarkers();
                };

                const label = document.createElement('label');
                label.className = 'form-check-label';
                label.textContent = t(marker.popup.title);

                wrap.append(cb, label); keyInventoryContainer.appendChild(wrap);
            });
    }

    /* ═════════════ UI – FILTROS & CHECKBOXES ═════════════ */
    function buildFiltersUI() {
        filtersContainer.innerHTML = '';
        myKeysFilterCheckbox = parentKeyCheckbox = null;

        currentMap.categories.forEach(cat => {
            const row = document.createElement('div'); row.className = 'form-check';

            const cb = document.createElement('input');
            cb.type = 'checkbox'; cb.className = 'form-check-input category-checkbox';
            cb.value = cat.id; cb.checked = savedFilters[cat.id] !== false;
            cb.onchange = () => {
                savedFilters[cat.id] = cb.checked;
                localStorage.setItem('selectedFilters', JSON.stringify(savedFilters));
                updateToggleAllState();
                renderMarkers();
            };

            const label = document.createElement('label');
            label.className = 'form-check-label';
            label.textContent = t(cat.name);

            row.append(cb, label); filtersContainer.appendChild(row);

            /* Se esta é a categoria de chaves, guarda referência */
            if (cat.id === KEY_CATEGORY_ID) parentKeyCheckbox = cb;

            /* Caixa extra “Minhas chaves” logo após a categoria 3 ------------ */
            if (cat.id === KEY_CATEGORY_ID) {
                const extra = document.createElement('div'); extra.className = 'form-check ms-3';

                myKeysFilterCheckbox = document.createElement('input');
                myKeysFilterCheckbox.type = 'checkbox'; myKeysFilterCheckbox.className = 'form-check-input';
                myKeysFilterCheckbox.id = 'filter-my-keys';
                myKeysFilterCheckbox.checked = savedFilters.myKeys ?? false;
                myKeysFilterCheckbox.onchange = () => {
                    savedFilters.myKeys = myKeysFilterCheckbox.checked;

                    /* —— regra nova: ligar filho ➜ garante pai ligado —— */
                    if (myKeysFilterCheckbox.checked && parentKeyCheckbox && !parentKeyCheckbox.checked) {
                        parentKeyCheckbox.checked = true;
                        savedFilters[KEY_CATEGORY_ID] = true;
                    }
                    localStorage.setItem('selectedFilters', JSON.stringify(savedFilters));
                    updateToggleAllState();
                    renderMarkers();
                };

                const lbl = document.createElement('label');
                lbl.className = 'form-check-label'; lbl.htmlFor = 'filter-my-keys';
                lbl.textContent = t('my_keys') || 'Minhas chaves';

                extra.append(myKeysFilterCheckbox, lbl); filtersContainer.appendChild(extra);
            }
        });

        /* “Selecionar tudo” ------------------------------------------------- */
        toggleAllCheckbox.onchange = () => {
            const on = toggleAllCheckbox.checked;
            document.querySelectorAll('.category-checkbox').forEach(cb => {
                cb.checked = on; savedFilters[cb.value] = on;
            });
            /* inclui o filho na seleção/deseleção global */
            if (myKeysFilterCheckbox) {
                myKeysFilterCheckbox.checked = on; savedFilters.myKeys = on;
            }
            localStorage.setItem('selectedFilters', JSON.stringify(savedFilters));
            renderMarkers();
        };

        updateToggleAllState();
    }

    /* ——— Mantém o checkbox “Selecionar tudo” coerente ——— */
    function updateToggleAllState() {
        const catBoxes = [...document.querySelectorAll('.category-checkbox')];
        const allOn  = catBoxes.every(cb => cb.checked);
        const allOff = catBoxes.every(cb => !cb.checked);
        toggleAllCheckbox.indeterminate = !allOn && !allOff;
        toggleAllCheckbox.checked = allOn;
    }

    /* ═════════════ RENDERIZAÇÃO DE MARCADORES ═════════════ */
    function renderMarkers() {
        if (!currentMap) return;
        markersLayer.clearLayers();

        const activeCats = Object.entries(savedFilters).filter(([, v]) => v).map(([k]) => k);
        const inv = new Set(getInventory());
        const showMyKeys = myKeysFilterCheckbox?.checked;

        currentMap.markers.forEach(marker => {
            const isKey = marker.categoryId === KEY_CATEGORY_ID;
            if (!activeCats.includes(marker.categoryId) && !(isKey && showMyKeys)) return;

            const cat = currentMap.categories.find(c => c.id === marker.categoryId);
            let iconUrl = '/icons/default.png';
            if (cat?.icon) iconUrl = '/icons/' + (cat.icon.includes(':') ? cat.icon.split(':')[1] : cat.icon);

            const icon = isKey && showMyKeys
                ? L.divIcon({
                    className: inv.has(marker.id) ? 'key-icon-owned' : 'key-icon',
                    html: `<img src="${iconUrl}" style="width:32px;height:32px;">`,
                    iconSize: [34, 34], iconAnchor: [17, 34], popupAnchor: [0, -17]
                })
                : L.icon({
                    iconUrl,
                    iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -16]
                });

            L.marker([marker.position[1], marker.position[0]], { icon })
                .bindPopup(`<strong>${t(marker.popup.title)}</strong><br>${t(marker.popup.description)}`)
                .addTo(markersLayer);
        });
    }

    /* ═════════════ LOAD MAP (JSON → Leaflet) ═════════════ */
    async function loadMap(mapName) {
        const lang = languageSelector.value;
        const response = await fetch(`/api/coordinates/${mapName}?lang=${lang}`);
        currentMap = await response.json();
        if (!currentMap?.mapBounds) return console.error('mapBounds ausentes no JSON');

        mapTitle.textContent = t(currentMap.mapName);

        const bounds = [[0, 0], [currentMap.mapBounds[1][1], currentMap.mapBounds[1][0]]];

        if (map) map.remove();
        map = L.map('map', { crs: L.CRS.Simple, minZoom: -2, maxZoom: 2 });
        L.imageOverlay(`/maps/${currentMap.mapImage}`, bounds).addTo(map);
        map.fitBounds(bounds);

        markersLayer = L.layerGroup().addTo(map);

        buildFiltersUI();
        currentMap.markers.some(m => m.categoryId === KEY_CATEGORY_ID)
            ? buildKeyInventoryUI()
            : keyInventoryContainer && (keyInventoryContainer.innerHTML = '');

        renderMarkers();
    }

    /* ═════════════ LISTENERS GERAIS ═════════════ */
    toggleSidebar.onclick = () => sidebar.classList.toggle('collapsed');
    languageSelector.onchange = () => {
        localStorage.setItem('selectedLanguage', languageSelector.value);
        fetchMaps();
    };

    /* ═════════════ STARTUP ═════════════ */
    fetchMaps();
});

/* ═════ CSS in-page para borda verde em chaves possuídas ═════ */
(() => {
    if (document.getElementById('key-icon-style')) return;
    const s = document.createElement('style'); s.id = 'key-icon-style';
    s.textContent = `
        .key-icon-owned {
            border: 2px solid #4caf50;
            border-radius: 50%;
            width: 34px; height: 34px;
            display: flex; justify-content: center; align-items: center;
        }
        .key-icon-owned img,
        .key-icon img { pointer-events: none; }
    `;
    document.head.appendChild(s);
})();
