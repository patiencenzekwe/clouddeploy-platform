# CloudDeploy Platform

> Secure Platform as a Service for government digital service deployment

## Overview

CloudDeploy demonstrates production DevOps practices for deploying government digital services using containerization, infrastructure as code, and automated deployment pipelines.

## Architecture

**3-Tier Application:**
- **Frontend**: NGINX serving static web interface
- **Backend**: Node.js REST API
- **Database**: PostgreSQL with persistent storage

## Quick Start

### Prerequisites
- Docker Desktop 29+
- Git 2.5+

### Local Deployment
```bash
# Clone repository
git clone https://github.com/patiencenzekwe/clouddeploy-platform.git
cd clouddeploy-platform

# Start all services
docker compose up -d

# Access application
open http://localhost

# Stop services
docker compose down
```

## Technology Stack

- **Containers**: Docker, Docker Compose
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL 18
- **Frontend**: HTML5, Vanilla JavaScript, NGINX
- **Infrastructure**: Terraform (planned)
- **Orchestration**: Kubernetes (planned)

## Project Status

🟢 Active Development

## License

MIT

## Contact

**Patience Nzekwe**  
DevOps Engineer  
[GitHub](https://github.com/patiencenzekwe)