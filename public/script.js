document.addEventListener('DOMContentLoaded', () => {
    let currentMapData;
    let markersLayer;
    let imageLayer = null; // Inicializa como null para evitar problemas
    let mapInitialized = false;

    const sidebar = document.getElementById('sidebar');
    const toggleSidebar = document.getElementById('toggle-sidebar');
    const mapsMenu = document.getElementById('maps-menu');
    const mapDiv = document.getElementById('map');

    toggleSidebar.onclick = () => sidebar.classList.toggle('collapsed');

    async function fetchMaps() {
        const res = await fetch('/api/maps');
        const maps = await res.json();

        mapsMenu.innerHTML = '';
        maps.forEach(map => {
            const mapItem = document.createElement('li');
            mapItem.className = 'nav-item';

            const mapItemLink = document.createElement('a');
            mapItemLink.className = 'nav-link';
            mapItemLink.textContent = map.charAt(0).toUpperCase() + map.slice(1);
            mapItemLink.href = '#';
            mapItemLink.onclick = (e) => {
                e.preventDefault();
                loadMap(map);
            };

            mapItem.appendChild(mapItemLink);
            mapsMenu.appendChild(mapItem);
        });

        await loadMap(maps[0]);
    }

    async function loadMap(mapName) {
        const response = await fetch(`/api/coordinates/${mapName}`);
        currentMapData = await response.json();

        const bounds = [[0, 0], [currentMapData.mapBounds[1][1], currentMapData.mapBounds[1][0]]];

        if (!mapInitialized) {
            // Inicializa o mapa apenas na primeira vez
            window.map = L.map('map', {
                crs: L.CRS.Simple,
                minZoom: -2,
                maxZoom: 2,
                zoomSnap: 0.5
            });

            markersLayer = L.layerGroup().addTo(window.map);
            mapInitialized = true;
        }

        // Remove a camada de imagem antiga, se existir
        if (imageLayer !== null) {
            window.map.removeLayer(imageLayer);
        }

        // Adiciona a nova imagem do mapa
        imageLayer = L.imageOverlay(`/maps/${currentMapData.mapImage}`, bounds);
        window.map.addLayer(imageLayer);
        window.map.fitBounds(bounds);

        createCategoryFilters(currentMapData.categories);
        renderMarkers();
    }

    function createCategoryFilters(categories) {
        const filtersContainer = document.getElementById('filters-container');
        filtersContainer.innerHTML = '';

        const selectAll = document.getElementById('toggle-all');
        selectAll.checked = true;

        categories.forEach(cat => {
            const div = document.createElement('div');
            div.className = 'form-check';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = cat.id;
            checkbox.checked = true;
            checkbox.className = 'form-check-input category-checkbox';
            checkbox.onchange = renderMarkers;

            const label = document.createElement('label');
            label.className = 'form-check-label';
            label.textContent = cat.name;

            div.appendChild(checkbox);
            div.appendChild(label);
            filtersContainer.appendChild(div);
        });

        selectAll.onclick = (e) => {
            document.querySelectorAll('.category-checkbox').forEach(cb => cb.checked = e.target.checked);
            renderMarkers();
        };
    }

    function renderMarkers() {
        if (markersLayer) markersLayer.clearLayers();

        const checkedCategories = Array.from(document.querySelectorAll('.category-checkbox:checked')).map(cb => cb.value);

        currentMapData.markers.forEach(marker => {
            if (checkedCategories.includes(marker.categoryId)) {
                const category = currentMapData.categories.find(c => c.id === marker.categoryId);
                const iconFile = category ? category.icon.split(':')[1] : 'default.png';

                const icon = L.icon({
                    iconUrl: `/icons/${iconFile}`,
                    iconSize: [32, 32],
                    iconAnchor: [16, 32],
                    popupAnchor: [0, -16],
                });

                L.marker([marker.position[1], marker.position[0]], { icon })
                    .bindPopup(`<b>${marker.popup.title}</b><br>${marker.popup.description}`)
                    .addTo(markersLayer);
            }
        });
    }

    fetchMaps();
});
