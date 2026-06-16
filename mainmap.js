let initialZoomLevel = 10;
let initialCenter = [1588911.734653, 6026906.806230];

let measureLayer = null;
let measureSource = null;
let locationLayer = null;
let locationSource = null;

let measuringMode = false;
let measurePoints = [];

// ===============================
// MAP SETUP
// ===============================
let mapObjectInput = {
    layers: [
        new ol.layer.Tile({
            source: new ol.source.OSM()
        })
    ],
    target: 'map',
    view: new ol.View({
        center: initialCenter,
        zoom: initialZoomLevel
    })
};

var map = new ol.Map(mapObjectInput);


// ===============================
// BASIC MAP CONTROLS
// ===============================
document.getElementById('zoom-out').onclick = function () {
    var view = map.getView();
    var zoom = view.getZoom();

    view.animate({
        zoom: zoom - 1,
        duration: 400
    });
};

document.getElementById('zoom-in').onclick = function () {
    var view = map.getView();
    var zoom = view.getZoom();

    view.animate({
        zoom: zoom + 1,
        duration: 400
    });
};

document.getElementById('reset').onclick = function () {
    var view = map.getView();

    view.animate({
        zoom: initialZoomLevel,
        center: initialCenter,
        duration: 700
    });
};

document.getElementById('left').onclick = function () {
    moveMap(-100000, 0);
};

document.getElementById('right').onclick = function () {
    moveMap(100000, 0);
};

document.getElementById('up').onclick = function () {
    moveMap(0, 100000);
};

document.getElementById('down').onclick = function () {
    moveMap(0, -100000);
};

function moveMap(x, y) {
    var view = map.getView();
    var currentCenter = view.getCenter();

    view.animate({
        center: [
            currentCenter[0] + x,
            currentCenter[1] + y
        ],
        duration: 400
    });
}


// ===============================
// MEASUREMENT TOOL
// ===============================



measureSource = new ol.source.Vector();

measureLayer = new ol.layer.Vector({
    source: measureSource,
    style: new ol.style.Style({
        fill: new ol.style.Fill({
            color: 'rgba(230, 57, 70, 0.15)'
        }),
        stroke: new ol.style.Stroke({
            color: '#e63946',
            width: 3,
            lineDash: [10, 6]
        }),
        image: new ol.style.Circle({
            radius: 6,
            fill: new ol.style.Fill({
                color: '#e63946'
            }),
            stroke: new ol.style.Stroke({
                color: '#ffffff',
                width: 2
            })
        })
    })
});

map.addLayer(measureLayer);

document.getElementById('measure').onclick = function () {
    measuringMode = !measuringMode;

    this.classList.toggle('active', measuringMode);

    if (measuringMode) {
        startInteractiveMeasurement();
        showMeasureResult('Click on the map to start drawing. Double-click to finish.');
        map.getTargetElement().style.cursor = 'crosshair';
    } else {
        stopInteractiveMeasurement();
        hideMeasureResult();
        map.getTargetElement().style.cursor = '';
    }
};

function startInteractiveMeasurement() {
    measureSource.clear();

    drawInteraction = new ol.interaction.Draw({
        source: measureSource,
        type: 'LineString',
        style: new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: '#e63946',
                width: 3,
                lineDash: [10, 6]
            }),
            image: new ol.style.Circle({
                radius: 7,
                fill: new ol.style.Fill({
                    color: '#e63946'
                }),
                stroke: new ol.style.Stroke({
                    color: '#ffffff',
                    width: 3
                })
            })
        })
    });

    map.addInteraction(drawInteraction);

    drawInteraction.on('drawstart', function (event) {
        sketch = event.feature;

        listener = sketch.getGeometry().on('change', function (event) {
            let geometry = event.target;
            let distance = calculateLineDistance(geometry);
            let formattedDistance = formatDistance(distance);

            showMeasureResult(
                '<i class="fa-solid fa-ruler"></i> Distance: ' + formattedDistance
            );
        });
    });

    drawInteraction.on('drawend', function () {
        stopInteractiveMeasurement();

        document.getElementById('measure').classList.remove('active');
        map.getTargetElement().style.cursor = '';

        sketch = null;

        if (listener) {
            ol.Observable.unByKey(listener);
            listener = null;
        }
    });
}

