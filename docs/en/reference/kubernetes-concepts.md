# Kubernetes concepts (reference)

[Versión en español](../../es/reference/conceptos-kubernetes.md)

This is a standalone deep dive, not a step in the learning path. Read it whenever you want more depth than the training exercises give you. It reuses the real objects from `java-api-gitops` as examples throughout.

## Pod, ReplicaSet, Deployment

| Object | Role |
| --- | --- |
| [Pod](https://kubernetes.io/docs/concepts/workloads/pods/) | The smallest deployable unit: one or more containers sharing network and storage. Pods are disposable; never manage them by hand in this lab. |
| [ReplicaSet](https://kubernetes.io/docs/concepts/workloads/controllers/replicaset/) | Keeps a fixed number of identical Pods running. You rarely create one directly. |
| [Deployment](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/) | Manages ReplicaSets on your behalf so you get rolling updates and rollback. `Deployment/api-java-gitops` in `java-api-gitops/k8s/deployment.yaml` is the one this lab uses. |

A Deployment creates a new ReplicaSet on every Pod template change, scales it up, and scales the old one down. That is what "rollout" means.

## Rollout and rollback

Default strategy is `RollingUpdate`: Kubernetes replaces Pods gradually instead of all at once, controlled by:

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 25%   # how many old Pods may be down at once
    maxSurge: 25%         # how many extra Pods may exist during the rollout
```

`api-java-gitops` does not set these explicitly, so it uses the Kubernetes defaults above. Watch a rollout with:

```bash
kubectl rollout status deployment/api-java-gitops -n java-api
kubectl rollout history deployment/api-java-gitops -n java-api
kubectl rollout undo deployment/api-java-gitops -n java-api
```

In this lab, rollback is done through Git (`git revert`, see [the learning path](../00-learning-path.md)), not `rollout undo` — the cluster state must keep matching Git, or Flux will simply overwrite a manual undo on its next reconciliation.

## Services

[Service](https://kubernetes.io/docs/concepts/services-networking/service/) [types](https://kubernetes.io/docs/concepts/services-networking/service/#publishing-services-service-types):

| Type | Reachable from | Used when |
| --- | --- | --- |
| `ClusterIP` (default) | Inside the cluster only | Internal traffic, or fronted by a port-forward/ingress. This lab's `Service/java-api` is `ClusterIP`. |
| `NodePort` | `<node-ip>:<port>` from outside | Quick external access without a load balancer; the Kind port mapping in `setup/kind/gitops-lab-kind.yaml` is reserved for this in a later exercise. |
| `LoadBalancer` | An external IP provisioned by the cloud provider | Not meaningful on a local Kind cluster. |
| `ExternalName` | DNS alias to an external name | Pointing at something outside the cluster. |

A Service finds its Pods through a label selector, never through Pod names — see [Labels and selectors](#labels-and-selectors-the-thread-that-connects-everything).

## ConfigMap and Secret

Both [ConfigMap](https://kubernetes.io/docs/concepts/configuration/configmap/) and [Secret](https://kubernetes.io/docs/concepts/configuration/secret/) hold configuration outside the container image. A Secret is base64-encoded, not encrypted, at rest by default — treat it the same as a ConfigMap for confidentiality unless the cluster has encryption at rest or a tool like SOPS/Sealed Secrets configured (out of scope for this lab; see Training 04 in [the learning path](../00-learning-path.md)).

Two ways to consume either one:

| Method | Behavior when the source changes |
| --- | --- |
| `envFrom` / `env` (what `api-java-gitops` uses) | The Pod's environment is set once at container start. Changing the ConfigMap does **not** restart or update a running Pod. |
| Mounted volume | The file inside the Pod is updated automatically (kubelet sync delay applies), but the running process still has to notice and reload it. |

This is why the instructor runbook avoids a ConfigMap edit as the visible Training 01 demo — nothing observable happens until the Pod restarts for another reason.

## Namespace

A [Namespace](https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/) scopes names and access, not performance. `Namespace/java-api` (`infrastructure/namespaces/java-api.yaml` in `cac-gitops-platform`) must exist before any namespaced object can be created in it — this is why the platform's root Kustomization lists `infrastructure/namespaces` before `apps`.

## [Probes](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#container-probes)

| Probe | Answers | Effect on failure |
| --- | --- | --- |
| `readinessProbe` | Can this Pod receive traffic right now? | Removed from the Service's endpoints; container keeps running. |
| `livenessProbe` | Is this process still healthy? | Container is restarted. |
| `startupProbe` (not used here) | Has slow-starting app finished booting? | Delays the other two probes until it succeeds. |

`api-java-gitops` checks `/actuator/health/readiness` and `/actuator/health/liveness`, the standard Spring Boot Actuator endpoints.

## [Requests and limits](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)

```yaml
resources:
  requests:
    cpu: 100m
    memory: 256Mi
  limits:
    cpu: 500m
    memory: 512Mi
```

`requests` is what the scheduler reserves when placing the Pod on a node. `limits` is the hard ceiling: exceeding the memory limit gets the container OOM-killed; exceeding the CPU limit only throttles it. A Pod with requests equal to limits on every resource gets the `Guaranteed` QoS class, the least likely to be evicted under node pressure; `api-java-gitops` (requests below limits) is `Burstable`.

## [Labels and selectors](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/): the thread that connects everything

Nothing links a Deployment, its Pods, and a Service by name — they link by **labels**:

```text
Deployment.spec.selector.matchLabels  ──┐
Deployment.spec.template.metadata.labels │  must all match
Service.spec.selector                 ──┘
```

In `api-java-gitops`, that shared label is `app.kubernetes.io/name: java-api`. If you ever change a Pod template's labels without updating the Deployment selector and the Service selector together, the Service silently stops routing to any Pod — a very common real-world outage, and worth breaking on purpose once to see it happen.
