# Learning path

This lab is intentionally incremental: it is the same GitOps system, growing one training at a time, not ten disconnected exercises. Complete one training branch before moving to the next; every later exercise assumes the operational model learned earlier.

| Training | Question answered |
| --- | --- |
| 01 — [GitOps](https://opengitops.dev/) and [Flux](https://fluxcd.io/flux/) foundations | How does Git become desired cluster state? |
| 02 — Kubernetes foundations for GitOps | What Kubernetes objects does GitOps actually manage? |
| 03 — [Kustomize](https://kustomize.io/) and environments | How does one app differ safely by environment (dev/qa/prod)? |
| 04 — Application delivery | How does a built image reach [Kubernetes](https://kubernetes.io/docs/concepts/overview/) through Git, and how is that different from CI? |
| 05 — Platform GitOps | How do you manage a whole cluster's infrastructure through Git, not just one app? |
| 06 — Secrets and security | How do you protect values ([SOPS](https://github.com/getsops/sops), [Sealed Secrets](https://sealed-secrets.netlify.app/)) and constrain workloads (RBAC) in a GitOps flow? |
| 07 — Observability and troubleshooting | Given a broken deployment, where in the GitOps pipeline is it actually broken? |
| 08 — Flux vs [Argo CD](https://argo-cd.readthedocs.io/en/stable/) | Same GitOps model, different controller — when do you reach for which? |
| 09 — Enterprise GitOps | How does this look with CI/CD, pull requests, promotion, and Azure/OpenShift? |
| 10 — Capstone challenge | Can you explain every arrow from commit to running Pod, end to end? |

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
