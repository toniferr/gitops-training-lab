# Conceptos de Kubernetes (referencia)

[Read in English](../../en/reference/kubernetes-concepts.md)

Esto es una profundización independiente, no un paso de la ruta de aprendizaje. Léelo cuando quieras más profundidad de la que dan los ejercicios de las formaciones. Usa en todo momento los objetos reales de `java-api-gitops` como ejemplo.

## Pod, ReplicaSet, Deployment

| Objeto | Papel |
| --- | --- |
| [Pod](https://kubernetes.io/docs/concepts/workloads/pods/) | La unidad desplegable más pequeña: uno o varios contenedores que comparten red y almacenamiento. Los Pods son desechables; en este laboratorio nunca se gestionan a mano. |
| [ReplicaSet](https://kubernetes.io/docs/concepts/workloads/controllers/replicaset/) | Mantiene un número fijo de Pods idénticos en ejecución. Rara vez se crea directamente. |
| [Deployment](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/) | Gestiona ReplicaSets por ti para dar despliegues progresivos (rollout) y reversión (rollback). `Deployment/api-java-gitops` en `java-api-gitops/k8s/deployment.yaml` es el que usa este laboratorio. |

Un Deployment crea un nuevo ReplicaSet cada vez que cambia la plantilla de Pod, lo escala hacia arriba y escala el antiguo hacia abajo. Eso es lo que significa "rollout".

## Rollout y rollback

La estrategia por defecto es `RollingUpdate`: Kubernetes sustituye los Pods de forma gradual en vez de todos a la vez, controlado por:

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 25%   # cuántos Pods antiguos pueden estar caídos a la vez
    maxSurge: 25%         # cuántos Pods extra pueden existir durante el rollout
```

`api-java-gitops` no fija estos valores explícitamente, así que usa los valores por defecto de Kubernetes anteriores. Observa un rollout con:

```bash
kubectl rollout status deployment/api-java-gitops -n java-api
kubectl rollout history deployment/api-java-gitops -n java-api
kubectl rollout undo deployment/api-java-gitops -n java-api
```

En este laboratorio, el rollback se hace mediante Git (`git revert`, ver [la ruta de aprendizaje](../00-ruta-aprendizaje.md)), no con `rollout undo` — el estado del clúster debe seguir coincidiendo con Git, o Flux simplemente sobrescribirá un undo manual en su próxima reconciliación.

## Services

[Tipos de Service](https://kubernetes.io/docs/concepts/services-networking/service/#publishing-services-service-types):

| Tipo | Alcanzable desde | Se usa cuando |
| --- | --- | --- |
| `ClusterIP` (por defecto) | Solo dentro del clúster | Tráfico interno, o expuesto mediante port-forward/ingress. El `Service/java-api` de este laboratorio es `ClusterIP`. |
| `NodePort` | `<ip-del-nodo>:<puerto>` desde fuera | Acceso externo rápido sin balanceador de carga; el mapeo de puertos de Kind en `setup/kind/gitops-lab-kind.yaml` está reservado para esto en un ejercicio posterior. |
| `LoadBalancer` | Una IP externa provisionada por el proveedor cloud | No tiene sentido en un clúster Kind local. |
| `ExternalName` | Alias DNS hacia un nombre externo | Apuntar a algo fuera del clúster. |

Un Service encuentra sus Pods mediante un selector de labels, nunca por el nombre del Pod — ver [Labels y selectores](#labels-y-selectores-el-hilo-que-lo-conecta-todo).

## ConfigMap y Secret

Tanto [ConfigMap](https://kubernetes.io/docs/concepts/configuration/configmap/) como [Secret](https://kubernetes.io/docs/concepts/configuration/secret/) guardan configuración fuera de la imagen del contenedor. Un Secret está codificado en base64, no cifrado, en reposo por defecto — trátalo igual que un ConfigMap en cuanto a confidencialidad a menos que el clúster tenga cifrado en reposo o una herramienta como SOPS/Sealed Secrets configurada (fuera del alcance de este laboratorio; ver la Formación 04 en [la ruta de aprendizaje](../00-ruta-aprendizaje.md)).

Dos formas de consumir cualquiera de los dos:

| Método | Comportamiento cuando cambia el origen |
| --- | --- |
| `envFrom` / `env` (lo que usa `api-java-gitops`) | El entorno del Pod se fija una sola vez al arrancar el contenedor. Cambiar el ConfigMap **no** reinicia ni actualiza un Pod en ejecución. |
| Volumen montado | El fichero dentro del Pod se actualiza automáticamente (con el retraso de sincronización del kubelet), pero el proceso en ejecución todavía tiene que darse cuenta y recargarlo. |

Por eso el runbook de instructor evita usar un cambio de ConfigMap como demo visible en la Formación 01 — no ocurre nada observable hasta que el Pod se reinicia por otro motivo.

## Namespace

Un [Namespace](https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/) acota nombres y accesos, no rendimiento. `Namespace/java-api` (`infrastructure/namespaces/java-api.yaml` en `cac-gitops-platform`) debe existir antes de poder crear cualquier objeto con espacio de nombres dentro de él — por eso la Kustomization raíz de la plataforma lista `infrastructure/namespaces` antes que `apps`.

## [Probes](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#container-probes)

| Probe | Responde | Efecto si falla |
| --- | --- | --- |
| `readinessProbe` | ¿Puede este Pod recibir tráfico ahora mismo? | Se elimina de los endpoints del Service; el contenedor sigue en ejecución. |
| `livenessProbe` | ¿Sigue sano este proceso? | El contenedor se reinicia. |
| `startupProbe` (no usada aquí) | ¿Ha terminado de arrancar una app lenta? | Retrasa las otras dos probes hasta que tiene éxito. |

`api-java-gitops` comprueba `/actuator/health/readiness` y `/actuator/health/liveness`, los endpoints estándar de Spring Boot Actuator.

## [Requests y limits](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)

```yaml
resources:
  requests:
    cpu: 100m
    memory: 256Mi
  limits:
    cpu: 500m
    memory: 512Mi
```

`requests` es lo que reserva el scheduler al colocar el Pod en un nodo. `limits` es el techo estricto: superar el límite de memoria mata el contenedor por OOM; superar el límite de CPU solo lo limita (throttling). Un Pod con requests igual a limits en todos los recursos obtiene la clase de QoS `Guaranteed`, la menos propensa a ser desalojada bajo presión del nodo; `api-java-gitops` (requests por debajo de limits) es `Burstable`.

## [Labels y selectores](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/): el hilo que lo conecta todo

Nada enlaza un Deployment, sus Pods y un Service por nombre — se enlazan por **labels**:

```text
Deployment.spec.selector.matchLabels  ──┐
Deployment.spec.template.metadata.labels │  deben coincidir todos
Service.spec.selector                 ──┘
```

En `api-java-gitops`, ese label compartido es `app.kubernetes.io/name: java-api`. Si alguna vez cambias los labels de una plantilla de Pod sin actualizar a la vez el selector del Deployment y el selector del Service, el Service deja de enrutar a cualquier Pod de forma silenciosa — una caída muy habitual en producción, y vale la pena provocarla una vez a propósito para verla ocurrir.
