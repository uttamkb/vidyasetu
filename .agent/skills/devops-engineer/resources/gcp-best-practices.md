# GCP Best Practices for DevOps

## 1. Project Organization
- Use separate projects for `dev`, `staging`, and `prod` to ensure absolute isolation.
- Enable necessary APIs: `compute.googleapis.com`, `container.googleapis.com`, `run.googleapis.com`, `sqladmin.googleapis.com`.

## 2. Identity and Access Management (IAM)
- **Service Accounts:** Create a dedicated service account for each microservice.
- **Roles:** Use predefined roles like `roles/run.serviceAgent` or custom roles with minimal permissions.
- **Workload Identity:** If using GKE, use Workload Identity to map K8s service accounts to GCP IAM roles.

## 3. Secret Management
- **Secret Manager:** Store API keys, DB credentials, and certificates here.
- **Injection:** Inject secrets into Cloud Run or GKE as environment variables or mounted volumes at runtime.
- **Versioning:** Always reference specific versions or use the `latest` alias with caution.

## 4. Networking
- **VPC:** Use a custom VPC instead of the default.
- **Cloud SQL Auth Proxy:** Use the proxy for secure connections to Cloud SQL without exposing it to the public internet.
- **Private Google Access:** Enable this on subnets to allow VMs/Pods to reach Google APIs without external IP addresses.

## 5. Cost Optimization
- Use **Preemptible VMs** or **Spot Instances** for non-critical GKE workloads.
- Set **Max Instances** on Cloud Run to prevent runaway costs during traffic spikes.
- Use **Lifecycle Policies** on Cloud Storage buckets to delete or archive old logs/build artifacts.
