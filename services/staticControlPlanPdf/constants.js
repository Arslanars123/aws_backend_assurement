const COLORS = {
  primary: [0, 102, 153],
  lightGray: [240, 240, 240],
  footerText: [150, 150, 150],
};

const LAYOUT = {
  margin: 20,
  safeRightOffset: 5,
  pageFormat: 'a4',
  orientation: 'p',
  unit: 'mm',
};

const euroCodeNames = {
  0: 'Eurocode 0: Basis of design for structures',
  1: 'Eurocode 1: Actions on structures',
  2: 'Eurocode 2: Concrete structures',
  3: 'Eurocode 3: Steel structures',
  4: 'Eurocode 4: Composite structures',
  5: 'Eurocode 5: Timber structures',
  6: 'Eurocode 6: Masonry structures',
  7: 'Eurocode 7: Geotechnical design',
  8: 'Eurocode 8: Design of structures for earthquake resistance',
  9: 'Eurocode 9: Aluminium structures',
  1520: 'EN 1520: Lightweight concrete with porous aggregates',
  12602: 'EN 12602: Cellular concrete',
};

module.exports = {
  COLORS,
  LAYOUT,
  euroCodeNames,
};

