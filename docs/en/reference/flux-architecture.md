# Flux architecture (reference)

[Versión en español](../../es/reference/arquitectura-flux.md)

This is a standalone deep dive, not a step in the learning path. It uses the real files in `cac-gitops-platform` as worked examples — read [the platform reference](../../../references/en/cac-gitops-platform.md) alongside it for the file-by-file view.

## What `flux bootstrap github` actually does

```bash
flux bootstrap github \
  --owner=<your-github-username> \
  --repository=cac-gitops-platform \
  --branch=main \
  --path=clusters/kind-dev \
  --personal \
  --private
```

1. Installs the Flux controllers into the cluster (`clusters/kind-dev/flux-system/gotk-components.yaml`).
2. Commits a `GitRepository/flux-system` and a root `Kustomization/flux-system` into the same repository, pointed at `--path` (`gotk-sync.yaml`).
3. That root `Kustomization` reconciles `clusters/kind-dev` itself — including `flux-system/` — so Flux manages its own installation from Git after bootstrap. This is why `gotk-*.yaml` files are described as generated: editing them by hand fights the next reconciliation.

Everything downstream (the `apps-source.yaml` GitRepository for `java-api-gitops`, the `apps/java-api.yaml` Kustomization) is regular Git content discovered through that same root Kustomization, not part of bootstrap itself.

## Controllers used in this lab

| Controller | Watches | Produces |
| --- | --- | --- |
| [`source-controller`](https://fluxcd.io/flux/components/source/) | `GitRepository` (also `HelmRepository`, `OCIRepository`, `Bucket`) | A fetched, versioned artifact of the source — this is what `kustomize-controller` reads from. |
| [`kustomize-controller`](https://fluxcd.io/flux/components/kustomize/) | `Kustomization` | Runs `kubectl kustomize` (or Kustomize's Go API) on a source's `path` and applies the result to the cluster. |

Both are visible with:

```bash
flux get sources git -A
flux get kustomizations -A
```

## [`GitRepository`](https://fluxcd.io/flux/components/source/gitrepositories/) — the fields that matter

`clusters/kind-dev/flux-system/apps-source.yaml`:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: java-api
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/toniferr/java-api-gitops.git
  ref:
    branch: main
```

| Field | Meaning |
| --- | --- |
| `interval` | How often `source-controller` polls the remote for new commits. |
| `ref.branch` | Also accepts `tag` or `semver` for pinning to a release instead of a moving branch. |
| `secretRef` (not set here) | Required for a private repository — points at a Secret with credentials. A public repo like this one needs none. |

## [`Kustomization`](https://fluxcd.io/flux/components/kustomize/kustomizations/) — the fields that matter

`clusters/kind-dev/apps/java-api.yaml`:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: java-api
  namespace: flux-system
spec:
  interval: 5m
  path: ./k8s
  prune: true
  wait: true
  timeout: 2m
  sourceRef:
    kind: GitRepository
    name: java-api
  targetNamespace: java-api
```

| Field | Meaning |
| --- | --- |
| `interval` | How often this Kustomization re-applies, independent of the source's own polling interval. |
| `path` | Directory inside the source to build with Kustomize. |
| `prune` | Deletes cluster objects that were previously applied by this Kustomization but are no longer declared in Git. This is what makes deleting a manifest in Git actually remove the object. |
| `wait` | Blocks the reconciliation from being reported healthy until applied objects report ready (Deployments available, etc.), not just "applied." |
| `timeout` | How long `wait` waits before marking the reconciliation as failed. |
| `dependsOn` (not set here) | Orders one Kustomization after another — useful once you split infrastructure from apps more finely than this lab does. |
| `targetNamespace` | Forces every object built from `path` into this namespace, even if the manifests don't set one. |

## Why drift correction works

Every `interval`, `kustomize-controller` re-applies the built manifests. `kubectl apply` is declarative: applying the same YAML again is a no-op if nothing changed, but if something in the cluster has drifted from that YAML (a manual `kubectl scale`), the next apply pushes the cluster back to match Git. This is the entire mechanism behind the Training 01 drift demo — there is no special "drift detection" feature, just periodic re-application of desired state, the same way `kubectl apply` always behaves.

Force it immediately during a demo instead of waiting for `interval`:

```bash
flux reconcile source git java-api -n flux-system
flux reconcile kustomization java-api -n flux-system --with-source
```

## Controllers already running, but unused until later trainings

`flux bootstrap github` with no `--components`/`--components-extra` flags — exactly the command above — installs **four** controllers, not two. Check `kubectl get pods -n flux-system` on this lab's real cluster and you'll see `helm-controller` and `notification-controller` sitting there already, alongside `source-controller` and `kustomize-controller`. Training 01 just never creates the objects that would give them anything to do.

| Controller | Purpose | Training |
| --- | --- | --- |
| [`helm-controller`](https://fluxcd.io/flux/components/helm/) | Reconciles `HelmRelease` objects against a `HelmRepository`/`OCIRepository` source — for installing Helm charts declaratively. Installed and idle since bootstrap; nothing to reconcile until a `HelmRelease` exists. | Later (packaging) |
| [`notification-controller`](https://fluxcd.io/flux/components/notification/) | Turns Flux events into alerts (Slack, webhooks) and can receive Git provider webhooks to trigger instant reconciliation instead of waiting for `interval`. Installed and idle since bootstrap; nothing to send until a `Provider`/`Alert` exists. | Later |
| [`image-reflector-controller` / `image-automation-controller`](https://fluxcd.io/flux/components/image/) | Scan a registry for new image tags and commit the updated tag back to Git automatically. **Not installed** by the bootstrap command above — these two genuinely require `--components-extra=image-reflector-controller,image-automation-controller` at bootstrap time. | Training 03 — image delivery |
