import { describe, expect, it } from "vitest";

// Mock implementation of the Auto-Rebalancer Protocol
class MockAutoRebalancer {
  private owner: string = "contract-owner";
  private currentSender: string = "contract-owner";
  private blockHeight: number = 1000;
  
  // Data structures
  private portfolios: Map<string, {
    totalValue: number,
    lastRebalance: number,
    rebalanceThreshold: number,
    autoRebalanceEnabled: boolean
  }> = new Map();
  
  private portfolioAssets: Map<string, {
    currentAmount: number,
    targetAllocation: number,
    currentAllocation: number,
    assetName: string
  }> = new Map();
  
  private assetPrices: Map<number, {
    price: number,
    lastUpdated: number
  }> = new Map();
  
  // Error constants
  private readonly ERR_NOT_AUTHORIZED = 100;
  private readonly ERR_INVALID_ASSET = 101;
  private readonly ERR_INVALID_ALLOCATION = 102;
  private readonly ERR_INSUFFICIENT_BALANCE = 103;
  private readonly ERR_REBALANCE_NOT_NEEDED = 104;
  private readonly ERR_ASSET_EXISTS = 105;
  private readonly ERR_PORTFOLIO_NOT_FOUND = 106;
  
  // Helper methods
  setSender(sender: string): void {
    this.currentSender = sender;
  }
  
  setBlockHeight(height: number): void {
    this.blockHeight = height;
  }
  
  private getAssetKey(owner: string, assetId: number): string {
    return `${owner}-${assetId}`;
  }
  
  // Contract functions
  createPortfolio(rebalanceThreshold: number): { success: boolean, error?: number } {
    if (this.portfolios.has(this.currentSender)) {
      return { success: false, error: this.ERR_PORTFOLIO_NOT_FOUND };
    }
    
    if (rebalanceThreshold > 10000) {
      return { success: false, error: this.ERR_INVALID_ALLOCATION };
    }
    
    this.portfolios.set(this.currentSender, {
      totalValue: 0,
      lastRebalance: this.blockHeight,
      rebalanceThreshold,
      autoRebalanceEnabled: true
    });
    
    return { success: true };
  }
  
  addAsset(assetId: number, targetAllocation: number, initialAmount: number, assetName: string): { success: boolean, error?: number } {
    if (!this.portfolios.has(this.currentSender)) {
      return { success: false, error: this.ERR_PORTFOLIO_NOT_FOUND };
    }
    
    const assetKey = this.getAssetKey(this.currentSender, assetId);
    if (this.portfolioAssets.has(assetKey)) {
      return { success: false, error: this.ERR_ASSET_EXISTS };
    }
    
    if (targetAllocation > 10000) {
      return { success: false, error: this.ERR_INVALID_ALLOCATION };
    }
    
    this.portfolioAssets.set(assetKey, {
      currentAmount: initialAmount,
      targetAllocation,
      currentAllocation: 0,
      assetName
    });
    
    return { success: true };
  }
  
  updateAssetPrice(assetId: number, newPrice: number): { success: boolean, error?: number } {
    if (this.currentSender !== this.owner) {
      return { success: false, error: this.ERR_NOT_AUTHORIZED };
    }
    
    this.assetPrices.set(assetId, {
      price: newPrice,
      lastUpdated: this.blockHeight
    });
    
    return { success: true };
  }
  
  calculatePortfolioValue(owner: string): number {
    let totalValue = 0;
    const assetIds = [1, 2, 3, 4, 5]; // Support up to 5 assets
    
    for (const assetId of assetIds) {
      const assetKey = this.getAssetKey(owner, assetId);
      const asset = this.portfolioAssets.get(assetKey);
      const price = this.assetPrices.get(assetId);
      
      if (asset && price) {
        totalValue += asset.currentAmount * price.price;
      }
    }
    
    return totalValue;
  }
  
  checkRebalanceNeeded(owner: string): { success: boolean, result?: boolean, error?: number } {
    const portfolio = this.portfolios.get(owner);
    if (!portfolio) {
      return { success: false, error: this.ERR_PORTFOLIO_NOT_FOUND };
    }
    
    const portfolioValue = this.calculatePortfolioValue(owner);
    if (portfolioValue <= 0) {
      return { success: true, result: false };
    }
    
    const needsRebalance = this.checkAllocationDrift(owner, portfolioValue, portfolio.rebalanceThreshold);
    return { success: true, result: needsRebalance };
  }
  
