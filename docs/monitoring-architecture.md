# Monitoring Architecture

## Overview

CloudDeploy implements production-grade observability using Prometheus for 
metrics collection and storage, with cAdvisor providing container-level metrics.

## Architecture Diagram
┌─────────────────────────────────────────────────┐
│              Prometheus Server                   │
│         (Time-Series Database)                   │
│              Port: 9090                          │
│         Storage: prometheus_data                 │
└────────┬────────────────────┬───────────────────┘
         │                    │
         │ Scrapes every 15s  │
         │                    │
    ┌────▼────┐         ┌─────▼──────┐
    │ cAdvisor│         │  Backend   │
    │ :8080   │         │  :8080     │
    └────┬────┘         └─────┬──────┘
         │                    │
         │ Reads              │ Exposes
         │ Container          │ /metrics
         │ Stats              │ (Planned)
         │                    │
    ┌────▼──────────────┬─────▼──────┐
    │  Docker Daemon    │   Node.js  │
    │  (Container       │   API      │
    │   Metrics)        │            │
    └───────────────────┴────────────┘

## Components

### Prometheus (prom/prometheus:v2.51.0)
**Purpose**: Time-series database for metrics collection, storage, and querying

**Key Features**:
- Pull-based metric collection every 15 seconds
- Time-series database with 15-day retention
- PromQL query language for data analysis
- Built-in web UI for visualization and debugging
- Foundation for Grafana dashboards

**Configuration**: `infrastructure/monitoring/prometheus.yml`

**Data Persistence**: `prometheus_data` Docker volume

**Access**: http://localhost:9090

**Resource Usage**:
- Memory: ~40-50 MB
- CPU: ~0.02 cores (idle)
- Disk: ~1 GB per week

---

### cAdvisor (Container Advisor v0.47.0)
**Purpose**: Container metrics collection and exposure

**What It Monitors**:
- CPU usage per container (time spent in user/system mode)
- Memory usage per container (working set, RSS, cache)
- Disk I/O per container (read/write bytes and operations)
- Container lifecycle events (start time, uptime)
- File system usage per container

**How It Works**:
1. Mounts Docker socket and host filesystem (read-only)
2. Reads container statistics from Docker daemon
3. Exposes metrics at `/metrics` endpoint in Prometheus format
4. Prometheus scrapes this endpoint every 15 seconds

**Access**: 
- UI: http://localhost:8081
- Metrics: http://localhost:8081/metrics

**Resource Usage**:
- Memory: ~30-35 MB
- CPU: ~0.01 cores (idle)

---

### Backend Metrics Endpoint (Planned)
**Purpose**: Application-level metrics

**Planned Metrics**:
- HTTP request count per endpoint (`http_requests_total`)
- Request duration histogram (`http_request_duration_seconds`)
- Error rate per endpoint (`http_errors_total`)
- Database query duration (`db_query_duration_seconds`)
- Active connections (`active_connections`)

**Implementation**: Prometheus client library (`prom-client` for Node.js)

**Endpoint**: http://backend:8080/metrics

---

## Metrics Being Collected

### Available Metrics (5 Categories)

#### 1. CPU Metrics ✅ WORKING
container_cpu_usage_seconds_total      # Cumulative CPU time (user + system)
container_cpu_system_seconds_total     # CPU time in kernel mode
container_cpu_user_seconds_total       # CPU time in user mode

**Typical Values**:
- PostgreSQL: 0.01-0.05 cores (idle), up to 0.5 cores (active)
- Backend: 0.01-0.03 cores (idle), spikes during requests
- Frontend: <0.01 cores (NGINX is very efficient)

#### 2. Memory Metrics ✅ WORKING
container_memory_usage_bytes           # Total memory usage
container_memory_working_set_bytes     # Working set (active memory)
container_memory_rss                   # Resident set size
container_memory_cache                 # Page cache memory
container_memory_swap                  # Swap usage (should be 0)

**Typical Values**:
- PostgreSQL: ~50 MB (can grow with data)
- Backend: ~45 MB (Node.js runtime + modules)
- Frontend: ~2 MB (NGINX minimal footprint)
- Prometheus: ~40-50 MB (depends on retention)
- cAdvisor: ~30 MB

**Total Stack**: ~170 MB at idle

#### 3. Disk I/O Metrics ✅ WORKING
container_fs_reads_bytes_total         # Cumulative bytes read from disk
container_fs_writes_bytes_total        # Cumulative bytes written to disk
container_fs_reads_total               # Cumulative read operations
container_fs_writes_total              # Cumulative write operations

