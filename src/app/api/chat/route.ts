import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { calculateDynamicReorderPoints } from '@/lib/services/demandForecasting';
import { detectAnomalies } from '@/lib/services/anomalyDetection';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    // @ts-ignore - Ignore type error between LanguageModelV1 and LanguageModel
    model: openai('gpt-4o-mini'),
    messages,
    system: `You are Vaira's Operations Assistant. 
    You are an expert supply chain analyst. 
    Always use your available tools to fetch REAL data from the warehouse database before answering questions about stock, reordering, or anomalies.
    Never hallucinate numbers. If the data is empty, say so.
    Present your findings professionally.`,
    tools: {
      get_stock_level: tool({
        description: 'Get the current stock level and basic details for a specific SKU.',
        parameters: z.object({
          sku: z.string().describe('The product SKU (e.g. SYN-MKB-01)')
        }),
        // @ts-ignore
        execute: async ({ sku }: { sku: string }) => {
          const product = await prisma.product.findUnique({
            where: { sku },
            include: { inventory: true }
          });
          
          if (!product) return { error: `SKU ${sku} not found.` };
          
          const currentStock = product.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
          return {
            sku: product.sku,
            name: product.name,
            currentStock,
            reorderLevel: product.reorderLevel
          };
        }
      }),

      get_reorder_candidates: tool({
        description: 'Get a list of all products that currently need to be reordered based on dynamic forecasting (status is REORDER_NOW or CRITICAL).',
        parameters: z.object({}),
        // @ts-ignore
        execute: async () => {
          // Uses exponential smoothing and dynamic safety stock
          const forecasts = await calculateDynamicReorderPoints(new Date(), 60);
          const needsReorder = forecasts.filter(f => f.status === 'REORDER_NOW' || f.status === 'CRITICAL');
          
          return {
            totalCandidates: needsReorder.length,
            candidates: needsReorder
          };
        }
      }),

      get_recent_anomalies: tool({
        description: 'Run statistical anomaly detection to find recent volume spikes, volume drops, or impossible inventory values.',
        parameters: z.object({
          lookbackDays: z.number().default(30).describe('Number of days to look back for anomalies.')
        }),
        // @ts-ignore
        execute: async ({ lookbackDays }: { lookbackDays: number }) => {
          const targetDate = new Date();
          // We look back to see anomalies over the specified period
          const anomalies = await detectAnomalies(targetDate, lookbackDays, 2.5);
          
          // Return the top 5 most severe anomalies to avoid overloading the context window
          const sortedAnomalies = anomalies.sort((a, b) => b.severity - a.severity).slice(0, 5);
          
          return {
            totalFound: anomalies.length,
            returned: sortedAnomalies.length,
            anomalies: sortedAnomalies
          };
        }
      })
    }
  });

  // @ts-ignore - Ignore the StreamTextResult type issue with toDataStreamResponse
  return result.toDataStreamResponse();
}
