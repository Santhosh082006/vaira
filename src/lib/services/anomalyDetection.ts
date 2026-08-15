import { prisma } from '../prisma';

export interface AnomalyResult {
  date: string;
  sku: string;
  type: 'volume_spike' | 'volume_drop' | 'impossible_value';
  severity: number; // 0.0 to 1.0
  expectedValue: number;
  actualValue: number;
  details: string;
}

/**
 * Calculates rolling mean and standard deviation for an array of numbers.
 */
function calculateStats(values: number[]) {
  if (values.length === 0) return { mean: 0, stdDev: 0 };
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  return { mean, stdDev };
}

/**
 * Main Anomaly Detection Engine
 * Uses a rolling window to detect outliers based on Z-Scores.
 */
export async function detectAnomalies(
  targetDate: Date, 
  windowDays: number = 30, 
  zScoreThreshold: number = 2.5
): Promise<AnomalyResult[]> {
  const anomalies: AnomalyResult[] = [];
  
  // Start and end boundaries for the window
  const windowStart = new Date(targetDate);
  windowStart.setDate(windowStart.getDate() - windowDays);
  
  const windowEnd = new Date(targetDate);
  windowEnd.setHours(23, 59, 59, 999);

  // 1. Fetch all SKUs
  const products = await prisma.product.findMany();

  for (const product of products) {
    // 2. Fetch all sales/dispatch transactions for the window
    const transactions = await prisma.inventoryTransaction.findMany({
      where: {
        inventory: { productId: product.id },
        createdAt: {
          gte: windowStart,
          lte: windowEnd
        },
        reason: { in: ['SALES_DISPATCH', 'MANUAL_ADJUST'] }
      },
      orderBy: { createdAt: 'asc' }
    });

    if (transactions.length === 0) continue;

    // Group demand by day
    const dailyDemandMap = new Map<string, number>();
    const manualAdjustments: any[] = [];

    for (const txn of transactions) {
      const dateStr = txn.createdAt.toISOString().split('T')[0];
      
      if (txn.reason === 'MANUAL_ADJUST') {
        manualAdjustments.push(txn);
      } else {
        // Demand is recorded as negative quantityChange in our DB
        const demand = Math.abs(txn.quantityChange);
        dailyDemandMap.set(dateStr, (dailyDemandMap.get(dateStr) || 0) + demand);
      }
    }

    const targetDateStr = targetDate.toISOString().split('T')[0];
    const actualDemandToday = dailyDemandMap.get(targetDateStr) || 0;

    // We only use the previous days (not including today) to build the baseline
    const baselineValues: number[] = [];
    for (let i = windowDays; i > 0; i--) {
      const d = new Date(targetDate);
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      // If there was no transaction, demand was 0
      baselineValues.push(dailyDemandMap.get(dStr) || 0);
    }

    // 3. Statistical Analysis
    const { mean, stdDev } = calculateStats(baselineValues);
    
    // Ignore if there is virtually no baseline data yet (prevents cold-start false positives)
    const activeDays = baselineValues.filter(v => v > 0).length;
    if (activeDays < 10) continue;
    
    // Minimum standard deviation to prevent division by zero or hypersensitivity on slow SKUs
    const effectiveStdDev = Math.max(stdDev, 1.5); 
    const zScore = (actualDemandToday - mean) / effectiveStdDev;

    // 4. Categorize Anomalies
    
    // A. Impossible Values (massive negative manual adjusts)
    // For our dataset, we check if manual adjust was absurdly large (e.g. > 50 units removed suddenly)
    const todayAdjustments = manualAdjustments.filter(t => t.createdAt.toISOString().split('T')[0] === targetDateStr);
    for (const adj of todayAdjustments) {
      if (Math.abs(adj.quantityChange) > 50) {
        anomalies.push({
          date: targetDateStr,
          sku: product.sku,
          type: 'impossible_value',
          severity: 1.0,
          expectedValue: 0,
          actualValue: adj.quantityChange,
          details: `Impossible manual adjustment detected: ${adj.quantityChange} units.`
        });
      }
    }

    // B. Volume Spikes
    if (zScore > zScoreThreshold) {
      // Calculate severity based on how far past the threshold it is (cap at 1.0)
      const severity = Math.min((zScore - zScoreThreshold) / 5.0, 1.0) + 0.5; // Starts at 0.5 severity
      
      anomalies.push({
        date: targetDateStr,
        sku: product.sku,
        type: 'volume_spike',
        severity: Math.min(severity, 1.0),
        expectedValue: Math.round(mean),
        actualValue: actualDemandToday,
        details: `Demand spike detected: ${actualDemandToday} units (Baseline: ${Math.round(mean)} ± ${Math.round(stdDev)})`
      });
    }

    // C. Volume Drops (Sudden 0 demand on a highly active SKU)
    // Only trigger if mean > 10 (it's a busy SKU) and actual demand is exactly 0
    if (mean > 10 && actualDemandToday === 0) {
      // Z-score will be negative
      if (Math.abs(zScore) > zScoreThreshold) {
        anomalies.push({
          date: targetDateStr,
          sku: product.sku,
          type: 'volume_drop',
          severity: 0.8,
          expectedValue: Math.round(mean),
          actualValue: 0,
          details: `Sudden demand drop: 0 units on an active SKU (Baseline: ${Math.round(mean)}).`
        });
      }
    }
  }

  return anomalies;
}
