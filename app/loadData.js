import fs from "node:fs";
import path from "node:path";

// Minimal CSV parser. Our data has no quoted fields/embedded commas,
// so a plain split is sufficient and avoids pulling in a dependency.
function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const cells = line.split(",");
    const row = {};
    headers.forEach((h, i) => {
      row[h] = cells[i];
    });
    return row;
  });
}

function readCsv(fileName) {
  const filePath = path.join(process.cwd(), "data", fileName);
  return parseCsv(fs.readFileSync(filePath, "utf8"));
}

// Reads both CSVs at server render time and reshapes them for the page.
export function loadCompetitorData() {
  // CSV 1: one row per (category, company) — pivot into one row per category.
  const rawCategory = readCsv("CategoryLevel_SN_Competitor_Comparison.csv");
  const byCategory = {};
  for (const r of rawCategory) {
    const cat = (byCategory[r.PRODUCT_CATEGORY] ||= { category: r.PRODUCT_CATEGORY });
    if (r.COMPANY === "SN") {
      cat.sn = Number(r.AVG_RATING);
      cat.snReviews = Number(r.REVIEW_COUNT);
    } else {
      cat.competitor = Number(r.AVG_RATING);
      cat.competitorReviews = Number(r.REVIEW_COUNT);
    }
  }
  const categoryComparison = Object.values(byCategory).sort((a, b) =>
    a.category.localeCompare(b.category)
  );

  // CSV 2: competitor brands grouped by category.
  const rawBrands = readCsv("CompetitorsBrandsPerCategory.csv");
  const brandsByCategory = {};
  for (const r of rawBrands) {
    (brandsByCategory[r.PRODUCT_CATEGORY] ||= []).push({
      brand: r.BRAND,
      reviews: Number(r.REVIEW_COUNT),
      rating: Number(r.AVG_RATING),
    });
  }

  return { categoryComparison, brandsByCategory };
}
