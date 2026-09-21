# Recorrido post-bootstrap (referencia)

[Read in English](../../en/reference/post-bootstrap-tour.md)

Esta es la continuación del [recorrido por el clúster Kind](recorrido-cluster-kind.md): aquel miraba el clúster en crudo antes de que existiera Flux; este mira qué añadió realmente `flux bootstrap github` y la primera reconciliación. Ejecútalo después de que el bootstrap se haya asentado (`flux get kustomizations -A` muestra todo `Ready`).

## `flux-system` — qué instaló el bootstrap

```bash
kubectl get pods -n flux-system
```

Verás cuatro Pods de controlador, no dos:

| Pod (prefijo del nombre) | ¿Hace algo todavía? |
| --- | --- |
| `source-controller-*` | Sí — clona tanto `cac-gitops-platform` (a sí mismo) como `java-api-gitops` en su `interval`. |
| `kustomize-controller-*` | Sí — aplica `clusters/kind-dev` y `./k8s` desde esos orígenes. |
| `helm-controller-*` | No. Se instala por defecto con el bootstrap, pero está inactivo — nada que hacer hasta que exista un objeto `HelmRelease` (formación posterior). |
| `notification-controller-*` | No. Lo mismo — inactivo hasta que exista un objeto `Provider`/`Alert`. |

Ver [Arquitectura de Flux](arquitectura-flux.md#controladores-que-ya-están-corriendo-pero-sin-usar-hasta-formaciones-posteriores) para entender por qué aparecen los cuatro aunque esta formación solo ejercite dos.

## Los sources y Kustomizations que realmente reconcilian

```bash
flux get sources git -A
flux get kustomizations -A
```

Dos de cada, y no son el mismo par:

| Nombre | Qué observa | Por qué existe |
| --- | --- | --- |
| `GitRepository/flux-system` | `cac-gitops-platform` a sí mismo | Creado por `flux bootstrap`; así es como Flux gestiona su propia instalación desde Git — ver [Arquitectura de Flux](arquitectura-flux.md#qué-hace-realmente-flux-bootstrap-github). |
| `Kustomization/flux-system` | El source anterior, ruta `./clusters/kind-dev` | Aplica la Kustomization raíz del propio repo de plataforma — la cadena que descubre todo lo demás, incluida la siguiente fila. |
| `GitRepository/java-api` | `java-api-gitops` | Declarado en `apps-source.yaml`, descubierto a través de la cadena anterior. |
| `Kustomization/java-api` | El source anterior, ruta `./k8s` | Aplica los manifiestos de la app Java en el namespace `java-api`. |

Si solo recuerdas una cosa de esta tabla: la Kustomization propia de `flux-system` es lo que hace que Flux se autogestione, y la Kustomization de `java-api` es la que realmente atacan los ejercicios de esta formación.

## `java-api` — qué produjo realmente Git

```bash
kubectl get all -n java-api
kubectl get configmap -n java-api
```

Esta es la recompensa: un `Deployment`, su `ReplicaSet`, sus Pods, y un `Service`, para ninguno de los cuales ejecutaste tú `kubectl apply` — lo hizo `kustomize-controller`, desde `java-api-gitops/k8s`. Si algún tipo de objeto de estos no te resulta familiar, [Conceptos de Kubernetes](conceptos-kubernetes.md) cubre cada uno; este recorrido trata de *de dónde vinieron*, no de qué son.

## La cadena completa, ahora que has visto cada eslabón

```text
cac-gitops-platform (Git)  →  GitRepository/flux-system  →  Kustomization/flux-system
                                                                      │
                                                                      ▼
                                                        descubre apps-source.yaml
                                                                      │
                                                                      ▼
java-api-gitops (Git)       →  GitRepository/java-api     →  Kustomization/java-api
                                                                      │
                                                                      ▼
                                                    Deployment/Service/ConfigMap en java-api
```

Cada flecha de arriba es un `flux get` o `kubectl get` que ya has ejecutado de verdad. Esa cadena — no los diagramas — es lo que realmente pone a prueba la demo de drift de la Formación 01: rompe el final, y todo lo de arriba lo devuelve a su sitio.
