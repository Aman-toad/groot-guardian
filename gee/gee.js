// ============================================================
// Sentinel-1 SAR Change Detection — VV + VH Combined
// Region: Colombian Amazon (~0.86°N, 72.57°W)
// Author: GEE Production Script
// ============================================================
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// 1. REGION OF INTEREST
//    Input coords are (lat, lon); GEE requires (lon, lat)
var aoi = ee.Geometry.Polygon([[
  [-72.53888, 0.89335],
  [-72.53822, 0.83792],
  [-72.59882, 0.83642],
  [-72.60081, 0.88769],
  [-72.53888, 0.89335]   // close the ring
]], null, false);



// ─────────────────────────────────────────────
// 2. TIME WINDOWS
//    Note: November has 30 days; "2025-11-31" is
//    invalid — using "2025-12-01" as baseline end.
// ─────────────────────────────────────────────
var BASELINE_START = '2025-08-01';
var BASELINE_END = '2025-12-01';   // exclusive upper bound
var CURRENT_START = '2026-01-01';
var CURRENT_END = '2026-02-01';

// ─────────────────────────────────────────────
// 3. LOAD & FILTER SENTINEL-1 GRD COLLECTION
// ─────────────────────────────────────────────
var s1 = ee.ImageCollection('COPERNICUS/S1_GRD')
  .filterBounds(aoi)
  .filter(ee.Filter.eq('instrumentMode', 'IW'))
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
  .filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'))
  .select(['VV', 'VH']);

// ─────────────────────────────────────────────
// 4. PREPARE dB BANDS
//    Note: COPERNICUS/S1_GRD is ALREADY in dB.
//    We just rename VV and VH to VV_db and VH_db.
// ─────────────────────────────────────────────
var s1_db = s1.select(['VV', 'VH'], ['VV_db', 'VH_db']);

// ─────────────────────────────────────────────
// 4.5. SPECKLE FILTERING
// ─────────────────────────────────────────────
function speckleFilter(image) {
  return image.focal_median({
    radius: 30,
    units: 'meters'
  }).copyProperties(image, image.propertyNames());
}

var s1_filtered = s1_db.map(speckleFilter);

// ─────────────────────────────────────────────
// 5. SPLIT INTO BASELINE & CURRENT COLLECTIONS
// ─────────────────────────────────────────────
var baselineCol = s1_filtered.filterDate(BASELINE_START, BASELINE_END);
var currentCol = s1_filtered.filterDate(CURRENT_START, CURRENT_END);

// Safety checks — print counts to Console
print('Baseline image count:', baselineCol.size());
print('Current  image count:', currentCol.size());

// ─────────────────────────────────────────────
// 6. MEAN COMPOSITES  (clipped to AOI)
// ─────────────────────────────────────────────
var baselineMedian = baselineCol.median().clip(aoi);
var currentMedian = currentCol.median().clip(aoi);

// ─────────────────────────────────────────────
// 7. NO COMBINATION  →  Keep VV and VH separate
// ─────────────────────────────────────────────
// We just use baselineMedian and currentMedian directly.

// ─────────────────────────────────────────────
// 8. CHANGE DETECTION  →  delta = current − baseline
// ─────────────────────────────────────────────
// delta will contain both VV_db and VH_db differences.
var delta = currentMedian.subtract(baselineMedian)
  .select(['VV_db', 'VH_db'], ['VV_delta', 'VH_delta'])
  .clip(aoi);

// ─────────────────────────────────────────────
// 9. VISUALIZATION LAYERS
// ─────────────────────────────────────────────
var dbVis = { min: -25, max: 0, bands: ['VV_db'] };
var deltaVis = {
  min: -5, max: 5, bands: ['VV_delta'],
  palette: ['#d7191c', '#fdae61', '#ffffff', '#a6d96a', '#1a9641']
};

Map.addLayer(baselineMedian, dbVis, 'Baseline VV (dB)');
Map.addLayer(currentMedian, dbVis, 'Current VV (dB)');
Map.addLayer(delta, deltaVis, 'Delta VV (Current - Baseline)');

// ─────────────────────────────────────────────
// 10. STACK INTO MULTI-BAND IMAGE FOR SAMPLING
// ─────────────────────────────────────────────
var stackedImage = baselineMedian
  .addBands(currentMedian) // This adds _1 to duplicate bands: VV_db_1, VH_db_1
  .addBands(delta);
// Final Bands: ['VV_db', 'VH_db', 'VV_db_1', 'VH_db_1', 'VV_delta', 'VH_delta']

// ─────────────────────────────────────────────
// 11. SAMPLE RASTER → FeatureCollection
// ─────────────────────────────────────────────
var sampledPoints = stackedImage.sample({
  region: aoi,
  scale: 30,
  numPixels: 3000,
  geometries: true,
  seed: 42,
  dropNulls: true
});

print('Sampled point count:', sampledPoints.size());

// ─────────────────────────────────────────────
// 12. CLEAN FEATURE PROPERTIES
//     Extract lat/lng from geometry and rename fields
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// 13. EXPORT AS CSV  (Google Drive)
// ─────────────────────────────────────────────
Export.table.toDrive({
  collection: cleanedPoints,
  description: 's1_deforestation_vv_vh',
  folder: 'GEE_Exports',
  fileNamePrefix: 's1_deforestation_vv_vh',
  fileFormat: 'CSV',
  selectors: ['lat', 'lng', 'VV_baseline', 'VH_baseline', 'VV_current', 'VH_current', 'VV_delta', 'VH_delta']
});

// ─────────────────────────────────────────────
// 14. EXPORT AS GeoJSON  (Google Drive)
// ─────────────────────────────────────────────
Export.table.toDrive({
  collection: cleanedPoints,
  description: 's1_deforestation_vv_vh_geojson',
  folder: 'GEE_Exports',
  fileNamePrefix: 's1_deforestation_vv_vh',
  fileFormat: 'GeoJSON'
});

// ─────────────────────────────────────────────
// END OF SCRIPT
// ─────────────────────────────────────────────
// ```

// ---

//  ## What Each Section Does
//  ### 1. Geometry Construction
//  The input coordinates were given as `(lat, lon)`. GEE's `ee.Geometry.Polygon` expects `(lon, lat)`, so all pairs are transposed. The ring is explicitly closed by repeating the first vertex, and `geodesic: false` is set to avoid great-circle distortion on this small polygon.
//  ### 2. Date Correction
//  `2025-11-31` is an invalid calendar date (November has 30 days). The baseline end is corrected to `2025-12-01`, which also perfectly abuts the current period start — no gap, no overlap.
//  ### 3. Collection Filtering
//  The `.filter(ee.Filter.listContains(...))` approach guarantees **both** VV and VH are present on each acquisition, preventing band-missing errors at composite time.
//  ### 4. dB Conversion
//  Note: Changed to just renaming bands because `COPERNICUS/S1_GRD` is already in dB.
//  The original `10 × log₁₀()` logic would mask out valid negative dB values.
//  ### 5. Combined Band
//  ```
//  combined = (VV_dB + VH_dB) / 2
//  ```
//  ### 6. Change Detection
//  Subtraction requires identical band names, resolved by subtracting before `.rename()`.