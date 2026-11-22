# Kubernetes Deployment Guide

This guide details how to deploy PERO-J (Soroban Smart Block Explorer) indexer and frontend services onto a Kubernetes cluster.

## Manifest Structure

All Kubernetes resources are located in the `k8s/` directory:

- `k8s/configmap.yaml`: ConfigMap (`pero-config`) holding non-sensitive configuration values.
- `k8s/secret.yaml`: Secret template (`pero-secrets`) holding database connection strings.
- `k8s/indexer-deployment.yaml`: Deployment and Service manifests for the backend indexer.
- `k8s/frontend-deployment.yaml`: Deployment and Service manifests for the frontend UI.
- `k8s/hpa.yaml`: HorizontalPodAutoscaler for frontend autoscaling based on CPU utilization.

## Environment Configuration

### ConfigMap (`k8s/configmap.yaml`)

| Variable | Description | Default |
|---|---|---|
| `SOROBAN_RPC_URL` | Soroban RPC endpoint | `https://soroban-testnet.stellar.org` |
| `HORIZON_URL` | Horizon REST endpoint | `https://horizon-testnet.stellar.org` |
| `NETWORK_PASSPHRASE` | Stellar network passphrase | `Test SDF Network ; September 2015` |
| `START_LEDGER` | Starting ledger sequence (0 to auto-resume) | `0` |
| `POLL_MS` | Ingestion poll interval in ms | `5000` |
| `PORT` | API server listen port | `3001` |
| `LAG_ALERT_THRESHOLD_S` | Maximum allowed indexing lag before readiness degrades | `30` |
| `VITE_API_PROXY` | Proxy target for frontend API requests | `http://indexer:3001` |

### Secrets (`k8s/secret.yaml`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection URL (`postgres://user:password@host:port/dbname`) |

## Health and Readiness Probes

The indexer container exposes two health endpoints:
- **Liveness Probe (`/ready`)**: Verifies basic database connectivity and process liveness.
- **Readiness Probe (`/health`)**: Validates database connectivity as well as indexer lag against `LAG_ALERT_THRESHOLD_S` (returning HTTP 503 if degraded).

## Deploying to Kubernetes

1. **Configure Secrets & ConfigMap**:
   Update `k8s/configmap.yaml` and `k8s/secret.yaml` with your target network and database credentials.

2. **Apply Manifests**:
   ```bash
   kubectl apply -f k8s/
   ```

3. **Verify Deployment**:
   ```bash
   kubectl get pods -l 'app in (indexer,frontend)'
   kubectl get svc
   ```

4. **View Logs**:
   ```bash
   kubectl logs -f deployment/indexer
   kubectl logs -f deployment/frontend
   ```
