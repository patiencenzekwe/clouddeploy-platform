# CloudDeploy Platform

> Secure Platform as a Service for government digital service deployment

## Overview

CloudDeploy demonstrates production DevOps practices for deploying government digital services using containerization, infrastructure as code, and automated deployment pipelines.

## Architecture

**3-Tier Application:**
- **Frontend**: NGINX serving static web interface
- **Backend**: Node.js REST API
- **Database**: PostgreSQL with persistent storage

**Observability:**
- **Monitoring**: Prometheus + cAdvisor for metrics collection
- **Retention**: 15-day time-series data storage
- **Coverage**: CPU, Memory, Disk I/O, Container health

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

# Verify deployment
docker compose ps

# Access services
open http://localhost              # Application
open http://localhost:9090         # Prometheus
open http://localhost:8081         # cAdvisor

# Stop services
docker compose down
```

## Monitoring & Observability

CloudDeploy includes production-grade monitoring infrastructure:

- **Prometheus**: Time-series metrics database with 15-day retention
- **cAdvisor**: Container metrics collection (CPU, memory, disk I/O)

**Metrics Coverage:**
- ✅ CPU usage per container
- ✅ Memory consumption tracking
- ✅ Disk I/O monitoring
- ✅ Container health status
- ⚠️ Network metrics (unavailable on Docker Desktop)

**Access Monitoring:**
```bash
# Prometheus UI (metrics & queries)
http://localhost:9090

# cAdvisor UI (container details)
http://localhost:8081
```

See [Monitoring Architecture](docs/monitoring-architecture.md) for complete PromQL query reference and troubleshooting guide.

## Technology Stack

**Current:**
- **Containers**: Docker, Docker Compose
- **Backend**: Node.js 25, Express.js
- **Database**: PostgreSQL 18-alpine
- **Frontend**: HTML5, Vanilla JavaScript, NGINX 1.27
- **Monitoring**: Prometheus 2.51, cAdvisor 0.47

**Planned:**
- **Infrastructure**: Terraform (AWS VPC, ECS, RDS)
- **Orchestration**: Kubernetes (EKS)
- **CI/CD**: GitHub Actions
- **Security**: AWS Secrets Manager, WAF, GuardDuty

## Documentation

- [Docker Compose Architecture](docs/docker-compose-architecture.md) - Multi-container orchestration
- [Dockerfile Decisions](docs/dockerfile-decisions.md) - Container image build strategies
- [Monitoring Architecture](docs/monitoring-architecture.md) - Prometheus observability stack

## Project Status

🟢 **Active Development** - Monitoring infrastructure complete

**Current Phase**: Local development environment with observability  
**Next Milestone**: AWS production deployment with Terraform

## Roadmap

- [x] Three-tier application architecture
- [x] Docker containerization
- [x] Health check implementation
- [x] Prometheus monitoring stack
- [ ] Grafana dashboards
- [ ] AWS infrastructure (Terraform)
- [ ] Kubernetes deployment (EKS)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Production security hardening

## License

MIT

## Contact

**Patience Nzekwe**  
DevOps Engineer  
[GitHub](https://github.com/patiencenzekwe)