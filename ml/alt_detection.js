const fs = require('fs');
const path = require('path');
const { addEngineeredFeatures } = require('./featureEngineering');

/**
 * Adaptive Linear Threshold (ALT) Deforestation Detection
 * @param {Array<Object>} data - GEE extracted tabular dataset
 * @param {number} k - Standard deviation multiplier for thresholds (default: 1.5)
 * @returns {Object} Enriched data and execution summary
 */
function runAdaptiveLinearThreshold(data, k = 1.5) {
  const cleanData = data.filter(d =>
    d.VV_delta != null && d.VH_delta != null &&
    !isNaN(d.VV_delta) && !isNaN(d.VH_delta)
  );

  const n = cleanData.length;
  if (n === 0) return { enrichedData: [], summary: { error: "No valid data points." } };

  // Step 1: Compute Means
  const sumVV = cleanData.reduce((acc, row) => acc + row.VV_delta, 0);
  const sumVH = cleanData.reduce((acc, row) => acc + row.VH_delta, 0);
  const meanVV = sumVV / n;
  const meanVH = sumVH / n;

  // Step 1b: Compute Standard Deviations
  const denom = (n > 1 ? (n - 1) : n);
  const sqDiffVV = cleanData.reduce((acc, row) => acc + Math.pow(row.VV_delta - meanVV, 2), 0);
  const sqDiffVH = cleanData.reduce((acc, row) => acc + Math.pow(row.VH_delta - meanVH, 2), 0);
  const stdVV = Math.sqrt(sqDiffVV / denom) || 1e-6;
  const stdVH = Math.sqrt(sqDiffVH / denom) || 1e-6;

  // Step 2: Adaptive Thresholds
  const threshVV = meanVV - (k * stdVV);
  const threshVH = meanVH - (k * stdVH);

  let deforestedCount = 0;

  // Step 3 & 4: Classification & Confidence Scoring
  const enrichedData = cleanData.map(row => {
    const isDeforested = (row.VV_delta < threshVV && row.VH_delta < threshVH) ? 1 : 0;
    if (isDeforested) deforestedCount++;

    const vvScore = (threshVV - row.VV_delta) / stdVV;
    const vhScore = (threshVH - row.VH_delta) / stdVH;
    const distScore = Math.max(0, (vvScore + vhScore) / 2);

    const confidence = (1 - Math.exp(-distScore));

    return {
      lat: row.lat != null ? row.lat : row.latitude,
      lng: row.lng != null ? row.lng : row.longitude,
      VV_baseline: row.VV_baseline,
      VH_baseline: row.VH_baseline,
      VV_current: row.VV_current,
      VH_current: row.VH_current,
      VV_delta: row.VV_delta,
      VH_delta: row.VH_delta,
      deforestation: isDeforested,
      confidence: Number((confidence).toFixed(4))
    };
  });

  const summary = {
    total_processed: n,
    deforestation_found: deforestedCount,
    percent_detected: ((deforestedCount / n) * 100).toFixed(2) + "%",
    thresholds_used: { k, VV_threshold: threshVV, VH_threshold: threshVH }
  };

  return {
    enrichedData,
    thresholds: { VV: threshVV, VH: threshVH },
    summary
  };
}

function ensureDirectories() {
  const dataDir = path.join(__dirname, '..', 'data');
  const rawDir = path.join(dataDir, 'raw');
  const processedDir = path.join(dataDir, 'processed');

  [dataDir, rawDir, processedDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  return { rawDir, processedDir };
}

function main() {
  const { rawDir, processedDir } = ensureDirectories();

  // Accept standard JSON exports or GeoJSON exports from GEE script
  const possibleFiles = ['s1_deforestation_vv_vh.json', 's1_deforestation_vv_vh.geojson'];
  let inputFilePath = null;

  for (const file of possibleFiles) {
    const fullPath = path.join(rawDir, file);
    if (fs.existsSync(fullPath)) {
      inputFilePath = fullPath;
      break;
    }
  }

  if (!inputFilePath) {
    console.error(`Error: Could not find extracted data in ${rawDir}.`);
    console.error(`Please download the GEE export to the 'data/raw/' folder.`);
    process.exit(1);
  }

  console.log(`Reading data from ${inputFilePath}...`);
  const rawContent = fs.readFileSync(inputFilePath, 'utf-8');
  const parsedContent = JSON.parse(rawContent);

  let dataToProcess = [];
  if (parsedContent.type === 'FeatureCollection' && Array.isArray(parsedContent.features)) {
    dataToProcess = parsedContent.features.map(f => {
      let props = f.properties || {};
      // Safely fall back to explicit geometry lookup if lat/lng dropped
      if (f.geometry && f.geometry.coordinates && (!props.lat || !props.lng)) {
        props.lng = f.geometry.coordinates[0];
        props.lat = f.geometry.coordinates[1];
      }
      return props;
    });
  } else if (Array.isArray(parsedContent)) {
    dataToProcess = parsedContent;
  } else {
    console.error('Error: Unknown JSON structure.');
    process.exit(1);
  }

  console.log(`Processing ${dataToProcess.length} records...`);
  const engineeredData = addEngineeredFeatures(dataToProcess);
  const { enrichedData, summary } = runAdaptiveLinearThreshold(engineeredData, 1.5);

  console.log("\n--- Execution Summary ---");
  console.log(summary);

  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const filename = `s1_alt_predictions_${timestamp}.json`;
  const outputPath = path.join(processedDir, filename);
  
  fs.writeFileSync(outputPath, JSON.stringify(enrichedData, null, 2));
  console.log(`\nSuccess! Predictions saved to -> ${outputPath}`);
}

// Automatically execute logic if script is run via CLI
if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error("Execution failed:", error.message);
  }
}

module.exports = { runAdaptiveLinearThreshold };
