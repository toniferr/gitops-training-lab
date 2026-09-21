# Recorrido por el clúster Kind (referencia)

[Read in English](../../en/reference/kind-cluster-tour.md)

Justo después de `kind create cluster`, antes de que existan Flux o la API Java, ya hay un clúster de Kubernetes funcionando con componentes reales corriendo. Esto es un recorrido guiado por lo que hay y por qué — usando exactamente los comandos con los que trabajarás en todas las formaciones, sobre el objetivo menos arriesgado posible (nada de esto es "tuyo" todavía).

## Nodos

```bash
kubectl get nodes -o wide
```

| Nodo | Papel |
| --- | --- |
| `gitops-lab-control-plane` | Ejecuta el plano de control de Kubernetes (API server, scheduler, controller-manager, etcd) — el "cerebro" del clúster. |
| `gitops-lab-worker` | Ejecuta tus cargas de trabajo reales (Pods). |

Ambos son solo contenedores Docker en tu máquina, no máquinas físicas reales — eso es lo que significa [Kind](https://kind.sigs.k8s.io/) ("Kubernetes IN Docker"). `setup/kind/gitops-lab-kind.yaml` es el fichero que dijo "dame uno de cada".

## Namespaces que existen antes de que hagas nada

```bash
kubectl get namespaces
```

| Namespace | Qué vive ahí |
| --- | --- |
| `default` | Donde caen los objetos si no especificas namespace. Nada que ver aquí todavía. |
| `kube-system` | Los propios componentes del plano de control de Kubernetes y los add-ons de todo el clúster — aquí está lo interesante, ver abajo. |
| `kube-public` | Legible por cualquier usuario sin autenticación, incluso anónimos. Guarda un puñado de datos públicos de todo el clúster (p. ej. `cluster-info`); rara vez lo tocarás directamente. |
| `kube-node-lease` | Un objeto `Lease` ligero por nodo, que usa el plano de control para detectar cuándo un nodo ha dejado de responder — los "latidos" de los nodos viven aquí en vez de en `kube-system`, para que un plano de control ocupado no tenga que competir con ellos. |
| `local-path-storage` | Ejecuta el provisioner que respalda la `StorageClass` por defecto de Kind — esto es lo que convierte un `PersistentVolumeClaim` en un directorio real en el nodo. Es un add-on de Kind, no parte de Kubernetes original. |

## Qué corre realmente en `kube-system`

```bash
kubectl get pods -n kube-system
```

Verás aproximadamente:

| Pod (prefijo del nombre) | Papel |
| --- | --- |
| `etcd-*` | La base de datos del clúster — todo objeto que crees alguna vez se guarda aquí. |
| `kube-apiserver-*` | La puerta de entrada: todo comando `kubectl` habla con este. |
| `kube-controller-manager-*` | Ejecuta los bucles de reconciliación de los objetos integrados (Deployments, etc.) — el mismo patrón que usa Flux más adelante para `Kustomization`. |
| `kube-scheduler-*` | Decide en qué nodo cae un Pod nuevo. |
| `coredns-*` (x2) | DNS interno del clúster — así es como `Service/java-api` se convierte en un nombre resoluble en cuanto lo despliegas. |
| `kube-proxy-*` (uno por nodo) | Programa las reglas de red de cada nodo para que los Services realmente enruten tráfico. |
| `kindnet-*` (uno por nodo) | El plugin CNI integrado de Kind — da red a los Pods. |

Cada uno de estos es a su vez un Pod gestionado por un Deployment o un DaemonSet — los mismos objetos explicados en [Conceptos de Kubernetes](conceptos-kubernetes.md). Kubernetes se arranca a sí mismo usándose a sí mismo.

## Almacenamiento

```bash
kubectl get storageclass
```

`standard` (respaldada por `local-path-storage`) está marcada como predeterminada — un `PersistentVolumeClaim` sin `storageClassName` la usa automáticamente. La Formación 01 no necesita almacenamiento (la API Java no tiene estado), pero ahora ya sabes por qué está ahí si una formación posterior lo necesita.

## Qué falta — a propósito

Ningún namespace `java-api`, ningún `Deployment` de aplicación, ningún controlador de Flux. Todo lo anterior es lo que Kubernetes necesita para existir; todo lo que añade la Formación 01 encima (vía `flux bootstrap` y Git) se apila sobre esto, no viene horneado en la imagen del clúster. Esa separación — infraestructura vs. lo que declara Git — es precisamente el punto de la formación que viene a continuación.
