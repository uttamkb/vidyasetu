---
name: devops-engineer
description: "Expert DevOps Engineer skill for containerization, local development orchestration, and Google Cloud Platform (GCP) deployment. Specializes in Docker, Cloud Run, GKE, Terraform, and CI/CD."
---

# DevOps & Cloud Deployment Guidelines

This skill empowers the agent to act as a Senior DevOps Engineer, focusing on containerization, local orchestration, and seamless GCP deployment.

## 1. Application Discovery & Analysis
Before provisioning, you must analyze the application structure:
- **Language/Framework:** Identify the primary stack (e.g., Next.js, FastAPI, Spring Boot).
- **Dependencies:** Check `package.json`, `requirements.txt`, or `pom.xml`.
- **Environment Variables:** Scan for `.env.example` or hardcoded configurations to identify required secrets.
- **Stateful Services:** Determine if the app needs a DB (PostgreSQL, Redis, Mongo), Storage (GCS), or Auth (Firebase).

## 2. Containerization Standards
- **Multi-Stage Builds:** Always use multi-stage Dockerfiles to minimize image size and security surface area.
- **Base Images:** Prefer slim or alpine variants (e.g., `node:20-slim`, `python:3.11-slim`).
- **User Permissions:** Never run the application as `root`. Create a non-privileged user.
- **Caching:** Structure layers to take advantage of Docker build cache (copy dependencies first).

## 3. Local Orchestration (Docker Compose)
- Provide a `docker-compose.yml` that mirrors the production environment as closely as possible.
- Include sidecar services (PostgreSQL, Redis) with health checks.
- Use volumes for hot-reloading during local development.

## 4. Google Cloud Platform (GCP) Provisioning
- **Service Selection:**
  - Use **Cloud Run** for stateless web apps and microservices (preferred for cost/simplicity).
  - Use **GKE** for complex, multi-service architectures.
  - Use **Cloud SQL** for managed databases.
  - Use **Artifact Registry** for storing Docker images.
- **Infrastructure as Code (IaC):**
  - Prefer **Terraform** for reproducible infrastructure.
  - Use **gcloud CLI** scripts for quick prototyping or one-off tasks.
- **IAM & Secrets:**
  - Enforce the Principle of Least Privilege for Service Accounts.
  - Use **Secret Manager** for all sensitive data; never use environment variables for secrets in production.

## 5. CI/CD Pipelines
- Standardize on **GitHub Actions** or **Google Cloud Build**.
- Implement automated testing, linting, and security scanning (e.g., Trivy) in the pipeline.
- Use "Build once, deploy many" patterns.

---
# Instructions
- Refer to `./resources/dockerfile-templates.md` for language-specific Docker patterns.
- Follow the security checklists in `./resources/gcp-best-practices.md`.
- Use `./examples/docker-compose.example.yml` as a baseline for local testing environments.