**Typical Patterns**:
- PostgreSQL: Highest disk activity (data persistence)
- Prometheus: High write activity (storing metrics)
- Backend: Minimal (stateless, queries database)
- Frontend: Near zero (serves static files from memory)

#### 4. Container Lifecycle ✅ WORKING
container_last_seen                    # Timestamp of last metric collection
container_start_time_seconds           # When container started (Unix timestamp)

**Use Cases**:
- Detect container crashes (last_seen stops updating)
- Calculate uptime
- Track restart frequency

#### 5. Prometheus Internal Metrics ✅ WORKING
prometheus_tsdb_head_samples           # Samples in memory
prometheus_http_requests_total         # API request count
prometheus_target_scrape_duration_seconds  # Scrape performance
up{job="docker"}                       # Target availability (1=up, 0=down)

### Unavailable Metrics (Platform Limitation)

#### 6. Network Metrics ❌ NOT AVAILABLE
container_network_receive_bytes_total  # ❌ Docker Desktop limitation
container_network_transmit_bytes_total # ❌ Docker Desktop limitation
container_network_receive_errors       # ❌ Docker Desktop limitation
container_network_transmit_errors      # ❌ Docker Desktop limitation

**Why**: Docker Desktop for Mac runs containers in a lightweight VM. The VM's
networking layer prevents cAdvisor from accessing per-container network statistics.

**Impact**: None for local development. CPU, Memory, and Disk I/O provide
comprehensive resource monitoring.

**Workaround**: Use `docker stats` for real-time network visibility:
```bash
docker stats --format "table {{.Container}}\t{{.NetIO}}"
```

**Production**: Network metrics fully available on:
- Linux hosts (EC2, bare metal)
- AWS ECS/EKS
- Kubernetes clusters
- Any non-VM container runtime

---

## PromQL Query Reference

### Understanding Query Syntax

**Label Filtering**:
- `{id!="/"}` - Exclude root container, show application containers only
- `{id=~"/docker.*"}` - Regex match for Docker container IDs
- `{job="docker"}` - Filter by Prometheus scrape job

**Time Ranges**:
- `[5m]` - Last 5 minutes
- `[1h]` - Last 1 hour
- `[1d]` - Last 1 day

**Functions**:
- `rate()` - Per-second rate of increase over time range
- `sum()` - Add values together
- `avg()` - Calculate average
- `topk(N, ...)` - Top N highest values
- `count()` - Count number of results

---

### CPU Queries

```promql
# CPU cores used per second (most useful for monitoring)
rate(container_cpu_usage_seconds_total{id!="/"}[5m])

# CPU usage as percentage (0-100 scale)
rate(container_cpu_usage_seconds_total{id!="/"}[5m]) * 100

# Average CPU across all containers
avg(rate(container_cpu_usage_seconds_total{id!="/"}[5m]))

# Total CPU consumed by entire stack
sum(rate(container_cpu_usage_seconds_total{id!="/"}[5m]))

# Top 3 CPU consumers
topk(3, rate(container_cpu_usage_seconds_total{id!="/"}[5m]))

# CPU usage for specific container (by ID pattern)
rate(container_cpu_usage_seconds_total{id=~".*postgres.*"}[5m])
```

**Interpretation**:
- Value of 1.0 = 100% of one CPU core
- Value of 0.5 = 50% of one core
- Value of 2.0 = 200% (using 2 full cores)

---

### Memory Queries

```promql
# Memory usage in bytes (raw value)
container_memory_usage_bytes{id!="/"}

# Memory usage in megabytes (human-readable)
container_memory_usage_bytes{id!="/"} / 1024 / 1024

# Memory usage in gigabytes
container_memory_usage_bytes{id!="/"} / 1024 / 1024 / 1024

# Total memory across all containers (MB)
sum(container_memory_usage_bytes{id!="/"}) / 1024 / 1024

# Top 3 memory consumers
topk(3, container_memory_usage_bytes{id!="/"})

# Memory usage as percentage (requires container_spec_memory_limit_bytes)
container_memory_usage_bytes{id!="/"} / container_spec_memory_limit_bytes{id!="/"} * 100

# Working set memory (more accurate for OOM risk)
container_memory_working_set_bytes{id!="/"} / 1024 / 1024
```

**Interpretation**:
- `memory_usage_bytes` - Total memory including cache
- `memory_working_set_bytes` - Active memory (better for limits)
- If working_set approaches limit → risk of OOM (Out of Memory)

---

### Disk I/O Queries

