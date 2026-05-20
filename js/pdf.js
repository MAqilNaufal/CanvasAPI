// PDF export — iterates Pages, renders each via Fabric off-screen.
const PdfExporter = (() => {
  function loadPageToOffscreen(pageData) {
    return new Promise(res => {
      const tmp = document.createElement('canvas');
      tmp.width = pageData.w;
      tmp.height = pageData.h;
      const fc = new fabric.StaticCanvas(tmp, {
        backgroundColor: '#ffffff',
        width: pageData.w,
        height: pageData.h
      });
      fc.loadFromJSON(pageData.canvasJSON || {}, () => {
        fc.renderAll();
        const dataUrl = fc.toDataURL({ format: 'png', multiplier: 1 });
        fc.dispose();
        res({ dataUrl, w: pageData.w, h: pageData.h });
      });
    });
  }

  async function exportPDF(pages, filename = 'design') {
    if (typeof window.jspdf === 'undefined') {
      alert('jsPDF library not loaded');
      return;
    }
    const { jsPDF } = window.jspdf;

    // Snapshot current page first
    Pages.snapshotCurrent();

    // Use first page to determine orientation/format
    const first = pages[0];
    const orientation = first.w >= first.h ? 'landscape' : 'portrait';
    const pdf = new jsPDF({
      orientation,
      unit: 'px',
      format: [first.w, first.h],
      compress: true
    });

    for (let i = 0; i < pages.length; i++) {
      const p = pages[i];
      const { dataUrl, w, h } = await loadPageToOffscreen(p);
      if (i > 0) {
        pdf.addPage([w, h], w >= h ? 'landscape' : 'portrait');
      }
      pdf.addImage(dataUrl, 'PNG', 0, 0, w, h);
    }

    const safe = (filename || 'design').replace(/[^\w-]+/g, '_');
    pdf.save(`${safe}.pdf`);
  }

  return { exportPDF };
})();
