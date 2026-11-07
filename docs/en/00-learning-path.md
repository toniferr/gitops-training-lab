# Learning path

This lab starts with Training 01, which sets up a complete GitOps system across three repositories.

| Training | Question answered |
| --- | --- |
| 01 — [GitOps](https://opengitops.dev/) and [Flux](https://fluxcd.io/flux/) foundations | How does Git become desired cluster state? |

## Mental model

```text
Git commit → Flux reads desired state → Kubernetes API stores it
                                      → Kubernetes controllers make it real
```

The Java application repository describes the workload. The platform repository selects that workload for a cluster. Flux runs inside that cluster and continuously compares Git with the Kubernetes API.

## Repository roles

Never edit a copy of a manifest in this teaching repository expecting the cluster to change. Make the intended change in the canonical repository named by the exercise, commit it to the training branch, push it, then inspect Flux.

## Safe learning loop

1. Check the active context with `kubectl config current-context`.
2. Make one small declarative change in Git.
3. Commit and push it.
4. Inspect `flux get sources git -A` and `flux get kustomizations -A`.
5. Inspect the affected Kubernetes resource.
6. Revert through Git when finished.

You don't need any of this installed to read this page: it's the pattern you'll practice starting with Training 01, once your tools are ready via [the setup guide](01-wsl-ubuntu-setup.md).

## Study references

These are standalone deep dives, not sequential steps — read any of them whenever you want more depth than an exercise gives you, independently of which training you are on:

- [Kind cluster tour](reference/kind-cluster-tour.md) — what's already running right after `kind create cluster`, before Flux or the app exist: nodes, default namespaces, and the `kube-system` Pods.
- [Post-bootstrap tour](reference/post-bootstrap-tour.md) — the sequel: what `flux bootstrap` actually created in `flux-system`, and how it produced the `Deployment`/`Service`/`ConfigMap` in `java-api`.
- [Kubernetes concepts](reference/kubernetes-concepts.md) — Pods, Deployments, Services, ConfigMaps, probes, resource limits, and labels/selectors.
- [Flux architecture](reference/flux-architecture.md) — what bootstrap creates, the `GitRepository`/`Kustomization` fields, and why drift correction works.
- [kubectl cheatsheet](reference/kubectl-cheatsheet.md) — commands organized by task, using this lab's real names.