```promql
# Disk read rate (bytes per second)
rate(container_fs_reads_bytes_total{id!="/"}[5m])

# Disk write rate (bytes per second)
rate(container_fs_writes_bytes_total{id!="/"}[5m])

# Total disk I/O (read + write, bytes/second)
rate(container_fs_reads_bytes_total{id!="/"}[5m]) + 
rate(container_fs_writes_bytes_total{id!="/"}[5m])

# Disk reads in MB per second
rate(container_fs_reads_bytes_total{id!="/"}[5m]) / 1024 / 1024

# Disk writes in MB per second
rate(container_fs_writes_bytes_total{id!="/"}[5m]) / 1024 / 1024

# Top disk I/O consumers
topk(3, rate(container_fs_writes_bytes_total{id!="/"}[5m]))

# Read vs Write ratio (helpful for analysis)
rate(container_fs_reads_bytes_total{id!="/"}[5m]) / 
rate(container_fs_writes_bytes_total{id!="/"}[5m])
```

**Expected Patterns**:
- Database: High writes (data persistence), moderate reads
- Prometheus: Very high writes (metric storage)
- Application containers: Low disk I/O (stateless)

---

### Container Health Queries

```promql
# Number of running containers (should be 5)
count(container_last_seen{id!="/"})

# Container uptime in seconds
time() - container_start_time_seconds{id!="/"}

# Container uptime in hours
(time() - container_start_time_seconds{id!="/"}) / 3600

# Container uptime in days
(time() - container_start_time_seconds{id!="/"}) / 86400

# Containers started in last hour (detect restarts)
count(container_start_time_seconds{id!="/"} > (time() - 3600))

# Containers started in last 5 minutes (recent restarts)
count(container_start_time_seconds{id!="/"} > (time() - 300))
```

**Use Cases**:
- Alert if container count drops below 5
- Track container stability (frequent restarts = problem)
- Calculate availability percentage

---

### Aggregate System Queries

```promql
# Total CPU usage across entire stack
sum(rate(container_cpu_usage_seconds_total{id!="/"}[5m]))

# Total memory across entire stack (MB)
sum(container_memory_usage_bytes{id!="/"}) / 1024 / 1024

# Total disk writes per second
sum(rate(container_fs_writes_bytes_total{id!="/"}[5m]))

# Average memory per container
avg(container_memory_usage_bytes{id!="/"}) / 1024 / 1024

# System resource efficiency (memory used vs available)
sum(container_memory_usage_bytes{id!="/"}) / 8589934592 * 100
# Note: 8589934592 = 8GB in bytes (adjust for your system)
```

---

## Data Retention & Storage

**Retention Period**: 15 days (default)

**Storage Location**: `prometheus_data` Docker volume

**Estimated Storage**:
- ~70 MB per day
- ~500 MB per week
- ~2 GB per month
- ~1 GB for 15 days

**Customizing Retention**:
Add to Prometheus command in `docker-compose.yml`:
```yaml
command:
  - '--storage.tsdb.retention.time=30d'  # 30 days
  - '--storage.tsdb.retention.size=10GB' # Max 10GB
```

**Data Cleanup**:
```bash
# Remove all Prometheus data (WARNING: data loss!)
docker compose down
docker volume rm clouddeploy-platform_prometheus_data
docker compose up -d
```

---

## Accessing Metrics

### Prometheus Web UI

**URL**: http://localhost:9090

**Features**:
- Graph tab: Visualize queries over time
- Table tab: See current values
- Status → Targets: Check scrape health
- Status → Configuration: View prometheus.yml
- Alerts: Configure alerting rules (advanced)

**Quick Actions**:
1. Type query in expression box
2. Click "Execute"
3. Switch between Graph/Table tabs
4. Adjust time range (top right)
5. Click "Add Graph" to compare queries

### cAdvisor Web UI

**URL**: http://localhost:8081

**Features**:
- Real-time container metrics
- Resource usage graphs
- Per-container drill-down
- Subcontainer hierarchy

**Note**: Primarily for debugging. Use Grafana for production dashboards.

### Raw Metrics Endpoints

```bash
# cAdvisor metrics (what Prometheus scrapes)
curl http://localhost:8081/metrics

# Prometheus internal metrics
curl http://localhost:9090/metrics

# Backend metrics (after application metrics implementation)
curl http://localhost:8080/metrics
```

---

## Troubleshooting

### Target Down

**Symptom**: Target shows "DOWN" in Prometheus → Status → Targets

**Diagnosis**:
```bash
# Check if service is running
docker compose ps

# Check service logs
docker compose logs cadvisor

# Test connectivity from Prometheus
docker exec clouddeploy-prometheus wget -O- http://cadvisor:8080/metrics
```

