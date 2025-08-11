# Deployment Guide

This guide covers local usage with Docker and notes for staging/production.

## Local (Docker)

1) Copy environment
```
cp env.example .env
```

2) Start services
```
docker-compose up -d --build
```

3) Deploy contracts to Hardhat (docker network)
```
docker exec rsu_evoting_blockchain sh -lc "npx hardhat run scripts/deploy-advanced.js --network docker | cat"
```
ABIs are written to `blockchain/deployments/` and mounted into the backend.

4) Restart backend to reload ABIs/addresses
```
docker-compose restart backend
```

5) Access
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

6) Test credentials
- Admin: email `admin@rsu.edu.ng`, password `admin123`
- Voter: login with matric number (e.g., `DE.2021/4311`) after admin authorization and first-time setup. Save the displayed private key; it is required to vote.

Helpers (dev only):
- Faucet: POST /api/admin/blockchain/faucet { address, amountEther }
- Time travel: POST /api/admin/blockchain/time-increase { seconds }

## Staging/Production Notes
- Use external RPC (e.g., Sepolia) and set: BLOCKCHAIN_URL, PRIVATE_KEY, contract addresses
- Set FRONTEND_URL for CORS and NODE_ENV=production
- Secure JWT_SECRET and DB credentials; enable HTTPS behind a reverse proxy
- Use managed MySQL and backups

## Example prod compose (template)
Create `docker-compose.prod.yml` and set real env values.
```
services:
  backend:
    image: org/rsu-evoting-backend:latest
    environment:
      - NODE_ENV=production
      - FRONTEND_URL=https://evote.example.com
      - BLOCKCHAIN_URL=https://rpc.sepolia.org
      - PRIVATE_KEY=0x...
      - ADVANCED_VOTING_CONTRACT=0x...
      - JWT_SECRET=...
      - DB_HOST=db
      - DB_PORT=3306
      - DB_NAME=rsu_evoting
      - DB_USER=evoting_user
      - DB_PASSWORD=...
    ports:
      - "5000:5000"
  frontend:
    image: org/rsu-evoting-frontend:latest
    environment:
      - REACT_APP_BACKEND_URL=https://api.example.com
    ports:
      - "80:3000"
```
