# Docker Compose Architecture

## Overview

CloudDeploy uses Docker Compose to orchestrate a 3-tier application
consisting of frontend (NGINX), backend (Node.js), and database
(PostgreSQL) services.

## Services

### Database Service (postgres:18-alpine)
**Role**: Data persistence layer
**Image**: Official PostgreSQL 18 on Alpine Linux
**Port**: 5432 (published for development access)
**Volume**: Named volume `postgres_data` for data persistence
**Health Check**: Uses `pg_isready` to verify database readiness

**Startup Priority**: First (no dependencies)

**Why Alpine**: 
- Minimal footprint (~250MB vs 600MB for standard Postgres)
- Security: Fewer packages = smaller attack surface
- Standard for containerized databases

---

### Backend Service (Node.js + Express)
**Role**: REST API serving government services data
**Build**: Custom image from `./backend/Dockerfile`
**Port**: 8080 (API endpoint)
**Dependencies**: Waits for database health check before starting

**Key Configuration**:
```yaml
environment:
  DB_HOST: database  # Service discovery via Docker DNS
  DB_PORT: 5432
  # ... other config
depends_on:
  database:
    condition: service_healthy  # Waits for DB readiness
```

**Service Discovery**:
The backend connects to the database using the service name `database`,
which Docker's internal DNS resolves to the container's IP address.
This provides location-independent connectivity.

**Startup Priority**: Second (after database healthy)

---

### Frontend Service (NGINX)
**Role**: Web server for static HTML/CSS/JavaScript
**Build**: Custom image from `./frontend/Dockerfile`
**Port**: 80 (HTTP)
**Dependencies**: Backend container existence (not health)

**Why NGINX**:
- Optimized for static file serving
- Production-grade web server
- Minimal resource usage (~40MB image)

**Note**: Frontend serves static files only. Browser JavaScript
makes direct API calls to backend. No server-to-server communication
between frontend and backend services.

**Startup Priority**: Third (after backend exists)

---

## Networking

### Automatic Network Creation
Docker Compose automatically creates a bridge network
(default name: `clouddeploy-platform_default`) that connects
all services.

### Service Discovery
Services communicate using service names as hostnames:
backend → database:5432
(Docker DNS resolves 'database' to container IP)

### DNS Resolution
Docker provides internal DNS at `127.0.0.11` that resolves
service names to container IP addresses, enabling portable
configuration.

---

## Volumes

### postgres_data (Named Volume)
**Purpose**: Persist database data across container lifecycle
**Type**: Named volume (Docker-managed)
**Mount Point**: `/var/lib/postgresql/data` inside container

**Persistence Behavior**:
- `docker compose down`: Volume persists ✅
- `docker compose down -v`: Volume deleted ⚠️
- New container automatically mounts existing volume

**Why Named Volume**:
- Docker optimizes storage location
- Cross-platform compatibility
- Better performance than bind mounts for databases
- Standard practice for stateful services

---

## Startup Orchestration

### Dependency Chain
database (starts first)
↓ (waits for health check: pg_isready)
backend (starts second)
↓ (no health check required)
frontend (starts third)

### Health Check Flow
1. Database container starts (0s)
2. Health checks begin every 10s
3. After 5 consecutive passes (~50s), marked healthy
4. Backend starts immediately after database healthy
5. Frontend starts after backend container exists

### Why This Matters
Prevents race conditions where backend attempts database
connection before PostgreSQL is ready to accept connections.

---

## Commands

### Start All Services
```bash
docker compose up -d
```

### View Logs
```bash
docker compose logs -f
docker compose logs backend  # specific service
```

### Stop Services
```bash
docker compose stop    # stop but keep containers
docker compose down    # stop and remove containers
docker compose down -v # stop, remove containers AND volumes
```

### Rebuild After Code Changes
```bash
docker compose up --build -d
```

### Check Status
```bash
docker compose ps
docker ps  # shows container names, ports, status
```

---

## Interview Talking Points

### Multi-Container Orchestration
"I use Docker Compose to orchestrate three services: PostgreSQL
for persistence, Node.js for the API layer, and NGINX for serving
the web interface. Compose manages the network, volumes, and startup
order, ensuring reliable operation with a single command."

### Service Discovery
"Docker Compose provides automatic service discovery through its
internal DNS. Services communicate using service names rather than
IP addresses, making the application portable across environments.
The backend connects to 'database:5432', which Docker resolves
dynamically."

### Dependency Management
"I use depends_on with service_healthy condition to enforce proper
startup order. The backend waits for PostgreSQL's health check to
pass before starting, preventing connection errors during
initialization. This is critical for production reliability."

### Data Persistence
"I use a named volume for PostgreSQL to ensure data persists across
container lifecycle. The volume is Docker-managed, providing
cross-platform compatibility and optimized performance. Application
services are stateless, getting their data from the database."

### Health Checks
"Health checks ensure true service readiness, not just container
startup. The database health check uses pg_isready to verify
PostgreSQL is accepting connections. This enables dependent services
to wait for actual operational readiness."

---

## Production Considerations

### Current Setup (Development)
✅ Hardcoded passwords (acceptable for local dev)
✅ Published database port (useful for debugging)
✅ Single-instance services (sufficient for development)

### Production Changes Required
- [ ] Use secrets management (AWS Secrets Manager)
- [ ] Remove published database port (security)
- [ ] Add resource limits (memory, CPU)
- [ ] Implement rolling updates
- [ ] Use container orchestration (Kubernetes)

---

## Evolution to Production

### AWS Deployment
Docker Compose principles translate to AWS ECS task definitions
and RDS configuration. Service orchestration concepts remain
consistent while infrastructure scales.

### Kubernetes Migration
Services become Deployments, depends_on becomes init containers,
volumes become PersistentVolumeClaims. The multi-tier architecture
maps directly to K8s resources.

### CI/CD Integration
docker-compose used in CI pipeline for testing before deployment
to production environments. Enables consistent testing across
development and production.

---

## Related Documentation

**Monitoring Stack**: See [Monitoring Architecture](monitoring-architecture.md) 
for Prometheus and cAdvisor observability infrastructure.

**Dockerfile Details**: See [Dockerfile Decisions](dockerfile-decisions.md)
for container image build strategies.

---

## Project Status

**Architecture**: Three-tier application (frontend → backend → database)  
**Container Count**: 3 services  
**Orchestration**: Automated dependency management with health checks  
**Data Persistence**: Named volumes for stateful PostgreSQL data  
**Network**: Automatic service discovery via Docker DNS  
**Monitoring**: Prometheus/cAdvisor stack documented separately  

## Implementation Roadmap

### Application Stack ✅ Complete
- [x] Multi-container orchestration
- [x] Service discovery via Docker DNS
- [x] Health check-based startup ordering
- [x] Data persistence with named volumes
- [x] Three-tier architecture implementation

### Infrastructure Extensions ✅ Complete
- [x] Monitoring integration (Prometheus, cAdvisor)
  - See [Monitoring Architecture](monitoring-architecture.md)

### Planned Production Enhancements 📋
- [ ] Production secrets management (AWS Secrets Manager)
- [ ] Resource limits and quotas
- [ ] Container registry integration
- [ ] Automated deployment pipelines
- [ ] Multi-environment configuration