**Common Causes**:
- Service crashed or restarting
- Network issue (check docker-compose network)
- Service not exposing metrics endpoint
- Firewall blocking connection (rare in Docker)

**Fix**:
```bash
# Restart the target service
docker compose restart cadvisor

# Restart Prometheus to reload config
docker compose restart prometheus
```

---

### No Data in Graphs

**Symptom**: Query returns empty result or "No data"

**Diagnosis**:
1. Check target is UP: Status → Targets
2. Verify metric exists: Type metric name, check autocomplete
3. Check time range: Expand to 6 hours or 1 day
4. Try simpler query: `up` (shows all targets)

**Common Causes**:
- Metric name typo
- Label filter too restrictive
- Time range too narrow (data outside range)
- Target just started (need 5+ minutes of data for rate())

**Fix**:
```promql
# Start with basic query
up

# Add filters incrementally
up{job="docker"}

# Then try your actual metric
container_cpu_usage_seconds_total
```

---

### High Memory Usage

**Symptom**: Prometheus using >500 MB RAM

**Diagnosis**:
```bash
# Check Prometheus memory
docker stats clouddeploy-prometheus --no-stream

# Check number of metrics
curl -s http://localhost:9090/api/v1/targets | grep -o "health" | wc -l
```

**Causes**:
- Too many metrics being collected
- Long retention period
- High cardinality metrics

**Fix**:
```yaml
# In docker-compose.yml, add to Prometheus command:
command:
  - '--storage.tsdb.retention.time=7d'  # Reduce from 15d to 7d
  - '--storage.tsdb.retention.size=1GB' # Set size limit
```

---

### Prometheus Not Scraping

**Symptom**: Gaps in data, irregular collection

**Diagnosis**:
```bash
# Check Prometheus logs
docker compose logs prometheus | grep -i error

# Check scrape duration
# In Prometheus, query:
prometheus_target_scrape_duration_seconds
```

**Causes**:
- cAdvisor slow to respond (timeout)
- Prometheus restarting frequently
- Resource constraints (CPU/memory)

**Fix**:
```yaml
# In prometheus.yml, increase timeout:
scrape_configs:
  - job_name: 'docker'
    scrape_interval: 15s
    scrape_timeout: 10s  # Default is 10s, increase if needed
```

---

## Performance Optimization

### Query Performance

**Slow Queries**:
- Use `rate()` with appropriate time range ([5m] is good balance)
- Avoid very long time ranges in dashboards
- Use recording rules for complex frequently-used queries

**Fast Queries**:
```promql
# Good: Specific time range
rate(container_cpu_usage_seconds_total{id!="/"}[5m])

# Avoid: No time range on counter (shows cumulative value)
container_cpu_usage_seconds_total{id!="/"}

# Good: Efficient aggregation
sum(rate(...[5m]))

# Avoid: Aggregating then rate (inefficient)
rate(sum(...))[5m]
```

### Resource Optimization

**Reduce Prometheus Memory**:
1. Decrease retention: `--storage.tsdb.retention.time=7d`
2. Reduce scrape frequency: `scrape_interval: 30s`
3. Limit metric cardinality (fewer labels)

**Reduce cAdvisor Impact**:
```yaml
# In docker-compose.yml:
cadvisor:
  command:
    - '--docker_only=true'        # Only Docker containers
    - '--housekeeping_interval=30s'  # Less frequent collection
```

---

## Security Considerations

### Current Setup (Development)

**Status**: No authentication required
- Prometheus: Open on localhost:9090
- cAdvisor: Open on localhost:8081

**Acceptable For**: Local development only

**Risk**: Low (only accessible on your Mac)

### Production Recommendations

**For Prometheus**:
1. Enable basic auth or OAuth2 proxy
2. Use TLS/HTTPS for connections
3. Restrict network access (firewall/security groups)
4. Don't expose to public internet

**For cAdvisor**:
1. Don't expose publicly (Prometheus scrapes internally)
2. Run read-only (already configured via volume mounts)
3. Keep updated (security patches)

**For Production AWS Deployment**:
- Prometheus in private subnet
- ALB with authentication for Grafana
- VPC security groups limiting access
- HTTPS only

---

## Interview Talking Points

### Architecture Overview
"I implemented Prometheus for metrics collection using a pull-based model.
Prometheus scrapes metrics from cAdvisor every 15 seconds. cAdvisor monitors
the Docker daemon to collect container CPU, memory, and disk I/O statistics.
The time-series database retains 15 days of data with configurable retention
policies."

