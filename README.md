# UIE Multi-Region Backend

This repository provides a complete guide for setting up a globally distributed backend infrastructure for HubSpot UI Extensions, specifically designed to minimize latency for app cards. The setup consists of two main components:

1. A geo-sharded MongoDB Atlas cluster for distributed data storage
2. A Vercel serverless API deployment leveraging Edge Network regions

## Purpose

This infrastructure is designed to complement the guidance provided in the HubSpot Developer Blog article "Minimizing Latency: A Guide to High‑Performance App Cards on HubSpot." The setup enables:

- Data storage closest to your users through MongoDB's geo-sharding
- Low-latency API responses via Vercel's Edge Network
- Globally distributed request handling
- Automatic scaling based on demand


## Getting Started

The setup process is divided into two main parts:

1. [MongoDB Atlas Setup](./mongodb-atlas/README.md)
   - Installing required CLIs
   - Creating a geo-sharded cluster
   - Configuring network access and database users
   - Setting up collections with global writes
   - Testing data distribution

2. [Vercel API Setup](./vercel/README.md)
   - Setting up Vercel account and CLI
   - Deploying the serverless API
   - Configuring environment variables
   - Testing the API endpoints

## Cost Considerations

Please note that this setup involves costs:
- MongoDB Atlas uses M30 dedicated clusters
- Vercel may require a Pro/Enterprise plan for multiple regions
- Remember to pause or terminate clusters when not in use

## Prerequisites

- MongoDB Atlas account
- Vercel account
- Node.js and npm installed
- Basic understanding of MongoDB and REST APIs

## Next Steps

After completing the setup, you can:
1. Use the Vercel API endpoint in your HubSpot UI Extension
2. Implement the API calls using `hubspot.fetch()`
3. Monitor performance across different regions


