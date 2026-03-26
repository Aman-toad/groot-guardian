var aoi = ee.Geometry.Polygon([[
  [-72.53888, 0.89335],
  [-72.53822, 0.83792],
  [-72.59882, 0.83642],
  [-72.60081, 0.88769],
  [-72.53888, 0.89335]   // close the ring
]], null, false);



var BASELINE_START = '2025-08-01';
var BASELINE_END = '2025-12-01';   // exclusive upper bound
var CURRENT_START = '2026-01-01';
var CURRENT_END = '2026-02-01';

// 3. LOAD & FILTER SENTINEL-1 GRD COLLECTION
var s1 = ee.ImageCollection('COPERNICUS/S1_GRD')
  .filterBounds(aoi)
  .filter(ee.Filter.eq('instrumentMode', 'IW'))
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
  .filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'))
  .select(['VV', 'VH']);

var s1_db = s1.select(['VV', 'VH'], ['VV_db', 'VH_db']);

// 4.5. SPECKLE FILTERING
function speckleFilter(image) {
  return image.focal_median({
    radius: 30,
    units: 'meters'
  }).copyProperties(image, image.propertyNames());
}

var s1_filtered = s1_db.map(speckleFilter);

// 5. SPLIT INTO BASELINE & CURRENT COLLECTIONS
var baselineCol = s1_filtered.filterDate(BASELINE_START, BASELINE_END);
var currentCol = s1_filtered.filterDate(CURRENT_START, CURRENT_END);

// Safety checks — print counts to Console
print('Baseline image count:', baselineCol.size());
print('Current  image count:', currentCol.size());

var baselineMedian = baselineCol.median().clip(aoi);
var currentMedian = currentCol.median().clip(aoi);

var delta = currentMedian.subtract(baselineMedian)
  .select(['VV_db', 'VH_db'], ['VV_delta', 'VH_delta'])
  .clip(aoi);

var dbVis = { min: -25, max: 0, bands: ['VV_db'] };
var deltaVis = {
  min: -5, max: 5, bands: ['VV_delta'],
  palette: ['#d7191c', '#fdae61', '#ffffff', '#a6d96a', '#1a9641']
};

Map.addLayer(baselineMedian, dbVis, 'Baseline VV (dB)');
Map.addLayer(currentMedian, dbVis, 'Current VV (dB)');
Map.addLayer(delta, deltaVis, 'Delta VV (Current - Baseline)');

var stackedImage = baselineMedian
  .addBands(currentMedian)
  .addBands(delta);

var sampledPoints = stackedImage.sample({
  region: aoi,
  scale: 30,
  numPixels: 3000,
  geometries: true,
  seed: 42,
  dropNulls: true
});

print('Sampled point count:', sampledPoints.size());
var cleanedPoints = sampledPoints.map(function (feature) {
  var geom = feature.geometry();
  var coords = geom.coordinates();
  return ee.Feature(geom, {
    lat: coords.get(1),
    lng: coords.get(0),
    VV_baseline: feature.get('VV_db'),
    VH_baseline: feature.get('VH_db'),
    VV_current: feature.get('VV_db_1'),
    VH_current: feature.get('VH_db_1'),
    VV_delta: feature.get('VV_delta'),
    VH_delta: feature.get('VH_delta')
  });
});

print('Sample feature (first):', cleanedPoints.first());

Export.table.toDrive({
  collection: cleanedPoints,
  description: 's1_deforestation_vv_vh',
  folder: 'GEE_Exports',
  fileNamePrefix: 's1_deforestation_vv_vh',
  fileFormat: 'CSV',
  selectors: ['lat', 'lng', 'VV_baseline', 'VH_baseline', 'VV_current', 'VH_current', 'VV_delta', 'VH_delta']
});

Export.table.toDrive({
  collection: cleanedPoints,
  description: 's1_deforestation_vv_vh_geojson',
  folder: 'GEE_Exports',
  fileNamePrefix: 's1_deforestation_vv_vh',
  fileFormat: 'GeoJSON'
});