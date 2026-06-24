import CompetitorAnalysis from "./CompetitorAnalysis";
import { loadCompetitorData } from "./loadData";

// Server component: reads the CSVs at render time and hands the parsed
// data to the interactive client component below.
export default function Page() {
  const { categoryComparison, brandsByCategory } = loadCompetitorData();
  return (
    <CompetitorAnalysis
      categoryComparison={categoryComparison}
      brandsByCategory={brandsByCategory}
    />
  );
}
