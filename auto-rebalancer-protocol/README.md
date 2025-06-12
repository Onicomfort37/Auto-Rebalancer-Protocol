# Auto-Rebalancer Protocol

![Auto-Rebalancer Protocol](https://placeholder.svg?height=200&width=800&text=Auto-Rebalancer+Protocol)

A sophisticated automated portfolio rebalancing system built on the Stacks blockchain using Clarity smart contracts. This protocol enables users to maintain target asset allocations through automated rebalancing based on configurable drift thresholds.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Installation](#installation)
- [Usage](#usage)
- [Function Documentation](#function-documentation)
- [Security](#security)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

## Overview

The Auto-Rebalancer Protocol revolutionizes portfolio management by providing automated, trustless rebalancing of digital asset portfolios. Users can set target allocations for their assets and define drift thresholds that trigger automatic rebalancing when exceeded. The protocol ensures portfolios maintain their intended risk profiles without manual intervention.

## Features

### 🎯 Automated Portfolio Management
- **Target Allocation Setting**: Define precise percentage allocations for each asset
- **Drift Detection**: Automatic monitoring of allocation deviations from targets
- **Threshold-Based Rebalancing**: Configurable drift thresholds (e.g., 5% deviation)
- **Auto-Execution**: Seamless rebalancing when thresholds are exceeded

### 📊 Advanced Analytics
- **Real-Time Valuation**: Continuous portfolio value calculation
- **Allocation Tracking**: Monitor current vs. target allocations
- **Performance Metrics**: Track rebalancing history and effectiveness
- **Multi-Asset Support**: Support for up to 5 different assets per portfolio

### 🔧 Flexible Configuration
- **Custom Thresholds**: Set rebalancing triggers from 0.01% to 100%
- **Enable/Disable Controls**: Toggle auto-rebalancing on demand
- **Asset Management**: Add, remove, and modify asset allocations
- **Price Oracle Integration**: External price feed support for accurate valuations

### 🛡️ Security & Control
- **Owner-Only Operations**: Secure asset and price management
- **Validation Checks**: Comprehensive input validation and error handling
- **Transparent Operations**: All rebalancing activities recorded on-chain
- **Emergency Controls**: Ability to disable auto-rebalancing when needed

## Architecture

### Core Components

#### Smart Contract Maps
- **portfolios**: User portfolio configurations and metadata
- **portfolio-assets**: Individual asset holdings and target allocations
- **asset-prices**: Current asset prices and update timestamps

#### Rebalancing Engine
The protocol uses a sophisticated drift detection algorithm that:
1. Calculates current portfolio value across all assets
2. Determines actual allocation percentages
3. Compares against target allocations
4. Identifies maximum drift across all assets
5. Triggers rebalancing when drift exceeds threshold

#### Price Management
- Oracle-based price feeds for accurate asset valuation
- Timestamp tracking for price freshness validation
- Owner-controlled price updates for security

### Data Flow

```
Price Updates → Portfolio Valuation → Drift Calculation → Rebalancing Decision → Asset Redistribution
```

### Allocation Algorithm

The protocol uses a proportional rebalancing approach:

1. **Calculate Target Values**: `Target Value = (Portfolio Value × Target Allocation) / 10000`
2. **Determine Required Amounts**: `Target Amount = Target Value / Asset Price`
3. **Execute Rebalancing**: Update asset amounts to match target allocations

## Installation

### Prerequisites
- [Clarinet](https://github.com/hirosystems/clarinet) for local development
- [Stacks CLI](https://docs.stacks.co/references/stacks-cli) for deployment
- Node.js 16+ for testing and tooling

### Local Development

1. **Clone the repository**:
```bash
git clone https://github.com/yourusername/auto-rebalancer-protocol.git
cd auto-rebalancer-protocol
```

2. **Install dependencies**:
```bash
npm install
```

3. **Start Clarinet console**:
```bash
clarinet console
```

4. **Run tests**:
```bash
npm test
```

### Deployment

1. **Configure deployment settings**:
```toml
# Clarinet.toml
[network]
name = "testnet"
node_rpc_address = "https://stacks-node-api.testnet.stacks.co"
```

2. **Deploy to testnet**:
```bash
clarinet deploy --testnet
```

3. **Deploy to mainnet**:
```bash
clarinet deploy --mainnet
```

## Usage

### Create a Portfolio

```clarity
;; Create a portfolio with 5% rebalancing threshold
(contract-call? .auto-rebalancer-protocol create-portfolio u500)
```

### Add Assets to Portfolio

```clarity
;; Add Bitcoin with 50% target allocation
(contract-call? .auto-rebalancer-protocol add-asset 
  u1          ;; asset ID
  u5000       ;; 50% allocation (5000/10000)
  u10         ;; initial amount (10 units)
  "BTC"       ;; asset name
)

;; Add Ethereum with 30% target allocation
(contract-call? .auto-rebalancer-protocol add-asset 
  u2          ;; asset ID
  u3000       ;; 30% allocation
  u100        ;; initial amount
  "ETH"       ;; asset name
)

;; Add USDC with 20% target allocation
(contract-call? .auto-rebalancer-protocol add-asset 
  u3          ;; asset ID
  u2000       ;; 20% allocation
  u1000       ;; initial amount
  "USDC"      ;; asset name
)
```

### Update Asset Prices (Oracle/Admin Only)

```clarity
;; Update Bitcoin price to $50,000
(contract-call? .auto-rebalancer-protocol update-asset-price u1 u50000)

;; Update Ethereum price to $3,000
(contract-call? .auto-rebalancer-protocol update-asset-price u2 u3000)

;; Update USDC price to $1
(contract-call? .auto-rebalancer-protocol update-asset-price u3 u1)
```

### Check Rebalancing Status

```clarity
;; Check if rebalancing is needed
(contract-call? .auto-rebalancer-protocol check-rebalance-needed tx-sender)

;; Get current allocations
(contract-call? .auto-rebalancer-protocol get-current-allocations tx-sender)
```

### Execute Rebalancing

```clarity
;; Execute automatic rebalancing
(contract-call? .auto-rebalancer-protocol execute-rebalance)
```

### Portfolio Management

```clarity
;; Disable auto-rebalancing
(contract-call? .auto-rebalancer-protocol set-auto-rebalance false)

;; Update rebalancing threshold to 3%
(contract-call? .auto-rebalancer-protocol update-rebalance-threshold u300)

;; Re-enable auto-rebalancing
(contract-call? .auto-rebalancer-protocol set-auto-rebalance true)
```

## Function Documentation

### Public Functions

#### Portfolio Management
- **create-portfolio(rebalance-threshold)**: Initialize a new portfolio with specified drift threshold
- **set-auto-rebalance(enabled)**: Enable or disable automatic rebalancing
- **update-rebalance-threshold(new-threshold)**: Modify the drift threshold for rebalancing

#### Asset Management
- **add-asset(asset-id, target-allocation, initial-amount, asset-name)**: Add a new asset to the portfolio
- **update-asset-price(asset-id, new-price)**: Update asset price (admin only)

#### Rebalancing Operations
- **check-rebalance-needed(owner)**: Check if portfolio requires rebalancing
- **execute-rebalance()**: Perform automatic portfolio rebalancing

#### Read-Only Functions
- **get-portfolio(owner)**: Retrieve portfolio configuration and status
- **get-asset(owner, asset-id)**: Get specific asset information
- **get-asset-price(asset-id)**: Retrieve current asset price
- **get-current-allocations(owner)**: Get detailed allocation breakdown

### Error Codes

| Code | Constant | Description |
|------|----------|-------------|
| 100 | ERR-NOT-AUTHORIZED | Caller lacks required permissions |
| 101 | ERR-INVALID-ASSET | Asset does not exist or is invalid |
| 102 | ERR-INVALID-ALLOCATION | Allocation percentage exceeds 100% |
| 103 | ERR-INSUFFICIENT-BALANCE | Insufficient balance for operation |
| 104 | ERR-REBALANCE-NOT-NEEDED | Portfolio is within drift threshold |
| 105 | ERR-ASSET-EXISTS | Asset already exists in portfolio |
| 106 | ERR-PORTFOLIO-NOT-FOUND | Portfolio does not exist |

## Security

### Security Features
- **Access Control**: Admin-only functions for critical operations
- **Input Validation**: Comprehensive validation of all parameters
- **Overflow Protection**: Safe arithmetic operations throughout
- **State Consistency**: Atomic operations prevent partial state updates

### Security Considerations
- **Oracle Security**: Ensure price feed oracles are trusted and secure
- **Admin Key Management**: Use hardware wallets or multi-sig for admin operations
- **Threshold Settings**: Set reasonable drift thresholds to prevent excessive rebalancing
- **Regular Monitoring**: Monitor portfolio performance and rebalancing frequency

### Best Practices
- **Gradual Deployment**: Start with small portfolios and conservative thresholds
- **Price Feed Validation**: Implement circuit breakers for extreme price movements
- **Emergency Procedures**: Maintain ability to disable auto-rebalancing quickly
- **Regular Audits**: Conduct periodic security reviews and code audits

## Testing

The protocol includes comprehensive test coverage using Vitest:

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- --grep "Portfolio Management"
npm test -- --grep "Rebalancing"

# Run tests with coverage
npm test -- --coverage
```

### Test Coverage Areas
- **Portfolio Creation and Management**: Portfolio lifecycle operations
- **Asset Management**: Adding, updating, and managing portfolio assets
- **Price Updates**: Oracle integration and price management
- **Rebalancing Logic**: Drift detection and rebalancing execution
- **Edge Cases**: Error conditions and boundary scenarios
- **Multi-User Scenarios**: Concurrent portfolio management

### Performance Testing
```bash
# Test with large portfolios
npm run test:performance

# Gas usage analysis
npm run test:gas
```

## Example Scenarios

### Scenario 1: Conservative Balanced Portfolio

```clarity
;; Create conservative portfolio with 2% rebalancing threshold
(contract-call? .auto-rebalancer-protocol create-portfolio u200)

;; 60% stocks, 40% bonds allocation
(contract-call? .auto-rebalancer-protocol add-asset u1 u6000 u100 "STOCKS")
(contract-call? .auto-rebalancer-protocol add-asset u2 u4000 u100 "BONDS")
```

### Scenario 2: Aggressive Crypto Portfolio

```clarity
;; Create aggressive portfolio with 10% rebalancing threshold
(contract-call? .auto-rebalancer-protocol create-portfolio u1000)

;; 70% BTC, 20% ETH, 10% stablecoin allocation
(contract-call? .auto-rebalancer-protocol add-asset u1 u7000 u10 "BTC")
(contract-call? .auto-rebalancer-protocol add-asset u2 u2000 u100 "ETH")
(contract-call? .auto-rebalancer-protocol add-asset u3 u1000 u1000 "USDC")
```

### Scenario 3: Dynamic Rebalancing

```clarity
;; Monitor and rebalance based on market conditions
(let ((needs-rebalance (unwrap! (contract-call? .auto-rebalancer-protocol check-rebalance-needed tx-sender) (err u0))))
  (if needs-rebalance
    (contract-call? .auto-rebalancer-protocol execute-rebalance)
    (ok false)
  )
)
```

## Roadmap

### Phase 1 (Current)
- ✅ Core rebalancing functionality
- ✅ Multi-asset portfolio support
- ✅ Configurable drift thresholds
- ✅ Comprehensive testing suite

### Phase 2 (In Development)
- 🔄 Advanced rebalancing strategies
- 🔄 Integration with DeFi protocols
- 🔄 Ga