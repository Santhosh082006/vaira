import { prisma } from '../prisma';

export interface ForecastResult {
  sku: string;
  productName: string;
  currentStock: number;
  averageDailyDemand: number;
  demandStdDev: number;
  leadTimeDays: number;
  safetyStock: number;
  suggestedReorderPoint: number;
  status: 'HEALTHY' | 'REORDER_NOW' | 'CRITICAL';
  confidence: 'high' | 'low' | 'low_demand' | 'no_lead_time_data';
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
    let confidence: ForecastResult['confidence'] = 'high';

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

    let ema = 0;
    let stdDev = 0;

    if (transactions.length === 0) {
      // Check if it has ANY history to differentiate New vs Dead Stock
      const totalTxns = await prisma.inventoryTransaction.count({
        where: {
          inventory: { productId: product.id },
          reason: 'SALES_DISPATCH'
        }
      });
      
      if (totalTxns > 0) {
        confidence = 'low_demand'; // Dead stock
      } else {
        confidence = 'low'; // New SKU
      }
    } else {
      // We have transactions in the window
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

      // Exponential Smoothing (EMA) for Average Daily Demand
      const alpha = 0.2; // Adjusted per spec
      
      // If history is < 14 days, seed with simple average
      const activeDays = Array.from(dailyDemandMap.keys()).length;
      if (activeDays < 14) {
        confidence = 'low';
        const sum = chronologicalDemand.reduce((a, b) => a + b, 0);
        ema = sum / activeDays; // seed
      } else {
        ema = chronologicalDemand[0]; // Initialize with first day's demand
      }

      let sumSquares = 0;
      for (let i = 1; i < chronologicalDemand.length; i++) {
        const actual = chronologicalDemand[i];
        ema = (alpha * actual) + ((1 - alpha) * ema);
      }

      // Calculate standard deviation of demand
      const simpleMean = chronologicalDemand.reduce((a, b) => a + b, 0) / chronologicalDemand.length;
      for (const d of chronologicalDemand) {
        sumSquares += Math.pow(d - simpleMean, 2);
      }
      stdDev = Math.sqrt(sumSquares / chronologicalDemand.length);
    }

    // 3. Dynamic Reorder Formulas
    let leadTimeDays = defaultLeadTime;
    if (product.suppliers[0]?.leadTimeDays) {
      leadTimeDays = product.suppliers[0].leadTimeDays;
    } else {
      // Overwrite confidence if lead time is missing, UNLESS it's already a worse flag
      if (confidence === 'high') {
        confidence = 'no_lead_time_data';
      }
    }
    
    let safetyStock = 0;
    let expectedLeadTimeDemand = 0;

    if (confidence === 'low_demand' || (confidence === 'low' && ema === 0)) {
      // Dead stock or untouched new stock
      safetyStock = 1; // Floor to 1 to avoid unnecessary alerts
      expectedLeadTimeDemand = 0;
    } else {
      // Safety Stock = Z * StdDev * sqrt(Lead Time)
      safetyStock = Math.ceil(serviceLevelZScore * stdDev * Math.sqrt(leadTimeDays));
      expectedLeadTimeDemand = Math.ceil(ema * leadTimeDays);
    }
    
    // Reorder Point = (Lead Time Demand) + Safety Stock
    const suggestedReorderPoint = expectedLeadTimeDemand + safetyStock;

    // 4. Status Evaluation
    const currentStock = product.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
    
    let status: 'HEALTHY' | 'REORDER_NOW' | 'CRITICAL' = 'HEALTHY';
    
    // If it's dead stock and stock is 0, we don't necessarily want it to scream CRITICAL unless we enforce it.
    // Spec: "review for discontinuation", we just output the status based on math.
    if (currentStock <= safetyStock && currentStock > 0) {
      status = 'CRITICAL';
    } else if (currentStock <= 0) {
      status = confidence === 'low_demand' ? 'HEALTHY' : 'CRITICAL'; 
      // If dead stock has 0, don't scream critical.
    } else if (currentStock <= suggestedReorderPoint) {
      status = 'REORDER_NOW';
    }

    results.push({
      sku: product.sku,
      productName: product.name,
      currentStock,
      averageDailyDemand: Number(ema.toFixed(2)),
      demandStdDev: Number(stdDev.toFixed(2)),
      leadTimeDays,
      safetyStock,
      suggestedReorderPoint,
      status,
      confidence
    });
  }

  return results;
}
