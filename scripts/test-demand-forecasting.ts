import { calculateDynamicReorderPoints } from '../src/lib/services/demandForecasting';
import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('Running Demand Forecasting & Dynamic Reorder Point Engine...\n');

  // We test using today's date, looking back 60 days to calculate the EMA
  const forecasts = await calculateDynamicReorderPoints(new Date(), 60);

  console.log(String().padEnd(95, '-'));
  console.log(
    'SKU'.padEnd(15) + 
    'STOCK'.padStart(8) + 
    'EMA/DAY'.padStart(10) + 
    'STDDEV'.padStart(10) + 
    'S.STOCK'.padStart(10) + 
    'REORDER PT'.padStart(12) + 
    '  STATUS'
  );
  console.log(String().padEnd(95, '-'));

  for (const f of forecasts) {
    console.log(
      f.sku.padEnd(15) + 
      f.currentStock.toString().padStart(8) + 
      f.averageDailyDemand.toFixed(1).padStart(10) + 
      f.demandVariance.toFixed(1).padStart(10) + 
      f.safetyStock.toString().padStart(10) + 
      f.suggestedReorderPoint.toString().padStart(12) + 
      '  ' + f.status
    );
  }
  
  console.log(String().padEnd(95, '-'));
  console.log('\nDefinitions:');
  console.log('EMA/DAY: Exponential Moving Average of Daily Demand (weights recent data higher)');
  console.log('STDDEV: Standard Deviation of daily demand (noise level)');
  console.log('S.STOCK: Safety Stock buffer = Z(1.65) * StdDev * sqrt(LeadTime)');
  console.log('REORDER PT: Dynamic Threshold = (EMA * LeadTime) + Safety Stock');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
