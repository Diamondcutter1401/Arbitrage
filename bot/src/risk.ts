import { PublicClient } from "viem";

export interface RiskConfig {
  pauseAboveBaseFeePctl: number;
  pauseFailRatePct: number;
  maxGasPriceGwei: number;
  maxSlippageBps: number;
}

export class RiskManager {
  private baseFeeHistory: number[] = [];
  private failureHistory: boolean[] = [];
  private readonly maxHistorySize = 100;

  constructor(private config: RiskConfig) {}

  updateBaseFee(baseFeeGwei: number) {
    this.baseFeeHistory.push(baseFeeGwei);
    if (this.baseFeeHistory.length > this.maxHistorySize) {
      this.baseFeeHistory.shift();
    }
  }

  recordTransaction(success: boolean) {
    this.failureHistory.push(!success);
    if (this.failureHistory.length > this.maxHistorySize) {
      this.failureHistory.shift();
    }
  }

  shouldPause(): boolean {
    // Check base fee percentile
    if (this.baseFeeHistory.length > 10) {
      const sorted = [...this.baseFeeHistory].sort((a, b) => a - b);
      const pctl90Index = Math.floor(sorted.length * this.config.pauseAboveBaseFeePctl);
      const pctl90Fee = sorted[pctl90Index];
      
      if (this.baseFeeHistory[this.baseFeeHistory.length - 1] > pctl90Fee) {
        return true;
      }
    }

    // Check failure rate
    if (this.failureHistory.length > 20) {
      const recentFailures = this.failureHistory.slice(-20);
      const failureRate = recentFailures.filter(f => f).length / recentFailures.length;
      
      if (failureRate > this.config.pauseFailRatePct / 100) {
        return true;
      }
    }

    return false;
  }

  async getOptimalGasPrice(client: PublicClient): Promise<bigint> {
    try {
      const feeData = await client.getFeeHistory({
        blockCount: 1,
        rewardPercentiles: [50, 90]
      });

      const baseFee = feeData.baseFeePerGas[0];
      const priorityFee = feeData.reward?.[0]?.[0] || 0n;
      
      // Add some buffer to the base fee
      const gasPrice = baseFee + priorityFee + (baseFee / 10n); // 10% buffer
      
      // Cap at max gas price
      const maxGasPrice = BigInt(this.config.maxGasPriceGwei) * 1000000000n; // Convert to wei
      
      return gasPrice > maxGasPrice ? maxGasPrice : gasPrice;
    } catch (error) {
      console.error("Error getting gas price:", error);
      return BigInt(this.config.maxGasPriceGwei) * 1000000000n; // Fallback
    }
  }
}
