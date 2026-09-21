# Reference: `java-api-gitops`

Canonical repository: `https://github.com/toniferr/java-api-gitops`.

## Application and image

`src/` is a [Spring Boot](https://docs.spring.io/spring-boot/index.html) HTTP API. `Dockerfile` uses a multi-stage build: Maven compiles the JAR in the first stage; the JRE-only second stage runs it as a non-root `app` user on port 8080. Kubernetes never builds this image: build it first, then load it into Kind or publish it to a registry.

## `k8s/kustomization.yaml`

This selects the namespace `java-api`, includes [ConfigMap](https://kubernetes.io/docs/concepts/configuration/configmap/), [Deployment](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/), and [Service](https://kubernetes.io/docs/concepts/services-networking/service/), and declares image tag `0.1.0`. [Kustomize](https://kustomize.io/) can replace the tag through this file without editing the Deployment directly.

## `k8s/configmap.yaml`

`java-api-config` provides `APP_GREETING`. The Deployment imports it with `envFrom`. Because it becomes a process environment variable, updating the ConfigMap does not restart an existing Pod automatically.

## `k8s/deployment.yaml`

`Deployment/api-java-gitops` declares two desired replicas. Its selector and Pod labels must match exactly; the Service uses the same name label. `imagePullPolicy: IfNotPresent` allows the preloaded Kind image. [Readiness checks](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#container-probes) decide when a Pod receives traffic; liveness checks restart an unhealthy process. Requests reserve 100m CPU and 256Mi memory; limits cap it at 500m and 512Mi.

## `k8s/service.yaml`

`Service/java-api` is `ClusterIP`: it is reachable within the cluster on port 80 and forwards to the container's named `http` port, 8080. Use `kubectl port-forward` for a local browser or curl; it is not externally exposed by default.

## First exercise

Change the Deployment replica value only. It is safe, immediately observable, and demonstrates both a Git-driven rollout and drift correction.
