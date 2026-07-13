const parseNestedSubtypes = (req, _res, next) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return next();
  }

  const fileMap = {};

  for (const file of req.files || []) {
    const fileMatch = file.fieldname.match(/^subtypes\[(\d+)\]\[floorPlan\]$/);
    if (fileMatch) {
      fileMap[parseInt(fileMatch[1], 10)] = file;
    }
  }

  if (Array.isArray(req.body.subtypes)) {
    req.body.subtypes = req.body.subtypes.reduce((acc, st, i) => {
      if (st && st.label && st.label.trim()) {
        acc.push({
          label: st.label.trim(),
          id: st.id || undefined,
          floorPlan: fileMap[i] || undefined,
          clearFloorPlan: st.clearFloorPlan === true || st.clearFloorPlan === 'true',
        });
      }
      return acc;
    }, []);
    return next();
  }

  const subtypeMap = {};

  for (const key of Object.keys(req.body)) {
    const match = key.match(/^subtypes\[(\d+)\]\[(\w+)\]$/);
    if (match) {
      const index = parseInt(match[1], 10);
      const field = match[2];
      if (!subtypeMap[index]) subtypeMap[index] = {};
      subtypeMap[index][field] = req.body[key];
      delete req.body[key];
    }
  }

  const indices = Object.keys(subtypeMap).map(Number).sort((a, b) => a - b);
  const subtypes = [];

  for (const i of indices) {
    const label = subtypeMap[i].label;
    if (!label || !label.trim()) continue;

    const entry = { label: label.trim() };
    if (subtypeMap[i].id) entry.id = subtypeMap[i].id;
    if (fileMap[i]) entry.floorPlan = fileMap[i];
    if (subtypeMap[i].clearFloorPlan === 'true') entry.clearFloorPlan = true;
    subtypes.push(entry);
  }

  if (subtypes.length > 0) {
    req.body.subtypes = subtypes;
  }

  next();
};

export default parseNestedSubtypes;
