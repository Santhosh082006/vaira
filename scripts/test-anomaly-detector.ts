import { detectAnomalies, AnomalyResult } from '../src/lib/services/anomalyDetection';
import { prisma } from '../src/lib/prisma';
import fs from 'fs';
import path from 'path';

const ANOMALIES_FILE = path.join(process.cwd(), 'anomalies_ground_truth.json');

async function main() {
  console.log('Starting statistical anomaly detection validation...');

  // 1. Load ground truth
  if (!fs.existsSync(ANOMALIES_FILE)) {
    throw new Error(`Ground truth file not found at ${ANOMALIES_FILE}`);
  }
  const groundTruthRaw = JSON.parse(fs.readFileSync(ANOMALIES_FILE, 'utf-8'));
  
  // Format ground truth for easy lookup: key = "YYYY-MM-DD_SKU"
  const groundTruth = new Map<string, any>();
  for (const item of groundTruthRaw) {
    groundTruth.set(`${item.date}_${item.sku}`, item);
  }

  console.log(`Loaded ${groundTruth.size} ground-truth anomalies.`);

  // 2. Run detection for every day in the past 180 days
  const detectedAnomalies: AnomalyResult[] = [];
  const DAYS_TO_TEST = 180;

  for (let i = DAYS_TO_TEST; i >= 0; i--) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - i);
    targetDate.setHours(12, 0, 0, 0);

    const anomaliesForDay = await detectAnomalies(targetDate, 30, 2.5);
    detectedAnomalies.push(...anomaliesForDay);
  }

  // 3. Evaluate Precision and Recall
  let truePositives = 0;
  let falsePositives = 0;
  const detectedKeys = new Set<string>();

  for (const det of detectedAnomalies) {
    const key = `${det.date}_${det.sku}`;
    detectedKeys.add(key);

    if (groundTruth.has(key)) {
      truePositives++;
    } else {
      falsePositives++;
    }
  }

  const falseNegatives = groundTruth.size - truePositives;
  
  const precision = truePositives / (truePositives + falsePositives || 1);
  const recall = truePositives / (truePositives + falseNegatives || 1);
  const f1Score = 2 * ((precision * recall) / (precision + recall || 1));

  console.log('\n--- Validation Results ---');
  console.log(`Total Detected:    ${detectedAnomalies.length}`);
  console.log(`True Positives:    ${truePositives} (Correctly identified)`);
  console.log(`False Positives:   ${falsePositives} (Cried wolf)`);
  console.log(`False Negatives:   ${falseNegatives} (Missed anomalies)`);
  console.log('--------------------------');
  console.log(`Precision: ${(precision * 100).toFixed(2)}%`);
  console.log(`Recall:    ${(recall * 100).toFixed(2)}%`);
  console.log(`F1-Score:  ${(f1Score * 100).toFixed(2)}%`);
  
  console.log('\nSample Detected Anomalies:');
  console.log(detectedAnomalies.slice(0, 3));

  if (falsePositives > 5) {
    console.log('\nTip: High false positives. Consider increasing zScoreThreshold or minimum stdDev.');
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
