function addEngineeredFeatures(data) {
  return data.map(row => {
    const VV_baseline = row.VV_baseline;
    const VH_baseline = row.VH_baseline;
    const VV_current = row.VV_current;
    const VH_current = row.VH_current;
    const VV_delta = row.VV_delta;
    const VH_delta = row.VH_delta;

    // Avoid division by zero
    const safeVVBase = Math.abs(VV_baseline) > 1e-6 ? VV_baseline : 1e-6;
    const safeVHBase = Math.abs(VH_baseline) > 1e-6 ? VH_baseline : 1e-6;

    return {
      ...row,

      // 1. Ratio (dB difference)
      VVVH_ratio: VV_current - VH_current,

      // 2. Normalized delta
      VV_norm: VV_delta / Math.abs(safeVVBase),
      VH_norm: VH_delta / Math.abs(safeVHBase),

      // 3. Magnitude
      delta_mag: Math.sqrt(VV_delta ** 2 + VH_delta ** 2)
    };
  });
}

module.exports = { addEngineeredFeatures };