  private checkAllocationDrift(owner: string, totalValue: number, threshold: number): boolean {
    const assetIds = [1, 2, 3, 4, 5];
    let maxDrift = 0;
    
    for (const assetId of assetIds) {
      const drift = this.checkSingleAssetDrift(owner, assetId, totalValue);
      if (drift > maxDrift) {
        maxDrift = drift;
      }
    }
    
    return maxDrift > threshold;
  }
  
  private checkSingleAssetDrift(owner: string, assetId: number, totalValue: number): number {
    const assetKey = this.getAssetKey(owner, assetId);
    const asset = this.portfolioAssets.get(assetKey);
    const price = this.assetPrices.get(assetId);
    
    if (!asset || !price) {
      return 0;
    }
    
    const currentValue = asset.currentAmount * price.price;
    const currentAllocation = Math.floor((currentValue * 10000) / totalValue);
    const targetAllocation = asset.targetAllocation;
    const drift = currentAllocation > targetAllocation 
      ? currentAllocation - targetAllocation 
      : targetAllocation - currentAllocation;
    
    return drift;
  }
  
  executeRebalance(): { success: boolean, error?: number } {
    const portfolio = this.portfolios.get(this.currentSender);
    if (!portfolio) {
      return { success: false, error: this.ERR_PORTFOLIO_NOT_FOUND };
    }
    
    if (!portfolio.autoRebalanceEnabled) {
      return { success: false, error: this.ERR_NOT_AUTHORIZED };
    }
    
    const rebalanceCheck = this.checkRebalanceNeeded(this.currentSender);
    if (!rebalanceCheck.success || !rebalanceCheck.result) {
      return { success: false, error: this.ERR_REBALANCE_NOT_NEEDED };
    }
    
    const portfolioValue = this.calculatePortfolioValue(this.currentSender);
    
    // Update portfolio
    portfolio.lastRebalance = this.blockHeight;
    portfolio.totalValue = portfolioValue;
    this.portfolios.set(this.currentSender, portfolio);
    
    // Rebalance assets
    this.rebalanceAssets(this.currentSender, portfolioValue);
    
    return { success: true };
  }
  
  private rebalanceAssets(owner: string, totalValue: number): void {
    const assetIds = [1, 2, 3, 4, 5];
    
    for (const assetId of assetIds) {
      this.rebalanceSingleAsset(owner, assetId, totalValue);
    }
  }
  
  private rebalanceSingleAsset(owner: string, assetId: number, totalValue: number): void {
    const assetKey = this.getAssetKey(owner, assetId);
    const asset = this.portfolioAssets.get(assetKey);
    const price = this.assetPrices.get(assetId);
    
    if (!asset || !price) {
      return;
    }
    
    const targetValue = (totalValue * asset.targetAllocation) / 10000;
    const targetAmount = targetValue / price.price;
    
    asset.currentAmount = targetAmount;
    asset.currentAllocation = asset.targetAllocation;
    this.portfolioAssets.set(assetKey, asset);
  }
  
  setAutoRebalance(enabled: boolean): { success: boolean, error?: number } {
    const portfolio = this.portfolios.get(this.currentSender);
    if (!portfolio) {
      return { success: false, error: this.ERR_PORTFOLIO_NOT_FOUND };
    }
    
    portfolio.autoRebalanceEnabled = enabled;
    this.portfolios.set(this.currentSender, portfolio);
    
    return { success: true };
  }
  
  updateRebalanceThreshold(newThreshold: number): { success: boolean, error?: number } {
    const portfolio = this.portfolios.get(this.currentSender);
    if (!portfolio) {
      return { success: false, error: this.ERR_PORTFOLIO_NOT_FOUND };
    }
    
    if (newThreshold > 10000) {
      return { success: false, error: this.ERR_INVALID_ALLOCATION };
    }
    
    portfolio.rebalanceThreshold = newThreshold;
    this.portfolios.set(this.currentSender, portfolio);
    
    return { success: true };
  }
  
  // Read-only functions
  getPortfolio(owner: string): any {
    return this.portfolios.get(owner);
  }
  
  getAsset(owner: string, assetId: number): any {
    const assetKey = this.getAssetKey(owner, assetId);
    return this.portfolioAssets.get(assetKey);
  }
  
