const { jsPDF } = require('jspdf');
require('jspdf-autotable');

const { renderStaticControlPlan } = require('./sections');

const createDocument = () => new jsPDF('p', 'mm', 'a4');

const generateStaticControlPlanPDF = (data) => {
  const doc = createDocument();
  renderStaticControlPlan(doc, data);
  return doc;
};

const generateStaticControlPlanPDFBuffer = (data) => {
  const doc = generateStaticControlPlanPDF(data);
  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
};

module.exports = {
  generateStaticControlPlanPDF,
  generateStaticControlPlanPDFBuffer,
};

