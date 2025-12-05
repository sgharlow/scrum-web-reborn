import { expect } from '@playwright/test';

/**
 * Measure latency of an operation
 * @param action Function that triggers the action
 * @param verification Function that verifies the result
 * @returns Latency in milliseconds
 */
export async function measureLatency(
  action: () => Promise<void>,
  verification: () => Promise<void>
): Promise<number> {
  const startTime = Date.now();
  await action();
  await verification();
  const endTime = Date.now();
  return endTime - startTime;
}

/**
 * Assert that latency meets the target SLI
 * @param latency Measured latency in milliseconds
 * @param target Target latency in milliseconds
 * @param operation Description of the operation
 * @param allowBuffer Whether to allow 50% buffer (default: true)
 */
export function assertLatency(
  latency: number,
  target: number,
  operation: string,
  allowBuffer: boolean = true
): void {
  const threshold = allowBuffer ? target * 1.5 : target;
  
  if (latency > target && latency <= threshold) {
    console.warn(`⚠️ ${operation} latency ${latency}ms exceeds target ${target}ms but within buffer`);
  } else if (latency > threshold) {
    console.error(`❌ ${operation} latency ${latency}ms exceeds threshold ${threshold}ms`);
  } else {
    console.log(`✓ ${operation} latency ${latency}ms meets target ${target}ms`);
  }
  
  expect(latency, `${operation} should complete within ${threshold}ms`).toBeLessThan(threshold);
}

/**
 * Measure and assert latency in one call
 */
export async function measureAndAssertLatency(
  action: () => Promise<void>,
  verification: () => Promise<void>,
  target: number,
  operation: string,
  allowBuffer: boolean = true
): Promise<number> {
  const latency = await measureLatency(action, verification);
  assertLatency(latency, target, operation, allowBuffer);
  return latency;
}

/**
 * Wait for a condition with timeout and measure how long it took
 */
export async function waitForCondition(
  condition: () => Promise<boolean>,
  timeout: number = 5000,
  pollInterval: number = 100
): Promise<number> {
  const startTime = Date.now();
  const endTime = startTime + timeout;
  
  while (Date.now() < endTime) {
    if (await condition()) {
      return Date.now() - startTime;
    }
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
  
  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Performance metrics collector for test reporting
 */
export class PerformanceMetrics {
  private metrics: Array<{ operation: string; latency: number; target: number; timestamp: number }> = [];
  
  record(operation: string, latency: number, target: number): void {
    this.metrics.push({
      operation,
      latency,
      target,
      timestamp: Date.now(),
    });
  }
  
  getSummary(): string {
    if (this.metrics.length === 0) {
      return 'No metrics recorded';
    }
    
    const lines = ['Performance Metrics Summary:', ''];
    
    for (const metric of this.metrics) {
      const status = metric.latency <= metric.target ? '✓' : '⚠️';
      const percentage = ((metric.latency / metric.target) * 100).toFixed(1);
      lines.push(`${status} ${metric.operation}: ${metric.latency}ms (${percentage}% of ${metric.target}ms target)`);
    }
    
    const avgLatency = this.metrics.reduce((sum, m) => sum + m.latency, 0) / this.metrics.length;
    const metTarget = this.metrics.filter(m => m.latency <= m.target).length;
    const successRate = ((metTarget / this.metrics.length) * 100).toFixed(1);
    
    lines.push('');
    lines.push(`Average Latency: ${avgLatency.toFixed(1)}ms`);
    lines.push(`SLI Success Rate: ${successRate}% (${metTarget}/${this.metrics.length})`);
    
    return lines.join('\n');
  }
  
  clear(): void {
    this.metrics = [];
  }
}
