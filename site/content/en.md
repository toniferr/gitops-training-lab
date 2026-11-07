# Training 01 — GitOps and Flux foundations

<!--
Content of this training's website. Conventions (see site/README.md):
- Each "## Title {label}" is a section (one screen in presentation mode).
- A section containing the "instructor" comment is only shown in instructor mode.
- "> [!NOTES]" are instructor notes; "> [!NOTE]", "> [!TIP]", "> [!WARNING]" are callouts.
- "> [!DOCS]" with a list of links: further reading, at the foot of the section.
- ```flow, ```cards and ```steps blocks: one item per line, "Title | text".
- "repo:path" links point to the file on GitHub, on the published branch.
-->

Session outcome: tell **desired state** apart from **runtime state**, and watch [Flux](https://fluxcd.io/flux/) reconcile a real cluster from a commit.

## Before the session {Preparation}

<!-- instructor -->

Use the same branch, `training/01-gitops-flux-foundations`, in `cac-gitops-platform` and `java-api-gitops`. The platform [`GitRepository`](https://fluxcd.io/flux/components/source/gitrepositories/) must point at the Java repository **and at that branch**. Bootstrap Flux against the platform branch.

Prepare the local image before sharing your screen:

```bash
cd ~/Workspace/java-api-gitops
docker build -t gitops-lab/java-api:0.1.0 .
kind load docker-image gitops-lab/java-api:0.1.0 --name gitops-lab
```

Verify everything before learners arrive:

```bash
kubectl config current-context
flux get sources git -A
flux get kustomizations -A
kubectl get all -n java-api
```

> [!TIP]
> Keep a second terminal open with `kubectl port-forward -n java-api svc/java-api 8080:80`; you will use it during the demo.

> [!DOCS]
> - [Instructor runbook](repo:training/01-gitops-flux-foundations/instructor-runbook.md)
> - [WSL2/Ubuntu setup](repo:docs/en/01-wsl-ubuntu-setup.md)
> - [Kind cluster tour](repo:docs/en/reference/kind-cluster-tour.md)
> - [Flux bootstrap for GitHub](https://fluxcd.io/flux/installation/bootstrap/github/)

## Introduction {Context · 0–2 min}

- **Where:** IOPEDGE architecture, for Inditex
- **Team:** IOP Turing Lee, after Alan Turing and Tim Berners-Lee
- **What we provide:** a *locations* system where other architecture teams deploy their workloads

![Platform: the locations system, whose microservices connect to Azure and to the store and warehouse clusters; Inditex teams release their versions with a push to Git and Flux reconciles those clusters automatically](diagrams/iopedge-platform.en.svg "Each team releases on its own: it pushes to Git and Flux reconciles automatically. That's what we'll see today, on a small scale, in a lab.")

> [!NOTES]
> Walk the top row first: what we provide and what it connects to. Finish on the bottom row, the bridge into the training: Inditex teams release versions without depending on us.

## What is a Kubernetes cluster? {Theory · 2–6 min}

A **cluster** is a group of machines, called **nodes**, that work as if they were one. [Kubernetes](https://kubernetes.io/docs/concepts/overview/) is the software that coordinates them: you tell it *what* you want to run, and it decides *where* and keeps it running.

![Kubernetes cluster: a control plane with kube-apiserver, etcd, scheduler and controller-manager, and two worker nodes with kubelet, containerd and Pods](diagrams/cluster.en.svg "A Pod is one or more containers that run together: the smallest unit in Kubernetes. In this lab, kind simulates the whole cluster on your laptop: each node is a Docker container inside WSL2.")

> [!NOTES]
> Analogy: the control plane is an airport's control tower and the nodes are the runways; nothing lands without going through the tower (`kube-apiserver`). Don't go into every component: it's enough to know they exist and what role they play. Point at the "You or Flux" box: later on they'll see that, with GitOps, whoever talks to the cluster is Flux.

> [!DOCS]
> - [Kubernetes: cluster components](https://kubernetes.io/docs/concepts/overview/components/)
> - [Kubernetes: Pods](https://kubernetes.io/docs/concepts/workloads/pods/)
> - [Kind cluster tour](repo:docs/en/reference/kind-cluster-tour.md)
> - [Kind](https://kind.sigs.k8s.io/)

## Kubernetes doesn't run commands: it reconciles state {Theory · 2–6 min}

This idea sets up everything else: GitOps uses **the same pattern**, just with Git as a stable input.

```flow
YAML / spec | You declare what you want, not how.
`kube-apiserver` | Validates it and stores it in `etcd` as desired state.
`controller-manager` | Its controllers compare desired and actual, and act.
Status | Reports the observed real state.
```

The controller repeats this loop forever: compare `spec` with `status`, and act when they differ.

> [!NOTES]
> Ask the group: "if I delete a Pod from a 2-replica Deployment, what happens?". The answer (another one appears) is reconciliation in miniature.

> [!DOCS]
> - [Kubernetes concepts](repo:docs/en/reference/kubernetes-concepts.md)
> - [Kubernetes: controllers](https://kubernetes.io/docs/concepts/architecture/controller/)
> - [Kubernetes: objects](https://kubernetes.io/docs/concepts/overview/working-with-objects/)

## Anatomy of a manifest {Theory · 6–10 min}

Every object tells the same story: who I am, what I want, what is happening.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  labels:
    app.kubernetes.io/name: my-app
spec:
  replicas: 2            # what Git edits
status:
  availableReplicas: 2   # what the cluster reports
```

