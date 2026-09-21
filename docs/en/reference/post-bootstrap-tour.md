# Post-bootstrap tour (reference)

[Versión en español](../../es/reference/recorrido-post-bootstrap.md)

This is the sequel to the [Kind cluster tour](kind-cluster-tour.md): that one looked at the raw cluster before Flux existed; this one looks at what `flux bootstrap github` and the first reconciliation actually added. Run this after bootstrap has settled (`flux get kustomizations -A` shows everything `Ready`).

## `flux-system` — what bootstrap installed

```bash
kubectl get pods -n flux-system
```

You'll see four controller Pods, not two:

| Pod (name prefix) | Doing anything yet? |
| --- | --- |
| `source-controller-*` | Yes — cloning both `cac-gitops-platform` (itself) and `java-api-gitops` on their `interval`. |
| `kustomize-controller-*` | Yes — applying `clusters/kind-dev` and `./k8s` from those sources. |
| `helm-controller-*` | No. Installed by default bootstrap, but idle — nothing to do until a `HelmRelease` object exists (a later training). |
| `notification-controller-*` | No. Same story — idle until a `Provider`/`Alert` object exists. |

See [Flux architecture](flux-architecture.md#controllers-already-running-but-unused-until-later-trainings) for why all four show up even though this training only exercises two.

## The sources and Kustomizations actually reconciling

```bash
flux get sources git -A
flux get kustomizations -A
```

Two of each, and they're not the same pair:

| Name | What it watches | Why it exists |
| --- | --- | --- |
| `GitRepository/flux-system` | `cac-gitops-platform` itself | Created by `flux bootstrap`; this is how Flux manages its own installation from Git — see [Flux architecture](flux-architecture.md#what-flux-bootstrap-github-actually-does). |
| `Kustomization/flux-system` | Source above, path `./clusters/kind-dev` | Applies the platform repo's own root Kustomization — the chain that discovers everything else, including the next row. |
| `GitRepository/java-api` | `java-api-gitops` | Declared in `apps-source.yaml`, discovered through the chain above. |
| `Kustomization/java-api` | Source above, path `./k8s` | Applies the Java app's manifests into the `java-api` namespace. |

If you only remember one thing from this table: `flux-system`'s own Kustomization is what makes Flux self-managing, and `java-api`'s Kustomization is the one this training's exercises actually target.

## `java-api` — what Git actually produced

```bash
kubectl get all -n java-api
kubectl get configmap -n java-api
```

This is the payoff: a `Deployment`, its `ReplicaSet`, its Pods, and a `Service`, none of which you ran `kubectl apply` for — `kustomize-controller` did, from `java-api-gitops/k8s`. If any of these object types are unfamiliar, [Kubernetes concepts](kubernetes-concepts.md) covers each one; this tour is about *where they came from*, not what they are.

## The full chain, now that you've seen every link

```text
cac-gitops-platform (Git)  →  GitRepository/flux-system  →  Kustomization/flux-system
                                                                      │
                                                                      ▼
                                                            discovers apps-source.yaml
                                                                      │
                                                                      ▼
java-api-gitops (Git)       →  GitRepository/java-api     →  Kustomization/java-api
                                                                      │
                                                                      ▼
                                                        Deployment/Service/ConfigMap in java-api
```

Every arrow above is a `flux get` or `kubectl get` you've now actually run. That chain — not the diagrams — is what Training 01's drift demo is really testing: break the bottom, and everything above it pushes it back.
