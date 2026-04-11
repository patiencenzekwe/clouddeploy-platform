# Dockerfile Architecture Decisions

## Backend Dockerfile

### Base Image: node:25-alpine
**Decision**: Use Alpine Linux variant
**Reasoning**: 
- 80% smaller than Debian-based images (~140MB vs ~1GB)
- Reduced attack surface (fewer packages)
- Faster deployments
- Industry standard for production

**Alternative Considered**: node:25-slim
**Why Rejected**: Still 200MB+, Alpine sufficient for our needs

---

### Layer Optimization: Dependencies Before Code
**Decision**: COPY package.json before COPY server.js
**Reasoning**:
- Leverages Docker layer caching
- Dependencies change infrequently
- Code changes frequently
- Build time: 5 seconds vs 5 minutes on code changes

---

### Package Manager: npm ci
**Decision**: Use `npm ci --only=production`
**Reasoning**:
- Reproducible builds (uses exact package-lock.json versions)
- Faster than npm install
- Excludes devDependencies (smaller image, fewer vulnerabilities)
- CI/CD optimized

---

### Health Check: HTTP endpoint test
**Decision**: Check /health endpoint every 30 seconds
**Reasoning**:
- Enables Kubernetes auto-restart of failed containers
- Load balancers route only to healthy instances
- Production self-healing capability
- 30s interval balances responsiveness with CPU usage

---

### Security: Non-root user
**Decision**: Run as USER node
**Reasoning**:
- Principle of least privilege
- Limits damage from compromised container
- node:alpine includes 'node' user by default
- Industry security best practice

---

### Command Format: Exec form
**Decision**: CMD ["node", "server.js"] (array syntax)
**Reasoning**:
- Proper signal handling for graceful shutdown
- No unnecessary shell process (PID 1 is the app)
- Docker best practice

---

## Frontend Dockerfile

### Web Server: NGINX
**Decision**: Use nginx:alpine instead of Node.js
**Reasoning**:
- Optimized for static file serving
- 70% smaller than node:alpine (40MB vs 140MB)
- Better performance for static content
- Production standard (used by Netflix, Airbnb, etc.)

---

### Health Check: wget spider
**Decision**: Use wget --spider for health check
**Reasoning**:
- Checks server response without downloading content
- wget included in Alpine (no extra dependencies)
- Lightweight check
- Standard practice for HTTP health checks

---

## Interview Talking Points

### When asked: "Why Alpine?"
"Alpine provides an 80% reduction in image size while maintaining
full functionality. This results in faster deployments, reduced
storage costs, and a smaller attack surface. It's the industry
standard for production containers."

### When asked: "Explain your build optimization"
"I copy dependencies before application code to leverage layer
caching. Since package.json changes infrequently compared to
application code, Docker reuses the npm install layer on most
builds, reducing build time from minutes to seconds."

### When asked: "How do you handle container security?"
"I implement defense in depth: minimal base images to reduce
attack surface, non-root users following least privilege,
pinned versions for reproducibility, and health checks for
self-healing. I also exclude devDependencies in production
to minimize installed packages."

---

## Production Readiness Checklist

✅ Minimal base images (Alpine)
✅ Pinned versions (no 'latest' tags)
✅ Layer caching optimization
✅ Health checks implemented
✅ Non-root user execution
✅ Production dependencies only
✅ Proper signal handling (exec form CMD)
✅ Documentation in this file

## Future Enhancements (Week 7 - CI/CD)

- [ ] Add security scanning (Trivy, Snyk)
- [ ] Multi-architecture builds (ARM64 support)
- [ ] Implement .dockerignore for additional optimization
- [ ] Add build-time security scanning in pipeline