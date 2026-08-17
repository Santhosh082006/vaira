import "dotenv/config";
import { prisma } from '../src/lib/prisma';
import { calculateDynamicReorderPoints } from '../src/lib/services/demandForecasting';

async function runValidation() {
  console.log("===============================================================");
  console.log("             DEMAND FORECASTING VALIDATION MATRIX              ");
  console.log("===============================================================");
  
  const forecasts = await calculateDynamicReorderPoints(new Date(), 60);

  const tableData = forecasts.map(f => ({
    SKU: f.sku,
    'Avg Dmd': f.averageDailyDemand.toFixed(2),
    'Std Dev': f.demandStdDev.toFixed(2),
    'Safety Stock': f.safetyStock,
    'Reorder Pt': f.suggestedReorderPoint,
    'Stock': f.currentStock,
    Status: f.status,
    Confidence: f.confidence
  }));

  console.table(tableData);

  console.log("===============================================================");
  console.log("Edge Case Checks:");
  const deadStock = forecasts.filter(f => f.confidence === 'low_demand');
  const newSku = forecasts.filter(f => f.confidence === 'low');
  const noLeadTime = forecasts.filter(f => f.confidence === 'no_lead_time_data');

  console.log(`- Dead Stock SKUs (low_demand): ${deadStock.length}`);
  console.log(`- New SKUs (low): ${newSku.length}`);
  console.log(`- Missing Lead Time (no_lead_time_data): ${noLeadTime.length}`);
}

runValidation()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
