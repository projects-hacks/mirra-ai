# Contributing to Mirra

## Branch Strategy
- `main` — always deployable
- `feat/xyz` — features, `fix/xyz` — bugs

## Code Standards

### Frontend (Next.js 14 + TypeScript + Tailwind CSS)
- **TypeScript** — strict mode, no `any`
- **Tailwind CSS v4** — utility-first, no inline styles
- **Components:** PascalCase (`ProofCard.tsx`), named exports
- **Hooks:** `use` prefix (`useCamera.ts`), named exports
- **One component per file**, colocate styles via Tailwind

### Backend (FastAPI + Python 3.12)
- **snake_case** files/functions, **PascalCase** classes
- **Type hints** on all signatures
- **Docstrings** on public functions (concise, no filler)
- **async/await** everywhere
- **Pydantic** for request/response models

### Principles
- **SOLID** — single responsibility per module, depend on abstractions
- **DRY** — shared logic in `services/`, reusable hooks in `hooks/`
- **No verbose comments** — code should be self-documenting
- **No `any`** in TypeScript, no `# type: ignore` in Python

## Commit Messages
```
feat: add skin analysis endpoint
fix: handle VTO timeout
docs: update API contract
```

## Mock Mode
`USE_MOCKS=true` in backend `.env`. Responses in `backend/mocks/`.

## Deployment
- **Frontend:** Push `main` → auto-deploys to **Vercel**
- **Backend:** Push `main` → **GitHub Actions** builds Docker → pushes to GHCR → `kubectl set image` on **Linode K8s**

### Required GitHub Secrets
| Secret | What |
|---|---|
| `KUBE_CONFIG` | Base64-encoded kubeconfig for Linode K8s |

`GITHUB_TOKEN` is automatic (used for GHCR push).