  getAssetPrice(assetId: number): any {
    return this.assetPrices.get(assetId);
  }
  
  getCurrentAllocations(owner: string): { success: boolean, allocations?: any[], error?: number } {
    const portfolioValue = this.calculatePortfolioValue(owner);
    if (portfolioValue <= 0) {
      return { success: true, allocations: [] };
    }
    
    const assetIds = [1, 2, 3, 4, 5];
    const allocations = assetIds.map(assetId => this.getAssetAllocation(owner, assetId, portfolioValue))
      .filter(allocation => allocation.assetName !== "");
    
    return { success: true, allocations };
  }
  
  private getAssetAllocation(owner: string, assetId: number, totalValue: number): any {
    const assetKey = this.getAssetKey(owner, assetId);
    const asset = this.portfolioAssets.get(assetKey);
    const price = this.assetPrices.get(assetId);
    
    if (!asset || !price) {
      return {
        assetId,
        assetName: "",
        currentAllocation: 0,
        targetAllocation: 0,
        currentAmount: 0
      };
    }
    
    const currentValue = asset.currentAmount * price.price;
    const currentAllocation = Math.floor((currentValue * 10000) / totalValue);
    
    return {
      assetId,
      assetName: asset.assetName,
      currentAllocation,
      targetAllocation: asset.targetAllocation,
      currentAmount: asset.currentAmount
    };
  }
}

