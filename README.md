# Mantle PayBot

>**A Telegram bot for easy and scheduled MNT cryptocurrency transfers on the Mantle network.**

## Problem Statement

In the world of cryptocurrency, transferring funds can be complex and intimidating for non-technical users. Traditional methods require users to handle private keys, wallet addresses, and blockchain interactions directly, which can lead to errors, security risks, and a poor user experience. Additionally, scheduling payments or sending funds at specific times is not straightforward in most crypto wallets. Mantle PayBot addresses these issues by providing a simple, Telegram-based interface for sending and scheduling MNT (Mantle) cryptocurrency transfers, making crypto payments as easy as chatting with a bot.

## Features

- **Wallet Linking**: Users can link their wallet to their Telegram username via the smart contract, ensuring secure and verified associations.
- **Instant Transfers**: Send MNT immediately to any linked recipient using simple commands.
- **Scheduled Payments**: Schedule payments to be executed at a future time, with automatic processing.
- **User-Friendly Commands**:
  - `/start`: Display available commands.
  - `/link`: Link your wallet by entering your private key (or use 'demo' for testing).
  - `/sendnow @username amount`: Send MNT immediately to the specified user.
  - `/schedule @username amount delay_minutes`: Schedule a payment with a delay.
- **Automated Execution**: The bot automatically checks and executes scheduled payments using a cron job.
- **Security**: Private keys are handled securely, and transactions are signed and sent via the smart contract.

## Smart Contract Overview

The Mantle PayBot relies on a Solidity smart contract deployed on the Mantle network. The contract provides the following key functionalities:

- **linkWallet(string username)**: Associates a user's wallet address with their Telegram username on-chain.
- **schedulePayment(address recipient, address token, uint256 amount, uint256 executeAfter, uint256 value)**: Schedules a payment to be executed at a specific timestamp. The `recipient` is the wallet address, `token` can be the native token or an ERC-20, `amount` is the transfer amount, `executeAfter` is the Unix timestamp for execution, and `value` is the ETH/MNT value sent with the transaction.
- **payments(uint256 index)**: A view function to retrieve details of a scheduled payment by index.
- **executePayment(uint256 index)**: Executes a scheduled payment if the current time has passed the `executeAfter` timestamp and the payment hasn't been executed yet.

The contract ensures that payments are only executed once and at the correct time, providing a trustless way to handle delayed transfers. The ABI (Application Binary Interface) is stored in `abi.json` and loaded by the bot for interaction.

This setup allows for decentralized, automated payment processing without relying on centralized servers for execution timing.

## Business Model

Mantle PayBot operates on a sustainable business model designed to generate revenue while providing value to users in the cryptocurrency ecosystem. The primary revenue streams are outlined below:

### 1. Transaction Fees
- **Fee Structure**: A small percentage (e.g., 0.1% to 0.5%) of each transaction amount is charged as a service fee. This fee is deducted automatically during the transfer process via the smart contract.
- **Rationale**: Users benefit from the convenience and security of the bot, and the fee covers operational costs such as server maintenance, blockchain gas fees, and development.
- **Implementation**: Fees are collected in MNT or the transferred token and can be withdrawn by the bot operators periodically.

### 2. Freemium Model
- **Free Tier**: Basic features like wallet linking, instant transfers, and simple scheduling are available for free to attract users and build a community.
- **Premium Features**: Advanced options such as bulk scheduling, priority execution, multi-token support, and analytics dashboards are offered as paid upgrades.
- **Pricing**: Subscription-based (e.g., $5/month for premium) or one-time payments for specific features.
- **Monetization**: Encourages user retention and upselling, with premium users contributing to higher revenue.

### 3. Partnerships and Integrations
- **Affiliate Fees**: Partner with crypto exchanges, wallets, or DeFi platforms for referral fees when users link external accounts or convert currencies.
- **API Licensing**: Offer the bot's API or smart contract integration to third-party services for a licensing fee.
- **Sponsored Features**: Integrate sponsored tokens or services, earning commissions on user interactions.

### 4. Data and Analytics (Optional)
- **User Insights**: Aggregate anonymized data on transaction patterns to sell insights to market researchers or advertisers in the crypto space.
- **Compliance**: Ensure all data handling complies with privacy regulations like GDPR.

### Revenue Projections
- **Initial Phase (Launch to 6 months)**: Focus on user acquisition with minimal fees; aim for 10,000 active users, generating $10,000-$20,000 in fees.
- **Growth Phase (6-18 months)**: Introduce premium features; target 50,000 users, with revenue from subscriptions and fees reaching $50,000-$100,000 quarterly.
- **Scaling Phase (18+ months)**: Expand to other networks; potential for partnerships to boost revenue to $200,000+ quarterly.

The business model emphasizes transparency, with all fees disclosed upfront, and prioritizes user trust to foster long-term adoption.

## Roadmap

The roadmap is divided into key phases for development and growth:

- **Phase 1: Core Launch (Q1-Q2 2026)**: Deploy smart contract, launch Telegram bot with basic wallet linking, instant and scheduled transfers. Achieve 1,000 users and validate functionality.
- **Phase 2: Feature Expansion (Q3-Q4 2026)**: Add multi-token support, advanced scheduling, user dashboards, and marketing. Reach 10,000 users and start revenue through fees.
- **Phase 3: Monetization and Partnerships (2027)**: Introduce premium features, subscriptions, and partnerships with DeFi projects. Grow to 25,000 users with 20% premium conversion.
- **Phase 4: Scaling and Innovation (2027+)**: Expand to multi-chain, add AI features, develop mobile app, and integrate exchanges. Target 100,000+ users and establish as a leading tool.

Ongoing: User feedback, security audits, and sustainability focus.

## Images
