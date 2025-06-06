
const map = L.map('map').setView([41.385, 2.17], 11);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
}).addTo(map);

let layers = {
    linies_origen: null,
    linies_desti: null,
    punts_origen: null,
    punts_desti: null,
    parades_desti: null,
    shapes_retallats: []
};

const colorPalette = ['red', 'blue', 'green', 'orange', 'purple', 'brown', 'black', 'pink'];
const idColorMap = {};
let colorIndex = 0;

function getColorForID(id) {
    if (!idColorMap[id]) {
        idColorMap[id] = colorPalette[colorIndex % colorPalette.length];
        colorIndex++;
    }
    return idColorMap[id];
}

function styleLine(color, dashed = false) {
    return {
        color: color,
        weight: 3,
        opacity: 1,
        dashArray: dashed ? '5, 5' : null
    };
}

function stylePoint(color, big = false) {
    return {
        radius: big ? 8 : 4,
        fillColor: color,
        color: 'black',
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    };
}

function addGeoJSONLayer(url, options = {}, onEachFeature = null) {
    return fetch(url).then(res => res.json()).then(data => {
        return L.geoJSON(data, {
            ...options,
            onEachFeature: onEachFeature
        });
    });
}

function loadAllLayers() {
    Promise.all([
        addGeoJSONLayer('linies_origen.json'),
        addGeoJSONLayer('linies_desti.json'),
        addGeoJSONLayer('punts_origen.json'),
        addGeoJSONLayer('punts_desti.json'),
        addGeoJSONLayer('parades_desti.json'),
        fetch('shapes_retallats.geojson').then(res => res.json())
    ]).then(([liniesO, liniesD, puntsO, puntsD, paradesD, shapesData]) => {
        layers.linies_origen = liniesO;
        layers.linies_desti = liniesD;
        layers.punts_origen = puntsO;
        layers.punts_desti = puntsD;
        layers.parades_desti = paradesD;

        // Preprocess shapes: expand one feature into multiple by ID
        layers.shapes_retallats = [];
        shapesData.features.forEach(feature => {
            const ids = feature.properties.ids.split(',').map(id => parseInt(id.trim()));
            ids.forEach(id => {
                const newFeature = JSON.parse(JSON.stringify(feature)); // deep copy
                newFeature.properties.ID = id;
                layers.shapes_retallats.push(newFeature);
            });
        });

        updateMap();
    });
}

function clearMapLayers() {
    map.eachLayer(layer => {
        if (layer instanceof L.GeoJSON || layer instanceof L.CircleMarker || layer instanceof L.Polyline) {
            map.removeLayer(layer);
        }
    });
}

function updateMap() {
    clearMapLayers();

    // Always re-add base tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
    }).addTo(map);

    const selectedIDs = Array.from(document.getElementById('id-selector').selectedOptions).map(opt => parseInt(opt.value));
    const idSet = new Set(selectedIDs);

    document.getElementById('warning').innerText = '';

    function filterAndStyle(layer, dashed = false, bigPoints = false) {
        return L.geoJSON(layer.toGeoJSON().features.filter(f => idSet.has(f.properties.ID)), {
            pointToLayer: function (feature, latlng) {
                const color = getColorForID(feature.properties.ID);
                return L.circleMarker(latlng, stylePoint(color, bigPoints));
            },
            style: function (feature) {
                const color = getColorForID(feature.properties.ID);
                return styleLine(color, dashed);
            }
        }).addTo(map);
    }

    if (layers.linies_origen) filterAndStyle(layers.linies_origen, true);
    if (layers.linies_desti) filterAndStyle(layers.linies_desti, true);
    if (layers.punts_origen) filterAndStyle(layers.punts_origen, false);
    if (layers.punts_desti) filterAndStyle(layers.punts_desti, false);
    if (layers.parades_desti) filterAndStyle(layers.parades_desti, false, true);

    // SHAPES amb múltiples IDs
    const shapesGroup = L.geoJSON(layers.shapes_retallats.filter(f => idSet.has(f.properties.ID)), {
        style: function (feature) {
            const color = getColorForID(feature.properties.ID);
            return { color: color, weight: 2 };
        },
        onEachFeature: function (feature, layer) {
            let popupContent = '';
            for (const key in feature.properties) {
                popupContent += `<strong>${key}</strong>: ${feature.properties[key]}<br>`;
            }
            layer.bindPopup(popupContent);
        }
    }).addTo(map);

    // WARNING per IDs sense shape
    const shapeIDs = new Set(layers.shapes_retallats.map(f => f.properties.ID));
    const missing = selectedIDs.filter(id => !shapeIDs.has(id));
    if (missing.length > 0) {
        document.getElementById('warning').innerText = `⚠️ ID sense shape: ${missing.join(', ')}`;
    }
}

function populateSelector() {
    const selector = document.getElementById('id-selector');
    for (let i = 2; i <= 400; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `ID ${i}`;
        selector.appendChild(option);
    }
    selector.addEventListener('change', updateMap);
}

populateSelector();
loadAllLayers();