describe("Auto-Rebalancer Protocol", () => {
  let rebalancer: MockAutoRebalancer;
  
  beforeEach(() => {
    rebalancer = new MockAutoRebalancer();
  });
  
  describe("Portfolio Management", () => {
    it("should create a portfolio successfully", () => {
      const result = rebalancer.createPortfolio(500); // 5% threshold
      
      expect(result.success).toBe(true);
      
      const portfolio = rebalancer.getPortfolio("contract-owner");
      expect(portfolio).toBeDefined();
      expect(portfolio.rebalanceThreshold).toBe(500);
      expect(portfolio.autoRebalanceEnabled).toBe(true);
    });
    
    it("should reject portfolio creation with invalid threshold", () => {
      const result = rebalancer.createPortfolio(12000); // 120% threshold
      
      expect(result.success).toBe(false);
      expect(result.error).toBe(102); // ERR_INVALID_ALLOCATION
    });
    
    it("should update rebalance threshold", () => {
      rebalancer.createPortfolio(500);
      const result = rebalancer.updateRebalanceThreshold(300);
      
      expect(result.success).toBe(true);
      
      const portfolio = rebalancer.getPortfolio("contract-owner");
      expect(portfolio.rebalanceThreshold).toBe(300);
    });
    
    it("should toggle auto-rebalance setting", () => {
      rebalancer.createPortfolio(500);
      const result = rebalancer.setAutoRebalance(false);
      
      expect(result.success).toBe(true);
      
      const portfolio = rebalancer.getPortfolio("contract-owner");
      expect(portfolio.autoRebalanceEnabled).toBe(false);
    });
  });
  
  describe("Asset Management", () => {
    beforeEach(() => {
      rebalancer.createPortfolio(500);
    });
    
    it("should add an asset successfully", () => {
      const result = rebalancer.addAsset(1, 5000, 100, "BTC"); // 50% allocation
      
      expect(result.success).toBe(true);
      
      const asset = rebalancer.getAsset("contract-owner", 1);
      expect(asset).toBeDefined();
      expect(asset.assetName).toBe("BTC");
      expect(asset.targetAllocation).toBe(5000);
      expect(asset.currentAmount).toBe(100);
    });
    
    it("should reject asset with invalid allocation", () => {
      const result = rebalancer.addAsset(1, 12000, 100, "BTC"); // 120% allocation
      
      expect(result.success).toBe(false);
      expect(result.error).toBe(102); // ERR_INVALID_ALLOCATION
    });
    
    it("should reject duplicate asset", () => {
      rebalancer.addAsset(1, 5000, 100, "BTC");
      const result = rebalancer.addAsset(1, 3000, 50, "BTC-Duplicate");
      
      expect(result.success).toBe(false);
      expect(result.error).toBe(105); // ERR_ASSET_EXISTS
    });
    
    it("should update asset price", () => {
      rebalancer.addAsset(1, 5000, 100, "BTC");
      const result = rebalancer.updateAssetPrice(1, 50000);
      
      expect(result.success).toBe(true);
      
      const price = rebalancer.getAssetPrice(1);
      expect(price).toBeDefined();
      expect(price.price).toBe(50000);
    });
    
    it("should reject price update from unauthorized user", () => {
      rebalancer.setSender("user1");
      const result = rebalancer.updateAssetPrice(1, 50000);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe(100); // ERR_NOT_AUTHORIZED
    });
  });
  
  describe("Portfolio Valuation", () => {
    beforeEach(() => {
      rebalancer.createPortfolio(500);
      rebalancer.addAsset(1, 5000, 10, "BTC"); // 50% target
      rebalancer.addAsset(2, 3000, 100, "ETH"); // 30% target
      rebalancer.addAsset(3, 2000, 1000, "USDC"); // 20% target
      
      rebalancer.updateAssetPrice(1, 50000); // BTC price
      rebalancer.updateAssetPrice(2, 3000);  // ETH price
      rebalancer.updateAssetPrice(3, 1);     // USDC price
    });
    
    it("should calculate portfolio value correctly", () => {
      const value = rebalancer.calculatePortfolioValue("contract-owner");
      
      // 10 BTC * 50000 + 100 ETH * 3000 + 1000 USDC * 1 = 500,000 + 300,000 + 1,000 = 801,000
      expect(value).toBe(801000);
    });
    
    it("should return current allocations", () => {
      const result = rebalancer.getCurrentAllocations("contract-owner");
      
      expect(result.success).toBe(true);
      expect(result.allocations).toBeDefined();
      expect(result.allocations!.length).toBe(3);
      
      // BTC: 500,000 / 801,000 ≈ 62.42%
      expect(result.allocations![0].assetName).toBe("BTC");
      expect(result.allocations![0].currentAllocation).toBeCloseTo(6242, -1);
      expect(result.allocations![0].targetAllocation).toBe(5000);
      
      // ETH: 300,000 / 801,000 ≈ 37.45%
      expect(result.allocations![1].assetName).toBe("ETH");
      expect(result.allocations![1].currentAllocation).toBeCloseTo(3745, -1);
      expect(result.allocations![1].targetAllocation).toBe(3000);
      
      // USDC: 1,000 / 801,000 ≈ 0.12%
      expect(result.allocations![2].assetName).toBe("USDC");
      expect(result.allocations![2].currentAllocation).toBeCloseTo(12, 0);
      expect(result.allocations![2].targetAllocation).toBe(2000);
    });
  });
  
  describe("Rebalancing", () => {
    beforeEach(() => {
      rebalancer.createPortfolio(500); // 5% threshold
      rebalancer.addAsset(1, 5000, 10, "BTC"); // 50% target
      rebalancer.addAsset(2, 3000, 100, "ETH"); // 30% target
      rebalancer.addAsset(3, 2000, 1000, "USDC"); // 20% target
      
      rebalancer.updateAssetPrice(1, 50000); // BTC price
      rebalancer.updateAssetPrice(2, 3000);  // ETH price
      rebalancer.updateAssetPrice(3, 1);     // USDC price
    });
    
    it("should detect when rebalancing is needed", () => {
      const result = rebalancer.checkRebalanceNeeded("contract-owner");
      
      expect(result.success).toBe(true);
      expect(result.result).toBe(true);
    });
    
    it("should execute rebalancing successfully", () => {
      const result = rebalancer.executeRebalance();
      
      expect(result.success).toBe(true);
      
      // Check that assets are now properly balanced
      const allocations = rebalancer.getCurrentAllocations("contract-owner");
      
      expect(allocations.allocations![0].currentAllocation).toBe(5000); // BTC now at 50%
      expect(allocations.allocations![1].currentAllocation).toBe(3000); // ETH now at 30%
      expect(allocations.allocations![2].currentAllocation).toBe(2000); // USDC now at 20%
    });
    
    it("should reject rebalancing when not needed", () => {
      // First rebalance to get to target allocations
      rebalancer.executeRebalance();
      
      // Try to rebalance again
      const result = rebalancer.executeRebalance();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe(104); // ERR_REBALANCE_NOT_NEEDED
    });
    
    it("should reject rebalancing when auto-rebalance is disabled", () => {
      rebalancer.setAutoRebalance(false);
      const result = rebalancer.executeRebalance();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe(100); // ERR_NOT_AUTHORIZED
    });
  });
  
  describe("Edge Cases", () => {
    beforeEach(() => {
      rebalancer.createPortfolio(500);
    });
    
    it("should handle empty portfolio", () => {
      const value = rebalancer.calculatePortfolioValue("contract-owner");
      expect(value).toBe(0);
      
      const allocations = rebalancer.getCurrentAllocations("contract-owner");
      expect(allocations.allocations!.length).toBe(0);
    });
    
    it("should handle assets with no price data", () => {
      rebalancer.addAsset(1, 5000, 10, "BTC");
      
      const value = rebalancer.calculatePortfolioValue("contract-owner");
      expect(value).toBe(0);
    });
    
    it("should handle price changes affecting allocation", () => {
      rebalancer.addAsset(1, 5000, 10, "BTC");
      rebalancer.addAsset(2, 5000, 100, "ETH");
      
      rebalancer.updateAssetPrice(1, 10000);
      rebalancer.updateAssetPrice(2, 1000);
      
      // Initial allocations: BTC = 100,000, ETH = 100,000 (50/50)
      let allocations = rebalancer.getCurrentAllocations("contract-owner");
      expect(allocations.allocations![0].currentAllocation).toBe(5000);
      expect(allocations.allocations![1].currentAllocation).toBe(5000);
      
      // Price change
      rebalancer.updateAssetPrice(1, 20000);
      
      // New allocations: BTC = 200,000, ETH = 100,000 (66.7/33.3)
      allocations = rebalancer.getCurrentAllocations("contract-owner");
      expect(allocations.allocations![0].currentAllocation).toBeCloseTo(6667, -1);
      expect(allocations.allocations![1].currentAllocation).toBeCloseTo(3333, -1);
      
      // This should trigger rebalancing need
      const needsRebalance = rebalancer.checkRebalanceNeeded("contract-owner");
      expect(needsRebalance.result).toBe(true);
    });
    
    it("should handle multiple users with separate portfolios", () => {
      // First user
      rebalancer.createPortfolio(500);
      rebalancer.addAsset(1, 10000, 10, "BTC"); // 100% allocation
      rebalancer.updateAssetPrice(1, 10000);
      
      // Second user
      rebalancer.setSender("user2");
      rebalancer.createPortfolio(300);
      rebalancer.addAsset(2, 10000, 100, "ETH"); // 100% allocation
      rebalancer.updateAssetPrice(2, 1000);
      
      // Check first user's portfolio
      const value1 = rebalancer.calculatePortfolioValue("contract-owner");
      expect(value1).toBe(100000);
      
      // Check second user's portfolio
      const value2 = rebalancer.calculatePortfolioValue("user2");
      expect(value2).toBe(100000);
      
      // Portfolios should be independent
      const portfolio1 = rebalancer.getPortfolio("contract-owner");
      const portfolio2 = rebalancer.getPortfolio("user2");
      
      expect(portfolio1.rebalanceThreshold).toBe(500);
      expect(portfolio2.rebalanceThreshold).toBe(300);
    });
  });
  
  describe("Time-Based Operations", () => {
    beforeEach(() => {
      rebalancer.createPortfolio(500);
      rebalancer.addAsset(1, 5000, 10, "BTC");
      rebalancer.addAsset(2, 5000, 100, "ETH");
      rebalancer.updateAssetPrice(1, 10000);
      rebalancer.updateAssetPrice(2, 1000);
    });
    
    it("should update last rebalance time after rebalancing", () => {
      // Initial block height
      expect(rebalancer.getPortfolio("contract-owner").lastRebalance).toBe(1000);
      
      // Change price to trigger rebalance need
      rebalancer.updateAssetPrice(1, 20000);
      
      // Advance block height
      rebalancer.setBlockHeight(1500);
      
      // Execute rebalance
      rebalancer.executeRebalance();
      
      // Check that last rebalance time was updated
      expect(rebalancer.getPortfolio("contract-owner").lastRebalance).toBe(1500);
    });
    
    it("should track price update times", () => {
      rebalancer.setBlockHeight(1200);
      rebalancer.updateAssetPrice(1, 15000);
      
      const price = rebalancer.getAssetPrice(1);
      expect(price.lastUpdated).toBe(1200);
    });
  });
});