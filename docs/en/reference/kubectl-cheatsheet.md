# [kubectl](https://kubernetes.io/docs/reference/kubectl/) cheatsheet (reference)

[Versión en español](../../es/reference/chuleta-kubectl.md)

Organized by task, not alphabetically. Commands use this lab's real names (`java-api` namespace, `api-java-gitops` Deployment) so you can run them as-is against the Kind cluster. Every command below also appears somewhere in the [Training 01 instructor runbook](../../training/01-gitops-flux-foundations/instructor-runbook.md) or [learner guide](../../training/01-gitops-flux-foundations/learner-guide.md); this page is the index into them.

## Context and cluster

```bash
kubectl config current-context
kubectl config use-context kind-gitops-lab
kubectl config get-contexts
kubectl get nodes
```

Always check the context before running anything destructive — a wrong context means you're pointed at the wrong cluster.

## Inspecting objects

```bash
kubectl get all -n java-api
kubectl get deployment/api-java-gitops -n java-api -o wide
kubectl get pods -n java-api --show-labels
kubectl describe deployment/api-java-gitops -n java-api
kubectl explain deployment.spec.strategy
```

`describe` is almost always the first thing to run when something isn't working — it includes recent Events for that object. `explain` prints the field documentation straight from the API schema; use it when a YAML field is unfamiliar.

## Events and logs

```bash
kubectl get events -n java-api --sort-by=.lastTimestamp
kubectl logs deployment/api-java-gitops -n java-api
kubectl logs deployment/api-java-gitops -n java-api -f       # follow
kubectl logs deployment/api-java-gitops -n java-api --previous  # last crash
```

## Exec and port-forward

```bash
kubectl exec -it deployment/api-java-gitops -n java-api -- sh
kubectl port-forward -n java-api svc/java-api 8080:80
```

`port-forward` blocks the terminal — run it in a second terminal, as the Training 01 runbook does, and `curl http://localhost:8080` from the first.

## Applying and diffing (declarative)

```bash
kubectl apply -k java-api-gitops/k8s
kubectl kustomize java-api-gitops/k8s
kubectl diff -k java-api-gitops/k8s
```

In this lab you never run `apply` by hand against `java-api` — Flux's `kustomize-controller` does it. These are for *validating* what Flux would apply, exactly what `scripts/validation/validate-kustomize.sh` automates with `kubectl kustomize`.

## Rollouts

```bash
kubectl rollout status deployment/api-java-gitops -n java-api
kubectl rollout history deployment/api-java-gitops -n java-api
kubectl rollout undo deployment/api-java-gitops -n java-api
```

Do not use `rollout undo` in this lab to fix a mistake — it changes cluster state without changing Git, so Flux will reconcile it right back. Revert in Git instead (`git revert`), then let Flux apply the reverted state.

## Manual scale (for the drift demo only)

```bash
kubectl scale deployment/api-java-gitops -n java-api --replicas=3
kubectl get deployment/api-java-gitops -n java-api
```

This is intentionally the "wrong" way to change replica count in a GitOps setup — it's the demo of what Flux corrects.

## Troubleshooting recipe

When something doesn't look right, check in this order — each step usually explains the next:

1. `flux get sources git -A` — is the Git source even reconciling?
2. `flux get kustomizations -A` — is the Kustomization applying and healthy?
3. `kubectl get events -n java-api --sort-by=.lastTimestamp` — what did Kubernetes actually try to do?
4. `kubectl describe deployment/api-java-gitops -n java-api` — object-level detail and its own Events.
5. `kubectl logs …` — only once the Pod exists and is running; logs won't explain a Pod that never got scheduled.

## Useful output flags

| Flag | Effect |
| --- | --- |
| `-o wide` | More columns (node, IP) without full YAML. |
| `-o yaml` / `-o json` | Full object, useful piped into `grep` or `jq`. |
| `-w` | Watch for changes instead of a one-shot snapshot. |
| `--sort-by=.lastTimestamp` | Chronological order for `events`. |
| `-A` | All namespaces (works for `kubectl get` and every `flux get`). |