### Metric Coverage
"The monitoring stack captures CPU usage, memory consumption, disk I/O rates,
and container lifecycle events. This provides comprehensive resource visibility
for capacity planning and performance optimization. Network metrics aren't
available in Docker Desktop due to platform constraints, but would be fully
available in production on Kubernetes."

### Query Language
"I use PromQL for metric queries. For example, `rate()` calculates per-second
rates from cumulative counters, which is essential for meaningful CPU and disk
I/O analysis. The `topk()` function helps identify resource bottlenecks by
showing the highest consumers."

### Observability Philosophy
"I follow the three pillars of observability: metrics (Prometheus), logs
(Docker logs), and traces (planned). Metrics provide quantitative resource
data, enabling data-driven decisions about scaling and optimization. Combined
with Grafana dashboards, this creates actionable visibility into system health."

### Production Readiness
"This monitoring stack is production-ready with persistent storage, automated
collection, and historical data retention. In production, I'd add alerting
rules for critical thresholds, integrate with PagerDuty for on-call rotation,
and expand to include application-level metrics like request rates and error
rates."

---

## Implementation Roadmap

### Phase 1: Infrastructure Metrics ✅ Complete
- [x] Prometheus time-series database deployment
- [x] cAdvisor container metrics integration
- [x] CPU, Memory, Disk I/O monitoring
- [x] 15-day data retention configuration
- [x] PromQL query documentation
- [x] Troubleshooting guides

### Phase 2: Visualization Layer 🚧 In Progress
- [ ] Grafana deployment and configuration
- [ ] Prometheus data source integration
- [ ] Container resource dashboards (CPU, Memory, Disk)
- [ ] Auto-refresh and time range optimization
- [ ] Alert threshold visualization
- [ ] Screenshot documentation for portfolio

### Phase 3: Application Metrics 📋 Planned
- [ ] Prometheus client library integration (`prom-client`)
- [ ] Backend /metrics endpoint implementation
- [ ] HTTP request tracking (count, duration, errors)
- [ ] Database query performance monitoring
- [ ] API performance dashboard creation
- [ ] Custom business metrics

### Phase 4: Production Deployment 📋 Planned
- [ ] AWS infrastructure deployment
- [ ] Persistent storage configuration (EBS volumes)
- [ ] Alert rule implementation (PagerDuty integration)
- [ ] CloudWatch integration for unified monitoring
- [ ] Retention policy optimization for scale
- [ ] Multi-region metrics aggregation

---

## Useful Commands

```bash
# Start monitoring stack
docker compose up -d prometheus cadvisor

# View Prometheus logs
docker logs -f clouddeploy-prometheus

# Reload Prometheus config (after editing prometheus.yml)
docker exec clouddeploy-prometheus kill -HUP 1

# Check Prometheus targets via API
curl http://localhost:9090/api/v1/targets | python3 -m json.tool

# Query Prometheus API directly
curl 'http://localhost:9090/api/v1/query?query=up'

# Export metrics to file
curl http://localhost:8081/metrics > metrics_backup.txt

# Check storage size
docker exec clouddeploy-prometheus du -sh /prometheus

# Stop monitoring (keeps data)
docker compose stop prometheus cadvisor

# Remove monitoring and data (WARNING: data loss!)
docker compose down
docker volume rm clouddeploy-platform_prometheus_data
```

---

## Resources

- **Prometheus Documentation**: https://prometheus.io/docs/
- **PromQL Basics**: https://prometheus.io/docs/prometheus/latest/querying/basics/
- **PromQL Examples**: https://prometheus.io/docs/prometheus/latest/querying/examples/
- **cAdvisor GitHub**: https://github.com/google/cadvisor
- **Prometheus Best Practices**: https://prometheus.io/docs/practices/naming/
- **Query Functions Reference**: https://prometheus.io/docs/prometheus/latest/querying/functions/

---

## Project Status

**Current Phase**: Infrastructure metrics collection (Phase 1 complete)  
**Metrics Coverage**: CPU, Memory, Disk I/O, Container lifecycle (5/6 categories)  
**Data Retention**: 15 days  
**Scrape Interval**: 15 seconds  
**Storage**: ~1GB for full retention period  

**Platform**: Docker Desktop for Mac  
**Limitations**: Network metrics unavailable (VM architecture constraint)  
**Production Ready**: Yes - metrics collection operational  

**Next Milestone**: Grafana visualization layer deployment

---

## Changelog

### April 2026 - Initial Implementation
- Deployed Prometheus v2.51.0 for time-series metrics
- Integrated cAdvisor v0.47.0 for container monitoring
- Configured automated scraping every 15 seconds
- Documented complete PromQL query reference
- Established 15-day retention policy
- Created troubleshooting and optimization guides