```cards
apiVersion + kind | The kind of contract with Kubernetes.
metadata | Name, labels, namespace.
spec | State **desired** by the team — what Git edits.
status | State **observed** by the cluster — what `kubectl` reports.
```

> [!NOTES]
> Demo rule: don't read the whole YAML; point only at the field that changes a decision (`replicas`).

> [!DOCS]
> - [Kubernetes: `spec` and `status`](https://kubernetes.io/docs/concepts/overview/working-with-objects/#object-spec-and-status)
> - [Labels and selectors](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/)
> - [Kubernetes concepts](repo:docs/en/reference/kubernetes-concepts.md)

## GitOps: Git as the operating contract {Theory · 6–10 min}

Git stops being just history and becomes the input the cluster obeys.

```flow
Pull Request | reviewed change
Git | desired state
Flux | reconciler
Kubernetes | actual runtime
```

The four [OpenGitOps](https://opengitops.dev/) principles:

```cards
Declarative | The system is described as desired state, not as steps.
Versioned and immutable | That state lives in Git, with full history.
Pulled automatically | An agent inside the cluster pulls it; nobody pushes to the cluster.
Continuously reconciled | The agent compares and corrects drift every interval.
```

> [!DOCS]
> - [OpenGitOps principles](https://opengitops.dev/)
> - [Flux: core concepts](https://fluxcd.io/flux/concepts/)

## Two repositories, two responsibilities {Our scenario · 10–13 min}

From theory to our scenario. Changes to a cluster must be **repeatable and auditable**; that is why we separate who decides what runs in the cluster and who describes the application.

```steps
cac-gitops-platform | Flux bootstrap, namespaces, and which applications the cluster watches.
java-api-gitops | Spring Boot source, `Dockerfile`, and the API's Kubernetes manifests.
```

The manifests in `java-api-gitops/k8s/` are the `api-java-gitops` [Deployment](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/), the `java-api` [Service](https://kubernetes.io/docs/concepts/services-networking/service/) and the `java-api-config` [ConfigMap](https://kubernetes.io/docs/concepts/configuration/configmap/), inside the `java-api` namespace that the platform creates.

> [!NOTES]
> Idea to land: `cac-gitops-platform` is the cluster's source of truth (what runs in it); `java-api-gitops` describes the application. Each team changes its own repository without touching the other's.

> [!DOCS]
> - [Learning path](repo:docs/en/00-learning-path.md)
> - [`cac-gitops-platform`, file by file](repo:references/en/cac-gitops-platform.md)
> - [`java-api-gitops`, file by file](repo:references/en/java-api-gitops.md)

## How it all fits together: Git, Flux and Kubernetes {Our scenario · 10–13 min}

[Flux](https://fluxcd.io/flux/) is a set of controllers that live **inside** the cluster. They watch your Git repositories and apply what they find to Kubernetes, again and again. You only change Git.

![Git, Flux and Kubernetes: you push to GitHub; source-controller fetches the repositories; kustomize-controller applies the manifests to kube-apiserver; Kubernetes runs the java-api Deployment, Pods and Service](diagrams/gitops-flux.en.svg "If someone changes the cluster by hand, on the next cycle Flux brings it back to what Git says.")

> [!NOTES]
> Walk through the drawing following a single change, `replicas: 2 → 1`: you edit it and push (bottom left), `source-controller` fetches it, `kustomize-controller` applies it, and Kubernetes keeps a single Pod. It's exactly what you'll do live in Demo 1.

> [!DOCS]
> - [Flux: components](https://fluxcd.io/flux/components/)
> - [`GitRepository`](https://fluxcd.io/flux/components/source/gitrepositories/)
> - [`Kustomization`](https://fluxcd.io/flux/components/kustomize/kustomizations/)
> - [Flux architecture](repo:docs/en/reference/flux-architecture.md)
> - [Post-bootstrap tour](repo:docs/en/reference/post-bootstrap-tour.md)

## Demo 1 — A commit becomes cluster state {Live demo · 13–18 min}

```steps
Edit | In `k8s/deployment.yaml`, change `replicas: 2` → `1`.
Commit + push | To the `training/01-gitops-flux-foundations` branch.
Reconcile | Ask Flux to re-read Git and apply now, without waiting for the interval.
Verify | The Deployment goes to `1/1`.
```

```bash
git add k8s/deployment.yaml
git commit -m "scale java-api to 1 replica"
git push

flux reconcile kustomization java-api -n flux-system --with-source
kubectl rollout status deployment/api-java-gitops -n java-api
```

> [!NOTES]
> Stress that the `push` alone changes nothing yet: Flux doesn't react to GitHub in real time, only on its next reconciliation. `flux reconcile` just brings that moment forward.

> [!DOCS]
> - [`flux reconcile`](https://fluxcd.io/flux/cmd/flux_reconcile/)
> - [`kubectl rollout`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/)
> - [Learner guide](repo:training/01-gitops-flux-foundations/learner-guide.md)

## Demo 2 — Cause drift and watch it self-correct {Live demo · 18–21 min}

A manual change in the cluster **is not** desired state.

```bash
kubectl scale deployment/api-java-gitops -n java-api --replicas=3
kubectl get deployment/api-java-gitops -n java-api   # 3/3, briefly

flux reconcile kustomization java-api -n flux-system --with-source
kubectl get deployment/api-java-gitops -n java-api   # back to 1/1
```

Kubernetes obeys the `scale` instantly because it doesn't know Git says `1`. On the next reconciliation, Flux compares Git with the cluster and undoes the manual change.

> [!TIP]
> It isn't magic: it is `kubectl apply` re-applied to an object that drifted from its YAML.

> [!DOCS]
> - [Why drift correction works](repo:docs/en/reference/flux-architecture.md#why-drift-correction-works)
> - [`kubectl scale`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_scale/)

## Rollback through Git, and what to avoid {Wrap-up · 21–25 min}

```bash
git revert HEAD --no-edit
git push
flux reconcile kustomization java-api -n flux-system --with-source
```

Flux reconciles the reverted state like any other commit, and the history of what happened stays intact.

> [!WARNING]
> Avoid `kubectl rollout undo`: it changes the cluster without changing Git, and Flux undoes it on the next cycle. Also avoid a manual `kubectl apply` against `java-api`: Flux already manages it, and doing it by hand blurs the source of truth.

> [!NOTES]
> Going back to 2 replicas starts a new Pod and, with `wait: true`, `flux reconcile` may wait for close to a minute: use that time to explain the "what to avoid" warning. Don't use a ConfigMap change as a visible demo: the app consumes it as an environment variable, so an existing Pod does not restart by itself when the ConfigMap changes.

> [!DOCS]
> - [`git revert`](https://git-scm.com/docs/git-revert)
> - [Flux: `prune`](https://fluxcd.io/flux/components/kustomize/kustomizations/#prune)

## Practise on your own {Learners}

Repeat the whole exercise on **your own forks** with the [learner guide](repo:training/01-gitops-flux-foundations/learner-guide.md): forking the repositories, initial setup, Flux bootstrap, exercises and rollback.

```cards
Fork | [`cac-gitops-platform`](https://github.com/toniferr/cac-gitops-platform) and [`java-api-gitops`](https://github.com/toniferr/java-api-gitops) into your account, unticking "Copy the `main` branch only".
Branch | `training/01-gitops-flux-foundations` in both forks.
Environment | [WSL2/Ubuntu setup](repo:docs/en/01-wsl-ubuntu-setup.md) and a `kind` cluster.
```

> [!DOCS]
> - [Kind: quick start](https://kind.sigs.k8s.io/docs/user/quick-start/)
> - [Post-bootstrap tour](repo:docs/en/reference/post-bootstrap-tour.md)
> - [Troubleshooting recipe](repo:docs/en/reference/kubectl-cheatsheet.md#troubleshooting-recipe)
