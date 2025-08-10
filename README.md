# RSU E-Voting System

A secure, transparent, and user-friendly blockchain-based e-voting system for the Rivers State University (RSU) Department of Computer Science.

## 🎯 Overview

This system provides a complete electronic voting solution using blockchain technology to ensure transparency, security, and immutability of votes. The system supports departmental elections with role-based access for administrators and voters.

## 🏗️ Architecture

The project uses a three-tier architecture, fully containerized with Docker:

- **Frontend**: React.js with Material-UI
- **Backend**: Node.js with Express framework
- **Database**: MySQL for user data and election metadata
- **Blockchain**: Hardhat local Ethereum network
- **Smart Contracts**: Solidity for voting logic

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd rsu-evoting-system
   ```

2. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Start the application**
   ```bash
   docker-compose up --build
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Database: localhost:3306
   - Blockchain: http://localhost:8545

## 📁 Project Structure

```
rsu-evoting-system/
├── frontend/           # React.js application
├── backend/            # Node.js Express API
├── blockchain/         # Hardhat blockchain setup
├── database/           # MySQL initialization scripts
├── docker-compose.yml  # Docker services configuration
└── README.md
```

## 🔑 Key Features

### Admin Features
- Create and manage elections
- Add candidates to elections
- Manage voter registration
- Monitor real-time results
- Generate reports

### Voter Features
- Secure login with matriculation number
- Blockchain wallet generation
- Vote casting with transaction verification
- Vote confirmation and receipt

## 🛠️ Development

### Running Individual Services

**Frontend only:**
```bash
cd frontend
npm install
npm start
```

**Backend only:**
```bash
cd backend
npm install
npm run dev
```

**Blockchain only:**
```bash
cd blockchain
npm install
npm run node
```

### Database Access

```bash
# Connect to MySQL
docker exec -it rsu_evoting_db mysql -u evoting_user -p rsu_evoting
```

### Smart Contract Deployment

```bash
# Deploy contracts to local network
cd blockchain
npm run deploy-local
```

## 🔐 Security Features

- JWT-based authentication
- Bcrypt password hashing
- Rate limiting for API endpoints
- Input validation and sanitization
- Blockchain immutability for votes
- Anonymous voting with traceable authorization

## 📊 Workflow

1. **Admin Setup**: Create election, add candidates, register voters
2. **Voter Registration**: Students log in with matric number, receive blockchain wallet
3. **Authorization**: Backend authorizes voter addresses on smart contract
4. **Voting**: Voters cast votes through web interface
5. **Verification**: Votes recorded on blockchain with transaction hash
6. **Results**: Real-time vote counting with transparency

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Smart contract tests
cd blockchain
npm test

# Frontend tests
cd frontend
npm test
```

## 🚀 Deployment

### Production Environment

1. Update environment variables for production
2. Configure SSL certificates
3. Set up database backups
4. Deploy to cloud infrastructure

### Environment Variables

Key environment variables to configure:

- `JWT_SECRET`: Strong secret for JWT tokens
- `DB_PASSWORD`: Database password
- `BLOCKCHAIN_URL`: Blockchain network URL
- `NODE_ENV`: Set to 'production'

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support, please contact:
- RSU Computer Science Department
- Email: cs@rsu.edu.ng

## 🙏 Acknowledgments

- Rivers State University Computer Science Department
- Hardhat Development Framework
- React.js Community
- Ethereum Foundation
