
L.geoJSON(data, {
    style: function (feature) {
        return { color: 'red' }
onEachFeature: function (feature, layer) {
    let popupContent = '';
    for (const key in feature.properties) {
        popupContent += `<strong>${key}</strong>: ${feature.properties[key]}<br>`;
    }
    layer.bindPopup(popupContent);
},
;
    },
});
