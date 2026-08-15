import { prisma } from '../prisma';

export interface ForecastResult {
  sku: string;
  productName: string;
  currentStock: number;
  averageDailyDemand: number;
  demandVariance: number;
  leadTimeDays: number;
  safetyStock: number;
  suggestedReorderPoint: number;
  status: 'HEALTHY' | 'REORDER_NOW' | 'CRITICAL';
}

/**
 * Demand Forecasting & Dynamic Reorder Point Engine
 * Uses Exponential Smoothing (EMA) to weight recent demand heavier than older demand.
 */
export async function calculateDynamicReorderPoints(
  targetDate: Date = new Date(),
  lookbackDays: number = 60,
  defaultLeadTime: number = 14,
  serviceLevelZScore: number = 1.65 // 95% service level
): Promise<ForecastResult[]> {
  
  const windowStart = new Date(targetDate);
  windowStart.setDate(windowStart.getDate() - lookbackDays);

  const products = await prisma.product.findMany({
    include: {
      inventory: true,
      suppliers: {
        where: { isPreferred: true },
        take: 1
      }
    }
  });

  const results: ForecastResult[] = [];

  for (const product of products) {
    // 1. Fetch transactions for the lookback window
    const transactions = await prisma.inventoryTransaction.findMany({
      where: {
        inventory: { productId: product.id },
        createdAt: {
          gte: windowStart,
          lte: targetDate
        },
        reason: 'SALES_DISPATCH' // Only predict based on outbound sales
      },
      orderBy: { createdAt: 'asc' }
    });

    if (transactions.length === 0) continue;

    // Group demand by day
    const dailyDemandMap = new Map<string, number>();
    for (const txn of transactions) {
      const dateStr = txn.createdAt.toISOString().split('T')[0];
      const demand = Math.abs(txn.quantityChange);
      dailyDemandMap.set(dateStr, (dailyDemandMap.get(dateStr) || 0) + demand);
    }

    // Build chronological array of demand, filling missing days with 0
    const chronologicalDemand: number[] = [];
    for (let i = lookbackDays; i >= 0; i--) {
      const d = new Date(targetDate);
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      chronologicalDemand.push(dailyDemandMap.get(dStr) || 0);
    }

    // 2. Exponential Smoothing (EMA) for Average Daily Demand
    const alpha = 0.3; // Weight of the most recent observation
    let ema = chronologicalDemand[0]; // Initialize with first day's demand

    // Calculate simple variance along the way
    let sumSquares = 0;

    for (let i = 1; i < chronologicalDemand.length; i++) {
      const actual = chronologicalDemand[i];
      ema = (alpha * actual) + ((1 - alpha) * ema);
    }

    // Calculate standard deviation of demand (for safety stock)
    const simpleMean = chronologicalDemand.reduce((a, b) => a + b, 0) / chronologicalDemand.length;
    for (const d of chronologicalDemand) {
      sumSquares += Math.pow(d - simpleMean, 2);
    }
    const stdDev = Math.sqrt(sumSquares / chronologicalDemand.length);

    // 3. Dynamic Reorder Formulas
    const leadTimeDays = product.suppliers[0]?.leadTimeDays || defaultLeadTime;
    
    // Safety Stock = Z * StdDev * sqrt(Lead Time)
    const safetyStock = Math.ceil(serviceLevelZScore * stdDev * Math.sqrt(leadTimeDays));
    
    // Reorder Point = (Lead Time Demand) + Safety Stock
    const expectedLeadTimeDemand = Math.ceil(ema * leadTimeDays);
    const suggestedReorderPoint = expectedLeadTimeDemand + safetyStock;

    // 4. Status Evaluation
    const currentStock = product.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
    
    let status: 'HEALTHY' | 'REORDER_NOW' | 'CRITICAL' = 'HEALTHY';
    if (currentStock <= safetyStock) {
      status = 'CRITICAL';
    } else if (currentStock <= suggestedReorderPoint) {
      status = 'REORDER_NOW';
    }

    results.push({
      sku: product.sku,
      productName: product.name,
      currentStock,
      averageDailyDemand: Number(ema.toFixed(2)),
      demandVariance: Number(stdDev.toFixed(2)),
      leadTimeDays,
      safetyStock,
      suggestedReorderPoint,
      status
    });
  }

  return results;
}
