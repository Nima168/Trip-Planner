import { jsPDF } from "jspdf";

import type { Trip } from "../types";
import { formatDateRange } from "../utils/date";
import { Icon } from "./Icon";

function buildItineraryPdf(trip: Trip): jsPDF {
  const doc = new jsPDF();
  const marginX = 15;
  let y = 20;
  const lineHeight = 7;
  const pageBottom = 280;

  function addLine(text: string) {
    if (y > pageBottom) {
      doc.addPage();
      y = 20;
    }
    doc.text(text, marginX, y);
    y += lineHeight;
  }

  doc.setFontSize(16);
  addLine(trip.destination);
  doc.setFontSize(11);
  addLine(formatDateRange(trip.start_date, trip.end_date));
  y += 3;

  for (const day of trip.days) {
    doc.setFontSize(13);
    addLine(`Day ${day.day_number} — ${day.date}`);
    doc.setFontSize(11);
    if (day.activities.length === 0) {
      addLine("  (no activities planned)");
    } else {
      for (const activity of day.activities) {
        addLine(`  • ${activity.text}`);
      }
    }
    y += 2;
  }

  return doc;
}

export function PrintButton({ trip }: { trip: Trip }) {
  function handlePrint() {
    const doc = buildItineraryPdf(trip);
    const safeName = trip.destination.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    doc.save(`${safeName || "itinerary"}.pdf`);
  }

  return (
    <button
      type="button"
      onClick={handlePrint}
      className="btn-primary"
    >
      <Icon name="download" />
      Save as PDF
    </button>
  );
}
