# Mirra — Production Deployment Guide (Linode K8s)

## Architecture

```
                    ┌─────────────┐
                    │   Vercel     │  ← Frontend (Next.js)
                    │   (CDN)      │
                    └──────┬──────┘
                           │ HTTPS
                    ┌──────▼──────┐
                    │   Nginx     │  ← Ingress Controller
                    │  Ingress    │     (TLS termination)
                    └──────┬──────┘
                           │
              ┌────────────▼────────────┐
              │   mirra-backend (×2)    │  ← FastAPI pods
              │   port 8000             │
              └────────────┬────────────┘
                           │
              ┌────────────▼────────────┐
              │      Redis (×1)         │  ← In-cluster cache
              │      port 6379          │
              └─────────────────────────┘
                           │
              ┌────────────▼────────────┐
              │    Supabase (hosted)    │  ← Postgres + Auth + Storage
              └─────────────────────────┘
```

---

## Prerequisites

1. **Linode K8s cluster** — at least 2 nodes (4GB RAM each)
2. **kubectl** — configured and connected to your cluster
3. **Domain** — point `api.mirra.ai` (or your domain) to the Linode NodeBalancer IP

---

## Step 1: Get Your Kubeconfig

```bash
# Download from Linode dashboard → Kubernetes → your cluster → "Download kubeconfig"
# Or via Linode CLI:
linode-cli lke kubeconfig-view <cluster-id> --text | base64 -d > ~/.kube/mirra-config
export KUBECONFIG=~/.kube/mirra-config

# Verify connection
kubectl get nodes
```

---

## Step 2: Install Nginx Ingress Controller

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.12.2/deploy/static/provider/cloud/deploy.yaml
```

Wait for the LoadBalancer IP:
```bash
kubectl get svc -n ingress-nginx ingress-nginx-controller -w
# Once EXTERNAL-IP appears, point your domain DNS A record to it
```

---

## Step 3: Install cert-manager (auto TLS)

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.17.2/cert-manager.yaml
```

Create the ClusterIssuer:
```bash
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@domain.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
EOF
```

---

## Step 4: Create Namespace + Secrets

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Create GHCR pull secret (so K8s can pull from GitHub Container Registry)
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=YOUR_GITHUB_USERNAME \
  --docker-password=YOUR_GITHUB_PAT \
  -n mirra

# Create app secrets (all your env vars)
kubectl create secret generic mirra-secrets \
  --from-literal=PERFECT_CORP_API_KEY='your-key' \
  --from-literal=DEEPGRAM_API_KEY='your-key' \
  --from-literal=GOOGLE_AI_STUDIO_KEY='your-key' \
  --from-literal=SERPER_API_KEY='your-key' \
  --from-literal=SUPABASE_URL='https://cemeenqljfaujlbgerys.supabase.co' \
  --from-literal=SUPABASE_KEY='your-service-role-key' \
  --from-literal=DATABASE_URL='your-database-url' \
  --from-literal=GOOGLE_CALENDAR_CREDENTIALS='' \
  -n mirra
```

---

## Step 5: Deploy Redis + Backend + Ingress

```bash
# Deploy in order
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/ingress.yaml

# Verify
kubectl get pods -n mirra
kubectl get svc -n mirra
kubectl get ingress -n mirra
```

Expected output:
```
NAME                             READY   STATUS    RESTARTS
redis-xxxxxx-xxxxx               1/1     Running   0
mirra-backend-xxxxxx-xxxxx       1/1     Running   0
mirra-backend-xxxxxx-yyyyy       1/1     Running   0
```

---

## Step 6: Set Up GitHub Secrets for CI/CD

Go to **GitHub repo → Settings → Secrets and variables → Actions** and add:

| Secret Name | Value |
|---|---|
| `KUBE_CONFIG` | Base64-encoded kubeconfig: `cat ~/.kube/mirra-config \| base64` |

That's it. The CI/CD workflow uses `GITHUB_TOKEN` (auto-provided) for GHCR and `KUBE_CONFIG` for kubectl.

---

## Step 7: Verify End-to-End

```bash
# Health check
curl https://api.mirra.ai/health

# Expected:
# {"status":"ok","version":"1.0.0","mocks":false,"redis":"connected"}

# Check logs
kubectl logs -n mirra -l app=mirra-backend --tail=50

# Watch pods
kubectl get pods -n mirra -w
```

---

## CI/CD Flow

```
Push to main (backend/** changed)
  │
  ├─ test job: lint (ruff) + type check (pyright)
  │
  └─ build-and-deploy job (after test passes):
       ├─ Build Docker image (multi-stage, layer cached)
       ├─ Push to ghcr.io with :latest + :sha tags
       ├─ kubectl set image → rolling update (zero downtime)
       └─ kubectl rollout status → verify success
```

---

## Rollback

```bash
# See deployment history
kubectl rollout history deployment/mirra-backend -n mirra

# Rollback to previous version
kubectl rollout undo deployment/mirra-backend -n mirra

# Rollback to specific revision
kubectl rollout undo deployment/mirra-backend -n mirra --to-revision=3
```

---

## Scaling

```bash
# Manual scale
kubectl scale deployment/mirra-backend --replicas=4 -n mirra

# Auto-scale (2-6 pods based on CPU)
kubectl autoscale deployment/mirra-backend \
  --min=2 --max=6 --cpu-percent=70 -n mirra
```

---

## Monitoring

```bash
# Pod resource usage
kubectl top pods -n mirra

# Backend logs (follow)
kubectl logs -n mirra -l app=mirra-backend -f

# Redis logs
kubectl logs -n mirra -l app=redis -f

# Describe pod (debug crashes)
kubectl describe pod <pod-name> -n mirra
```
