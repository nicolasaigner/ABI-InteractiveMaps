document.addEventListener('DOMContentLoaded', () => {
    let map, markersLayer, currentMap, translations = {};
    const languageSelector = document.getElementById('language-selector');
    const mapTitle = document.getElementById('map-title');
    const sidebar = document.getElementById('sidebar');
    const toggleSidebar = document.getElementById('toggle-sidebar');
    const toggleAllCheckbox = document.getElementById('toggle-all');

    // 🔹 Recuperar o estado salvo no localStorage
    let lastSelectedMap = localStorage.getItem('lastSelectedMap') || null;
    let savedFilters = JSON.parse(localStorage.getItem('selectedFilters')) || {};
    let savedLanguage = localStorage.getItem('selectedLanguage') || 'en'; // 🔹 Salva o idioma

    languageSelector.value = savedLanguage; // 🔹 Define o idioma salvo no dropdown

    async function loadTranslations(lang) {
        try {
            const response = await fetch(`/api/locales/${lang}.json`);
            if (!response.ok) throw new Error("Tradução não encontrada");
            translations = await response.json();

            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.dataset.i18n;
                if (translations[key]) el.textContent = translations[key];
            });

            if (translations['map-title']) {
                mapTitle.textContent = translations['map-title'];
            }
        } catch (error) {
            console.error("Erro ao carregar tradução:", error);
        }
    }

    async function fetchMaps() {
        const lang = languageSelector.value;
        await loadTranslations(lang);

        const response = await fetch(`/api/maps?lang=${lang}`);
        const maps = await response.json();

        if (!maps || maps.length === 0) {
            console.error("Nenhum mapa encontrado na API.");
            return;
        }

        console.log("Mapas recebidos da API:", maps);

        const mapsMenu = document.getElementById('maps-menu');
        mapsMenu.innerHTML = '';

        maps.forEach(map => {
            if (!map.id || !map.mapName) {
                console.error("Erro: mapa sem ID ou mapName válido:", map);
                return;
            }

            const navItem = document.createElement('li');
            navItem.className = 'nav-item';

            const navLink = document.createElement('a');
            navLink.className = 'nav-link';
            navLink.href = '#';
            navLink.textContent = translations[map.mapName] || map.mapName;
            navLink.addEventListener('click', () => {
                localStorage.setItem('lastSelectedMap', map.id); // 🔹 Salvar último mapa acessado
                loadMap(map.id);
            });

            navItem.appendChild(navLink);
            mapsMenu.appendChild(navItem);
        });

        // 🔹 Se havia um mapa salvo, carregá-lo
        if (lastSelectedMap && maps.some(m => m.id === lastSelectedMap)) {
            await loadMap(lastSelectedMap);
        } else if (maps[0]?.id) {
            await loadMap(maps[0].id);
        } else {
            console.error("Erro: Nenhum mapa possui ID válido.");
        }
    }

    async function loadMap(mapName) {
        if (!mapName) {
            console.error("Erro: Nome do mapa indefinido.");
            return;
        }

        console.log(`Carregando mapa: ${mapName}`);

        const lang = languageSelector.value;
        const response = await fetch(`/api/coordinates/${mapName}?lang=${lang}`);
        currentMap = await response.json();

        if (!currentMap || !currentMap.mapBounds) {
            console.error("Erro: Dados do mapa não carregados corretamente.");
            return;
        }

        mapTitle.textContent = translations[currentMap.mapName] || currentMap.mapName;

        const bounds = [[0, 0], [currentMap.mapBounds[1][1], currentMap.mapBounds[1][0]]];

        if (map) map.remove();

        map = L.map('map', { crs: L.CRS.Simple, minZoom: -2, maxZoom: 2 });

        L.imageOverlay(`/maps/${currentMap.mapImage}`, bounds).addTo(map);
        map.fitBounds(bounds);

        markersLayer = L.layerGroup().addTo(map);

        createCategoryFilters(currentMap.categories);
        renderMarkers();
    }

    function createCategoryFilters(categories) {
        if (!categories || categories.length === 0) {
            console.warn("Nenhuma categoria encontrada para exibição de filtros.");
            return;
        }

        const filtersContainer = document.getElementById('filters-container');
        filtersContainer.innerHTML = '';

        categories.forEach(cat => {
            const div = document.createElement('div');
            div.className = 'form-check';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'form-check-input category-checkbox';
            checkbox.value = cat.id;
            checkbox.checked = savedFilters[cat.id] !== false; // 🔹 Recupera o estado do filtro
            checkbox.addEventListener('change', () => {
                savedFilters[cat.id] = checkbox.checked;
                localStorage.setItem('selectedFilters', JSON.stringify(savedFilters)); // 🔹 Salva os filtros
                renderMarkers();
            });

            const label = document.createElement('label');
            label.className = 'form-check-label';
            label.textContent = translations[cat.name] || cat.name;

            div.appendChild(checkbox);
            div.appendChild(label);
            filtersContainer.appendChild(div);
        });

        toggleAllCheckbox.addEventListener('change', () => {
            const checked = toggleAllCheckbox.checked;
            document.querySelectorAll('.category-checkbox').forEach(cb => {
                cb.checked = checked;
                savedFilters[cb.value] = checked;
            });
            localStorage.setItem('selectedFilters', JSON.stringify(savedFilters));
            renderMarkers();
        });
    }

    function renderMarkers() {
        if (!markersLayer) {
            console.error("Erro: markersLayer não foi inicializado.");
            return;
        }

        markersLayer.clearLayers();

        const checkedCategories = Array.from(document.querySelectorAll('.category-checkbox:checked')).map(cb => cb.value);

        if (!currentMap.markers || currentMap.markers.length === 0) {
            console.warn("Nenhum marcador disponível para renderizar.");
            return;
        }

        currentMap.markers.forEach(marker => {
            if (checkedCategories.includes(marker.categoryId)) {
                const category = currentMap.categories.find(cat => cat.id === marker.categoryId);
                const iconFile = category ? category.icon.split(':')[1] : 'default.png';

                const customIcon = L.icon({
                    iconUrl: `/icons/${iconFile}`,
                    iconSize: [32, 32],
                    iconAnchor: [16, 32],
                    popupAnchor: [0, -16]
                });

                const translatedTitle = translations[marker.popup.title] || marker.popup.title;
                const translatedDescription = translations[marker.popup.description] || marker.popup.description;

                L.marker([marker.position[1], marker.position[0]], { icon: customIcon })
                    .bindPopup(`<strong>${translatedTitle}</strong><br>${translatedDescription}`)
                    .addTo(markersLayer);
            }
        });
    }

    toggleSidebar.onclick = () => {
        sidebar.classList.toggle('collapsed');
    };

    // 🔹 Salvar idioma ao mudar
    languageSelector.addEventListener('change', () => {
        localStorage.setItem('selectedLanguage', languageSelector.value);
        fetchMaps();
    });

    fetchMaps();
});
