# Kind cluster tour (reference)

[Versión en español](../../es/reference/recorrido-cluster-kind.md)

Right after `kind create cluster`, before Flux or the Java API exist, there is already a working Kubernetes cluster with real components running. This is a guided look at what's there and why — using the exact commands you'll rely on throughout every training, on the least risky target possible (nothing here is "yours" yet).

## Nodes

```bash
kubectl get nodes -o wide
```

| Node | Role |
| --- | --- |
| `gitops-lab-control-plane` | Runs the Kubernetes control plane (API server, scheduler, controller-manager, etcd) — the cluster's "brain." |
| `gitops-lab-worker` | Runs your actual workloads (Pods). |

Both are just Docker containers on your machine, not real physical machines — that is what [Kind](https://kind.sigs.k8s.io/) ("Kubernetes IN Docker") means. `setup/kind/gitops-lab-kind.yaml` is the file that said "give me one of each."

## Namespaces that exist before you do anything

```bash
kubectl get namespaces
```

| Namespace | What lives there |
| --- | --- |
| `default` | Where objects land if you don't specify a namespace. Nothing to see here yet. |
| `kube-system` | Kubernetes' own control-plane components and cluster-wide add-ons — this is where the interesting stuff is, see below. |
| `kube-public` | Readable by every user without authentication, even anonymous ones. Holds a handful of cluster-wide public bits (e.g. `cluster-info`); you'll rarely touch it directly. |
| `kube-node-lease` | One lightweight `Lease` object per node, used by the control plane to detect when a node has stopped responding — node "heartbeats" live here rather than in `kube-system` so a busy control plane doesn't have to compete with them. |
| `local-path-storage` | Runs the provisioner that backs Kind's default `StorageClass` — this is what turns a `PersistentVolumeClaim` into an actual directory on the node. It's a Kind add-on, not part of upstream Kubernetes. |

## What's actually running in `kube-system`

```bash
kubectl get pods -n kube-system
```

You'll see roughly:

| Pod (name prefix) | Role |
| --- | --- |
| `etcd-*` | The cluster's database — every object you ever create is stored here. |
| `kube-apiserver-*` | The front door: every `kubectl` command talks to this. |
| `kube-controller-manager-*` | Runs the reconciliation loops for built-in objects (Deployments, etc.) — the same pattern Flux later uses for `Kustomization`. |
| `kube-scheduler-*` | Decides which node a new Pod lands on. |
| `coredns-*` (x2) | Cluster-internal DNS — this is how `Service/java-api` becomes a resolvable name once you deploy it. |
| `kube-proxy-*` (one per node) | Programs each node's networking rules so Services actually route traffic. |
| `kindnet-*` (one per node) | Kind's built-in CNI plugin — gives Pods their networking. |

Every single one of these is itself a Pod managed by a Deployment or DaemonSet — the same objects explained in [Kubernetes concepts](kubernetes-concepts.md). Kubernetes bootstraps itself using itself.

## Storage

```bash
kubectl get storageclass
```

`standard` (backed by `local-path-storage`) is marked default — a `PersistentVolumeClaim` with no `storageClassName` uses it automatically. Training 01 doesn't need storage (the Java API is stateless), but now you know why it's there if a later training needs it.

## What's missing — on purpose

No `java-api` namespace, no application `Deployment`, no Flux controllers. Everything above is what Kubernetes itself needs to exist; everything Training 01 adds on top (via `flux bootstrap` and Git) is layered on this, not baked into the cluster image. That separation — infrastructure vs. what Git declares — is the whole point of the training that comes next.
