# Training 01 — Instructor runbook

Duration: 30–40 minutes. Outcome: learners can distinguish desired state from runtime state and demonstrate Flux reconciliation.

[Versión en español](instructor-runbook.es.md)

## Before the session

Use the same branch name, `training/01-gitops-flux-foundations`, in `cac-gitops-platform` and `java-api-gitops`. The [`GitRepository`](https://fluxcd.io/flux/components/source/gitrepositories/) in the platform must reference the Java repository and that branch. Bootstrap Flux against the platform branch, never against this teaching repository.

Prepare the local image before screen sharing:

```bash
cd ~/Workspace/java-api-gitops
docker build -t gitops-lab/java-api:0.1.0 .
kind load docker-image gitops-lab/java-api:0.1.0 --name gitops-lab
```

Verify all of the following before learners arrive:

```bash
kubectl config current-context
flux get sources git -A
flux get kustomizations -A
kubectl get all -n java-api
```

## Suggested flow

| Minutes | Explain | Show |
| ---: | --- | --- |
| 0–5 | Edge changes must be repeatable and auditable. | The three repository roles. |
| 5–12 | [Deployment](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/), [Service](https://kubernetes.io/docs/concepts/services-networking/service/), [ConfigMap](https://kubernetes.io/docs/concepts/configuration/configmap/), `spec`, and `status`. | The Java app manifests. |
| 12–18 | GitOps and pull reconciliation. | `GitRepository` and [`Kustomization`](https://fluxcd.io/flux/components/kustomize/kustomizations/). |
| 18–27 | A Git change becomes runtime state. | Commit `replicas: 2` to `1`, push, reconcile. |
| 27–34 | Drift is not desired state. | Manual scale to `3`, then let Flux restore `1`. |
| 34–40 | Rollback and limits. | `git revert`; next trainings. |

## Live commands

Keep a port-forward in a second terminal:

```bash
kubectl port-forward -n java-api svc/java-api 8080:80
curl http://localhost:8080
```

After pushing the app manifest change:

```bash
flux reconcile source git java-api -n flux-system
flux reconcile kustomization java-api -n flux-system --with-source
kubectl rollout status deployment/api-java-gitops -n java-api
```

Drift demonstration:

```bash
kubectl scale deployment/api-java-gitops -n java-api --replicas=3
flux reconcile kustomization java-api -n flux-system --with-source
kubectl get deployment/api-java-gitops -n java-api
```

Do not use a ConfigMap value change as the visible demo: the current app consumes it as an environment variable, so an existing Pod does not restart merely because the ConfigMap changes.
