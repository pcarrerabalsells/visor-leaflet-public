const map = L.map('map').setView([41.3851, 2.1734], 10);

// Capa base
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data © <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
    maxZoom: 18,
}).addTo(map);

// Colormap per ID
const idColors = {};
const colors = ['red', 'blue', 'green', 'orange', 'purple', 'brown', 'teal', 'maroon', 'navy', 'lime'];
function getColorForID(id) {
    if (!idColors[id]) {
        idColors[id] = colors[Object.keys(idColors).length % colors.length];
    }
    return idColors[id];
}

// Funció genèrica de popup i mouseover
function attachPopupAndEvents(feature, layer) {
    let popupContent = '';
    for (const key in feature.properties) {
        popupContent += `<strong>${key}</strong>: ${feature.properties[key]}<br>`;
    }
    layer.bindPopup(popupContent);
    layer.on('mouseover', function () {
        this.openPopup();
    });
    layer.on('mouseout', function () {
        this.closePopup();
    });
}

// Funcions d'estil
function styleLine(color, dashed = false) {
    return {
        color: color,
        weight: 3,
        opacity: 0.8,
        dashArray: dashed ? '5, 5' : null
    };
}
function stylePoint(color, big = false) {
    return {
        radius: big ? 8 : 4,
        fillColor: color,
        color: '#000',
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    };
}

const layers = {
    shapes: null,
    linies_origen: null,
    linies_desti: null,
    punts_origen: null,
    punts_desti: null,
    parades_desti: null,
};

let selectedIDs = ['1'];
const allIDs = new Set();

// Carrega fitxers i prepara selector
Promise.all([
    fetch('shapes_retallats.geojson').then(res => res.json()),
    fetch('linies_origen.json').then(res => res.json()),
    fetch('linies_desti.json').then(res => res.json()),
    fetch('punts_origen.json').then(res => res.json()),
    fetch('punts_desti.json').then(res => res.json()),
    fetch('parades_desti.json').then(res => res.json()),
]).then(([shapes, linies_origen, linies_desti, punts_origen, punts_desti, parades_desti]) => {
    [linies_origen, linies_desti, punts_origen, punts_desti, parades_desti].forEach(dataset => {
        dataset.features.forEach(f => allIDs.add(String(f.properties.ID)));
    });

    const selector = document.getElementById('idSelector');
    [...allIDs].sort((a,b) => +a - +b).forEach(id => {
        const option = document.createElement('option');
        option.value = id;
        option.text = id;
        if (id === '1') option.selected = true;
        selector.appendChild(option);
    });

    selector.addEventListener('change', () => {
        selectedIDs = [...selector.selectedOptions].map(opt => opt.value);
        updateMap();
    });

    updateMap();

    function updateMap() {
        Object.values(layers).forEach(layer => { if (layer) map.removeLayer(layer); });

        layers.shapes = L.geoJSON(shapes, {
            filter: f => {
                if (!f.properties.ids) return false;
                const idsArray = String(f.properties.ids).split(',').map(x => x.trim());
                return selectedIDs.some(id => idsArray.includes(id));
            },
            style: function(feature) {
                const idsArray = String(feature.properties.ids).split(',').map(x => x.trim());
                const matchedID = selectedIDs.find(id => idsArray.includes(id));
                return {
                    color: getColorForID(matchedID || 'default'),
                    weight: 4
                };
            },
            onEachFeature: attachPopupAndEvents
        }).addTo(map);

        selectedIDs.forEach(id => {
            const matched = shapes.features.some(f => {
                const idsArray = String(f.properties.ids).split(',').map(x => x.trim());
                return idsArray.includes(id);
            });
            if (!matched) {
                alert(`⚠️ L'ID ${id} no té cap shape vinculat.`);
            }
        });

        layers.linies_origen = L.geoJSON(linies_origen, {
            filter: f => selectedIDs.includes(String(f.properties.ID)),
            style: f => styleLine(getColorForID(String(f.properties.ID)), true),
            onEachFeature: attachPopupAndEvents
        }).addTo(map);

        layers.linies_desti = L.geoJSON(linies_desti, {
            filter: f => selectedIDs.includes(String(f.properties.ID)),
            style: f => styleLine(getColorForID(String(f.properties.ID)), true),
            onEachFeature: attachPopupAndEvents
        }).addTo(map);

        layers.punts_origen = L.geoJSON(punts_origen, {
            filter: f => selectedIDs.includes(String(f.properties.ID)),
            pointToLayer: (f, latlng) => L.circleMarker(latlng, stylePoint(getColorForID(String(f.properties.ID)))),
            onEachFeature: attachPopupAndEvents
        }).addTo(map);

        layers.punts_desti = L.geoJSON(punts_desti, {
            filter: f => selectedIDs.includes(String(f.properties.ID)),
            pointToLayer: (f, latlng) => L.circleMarker(latlng, stylePoint(getColorForID(String(f.properties.ID)))),
            onEachFeature: attachPopupAndEvents
        }).addTo(map);

        layers.parades_desti = L.geoJSON(parades_desti, {
            filter: f => selectedIDs.includes(String(f.properties.ID)),
            pointToLayer: (f, latlng) => L.circleMarker(latlng, stylePoint(getColorForID(String(f.properties.ID)), true)),
            onEachFeature: attachPopupAndEvents
        }).addTo(map);
    }
});
