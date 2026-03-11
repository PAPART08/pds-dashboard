const specificDetails = [
  { compId: 'C1-01', infraId: 'S000123', startLimit: 'K0932+000', endLimit: 'K0934+000', scope: '' },
  { compId: 'C1-01', infraId: 'S000124', startLimit: 'K0936+000', endLimit: 'K0938+000', scope: '' },
  { compId: 'C1-02', infraId: 'B00020BL', startLimit: '', endLimit: '', scope: 'Some Road Name' }
];

const components = [
  { id: 'C1-01', infraType: 'Roads', infraName: 'Tolosa-Dulag Rd' },
  { id: 'C1-02', infraType: 'Bridges', infraName: 'Bohe Basilan Br.' }
];

const grouped = specificDetails.reduce((acc, det) => {
  if (!det.compId) return acc;
  const comp = components.find(c => c.id === det.compId);
  if (!comp || !comp.infraName) return acc;

  const key = `${comp.id}_${comp.infraName}`;
  if (!acc[key]) {
    acc[key] = {
      infraName: comp.infraName,
      infraType: comp.infraType,
      details: []
    };
  }
  acc[key].details.push(det);
  return acc;
}, {});

const descParts = [];
for (const key of Object.keys(grouped)) {
  const g = grouped[key];
  if (g.infraType === 'Roads') {
    const chains = g.details
      .filter(d => d.startLimit || d.endLimit)
      .map(d => `${d.startLimit || '?'} - ${d.endLimit || '?'}`)
      .join(', ');
    if (chains) {
      descParts.push(`${g.infraName} - ${chains}`);
    } else {
      descParts.push(g.infraName);
    }
  } else if (g.infraType === 'Bridges') {
    const d0 = g.details[0]; 
    if (d0) {
       const infraIdText = d0.infraId ? `(${d0.infraId})` : '';
       const scopeText = d0.scope ? `along ${d0.scope}` : '';
       descParts.push(`${g.infraName} ${infraIdText} ${scopeText}`.trim().replace(/\s+/g, ' '));
    } else {
       descParts.push(g.infraName);
    }
  } else {
    descParts.push(g.infraName);
  }
}

console.log(descParts.join('; '));