function stopInteractiveMeasurement() {
    if (drawInteraction) {
        map.removeInteraction(drawInteraction);
        drawInteraction = null;
    }

    measuringMode = false;
}

function calculateLineDistance(lineGeometry) {
    let coordinates = lineGeometry.getCoordinates();
    let sphere = new ol.Sphere(6378137);
    let totalDistance = 0;

    for (let i = 0; i < coordinates.length - 1; i++) {
        let coord1 = ol.proj.transform(
            coordinates[i],
            'EPSG:3857',
            'EPSG:4326'
        );

        let coord2 = ol.proj.transform(
            coordinates[i + 1],
            'EPSG:3857',
            'EPSG:4326'
        );

        totalDistance += sphere.haversineDistance(coord1, coord2);
    }

    return totalDistance;
}

function formatDistance(distance) {
    if (distance >= 1000) {
        return (distance / 1000).toFixed(2) + ' km';
    }

    return Math.round(distance) + ' m';
}

function showMeasureResult(message) {
    let resultEl = document.getElementById('measure-result');
    resultEl.innerHTML = message;
    resultEl.style.display = 'block';
}

function hideMeasureResult() {
    let resultEl = document.getElementById('measure-result');
    resultEl.innerHTML = '';
    resultEl.style.display = 'none';
}

// ===============================
// LOCATION TOOL
// ===============================
document.getElementById('Button_locate').onclick = function () {
    const locateButton = document.getElementById('Button_locate');

    locateButton.classList.add('locating');

    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.');
        locateButton.classList.remove('locating');
        return;
    }

    navigator.geolocation.getCurrentPosition(
        function (position) {
            const longitude = position.coords.longitude;
            const latitude = position.coords.latitude;
            const accuracy = position.coords.accuracy;

            const coords = ol.proj.fromLonLat([longitude, latitude]);

            map.getView().animate({
                center: coords,
                zoom: 17,
                duration: 900
            });

            addLocationMarker(coords, accuracy);

            locateButton.classList.remove('locating');
        },
        function () {
            alert('Location not available. Please allow location access.');
            locateButton.classList.remove('locating');
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
};

function addLocationMarker(coords, accuracy) {
    if (locationLayer) {
        map.removeLayer(locationLayer);
    }

    locationSource = new ol.source.Vector();

    const accuracyCircle = new ol.Feature({
        geometry: new ol.geom.Circle(coords, accuracy)
    });

    accuracyCircle.setStyle(new ol.style.Style({
        fill: new ol.style.Fill({
            color: 'rgba(51, 136, 255, 0.15)'
        }),
        stroke: new ol.style.Stroke({
            color: 'rgba(51, 136, 255, 0.35)',
            width: 2
        })
    }));

    const marker = new ol.Feature({
        geometry: new ol.geom.Point(coords)
    });

    marker.setStyle([
        new ol.style.Style({
            image: new ol.style.Circle({
                radius: 13,
                fill: new ol.style.Fill({
                    color: 'rgba(51, 136, 255, 0.25)'
                })
            })
        }),
        new ol.style.Style({
            image: new ol.style.Circle({
                radius: 8,
                fill: new ol.style.Fill({
                    color: '#3388ff'
                }),
                stroke: new ol.style.Stroke({
                    color: '#ffffff',
                    width: 3
                })
            })
        })
    ]);

    locationSource.addFeature(accuracyCircle);
    locationSource.addFeature(marker);

    locationLayer = new ol.layer.Vector({
        source: locationSource
    });

    map.addLayer(locationLayer);
}