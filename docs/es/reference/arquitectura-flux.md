# Arquitectura de Flux (referencia)

[Read in English](../../en/reference/flux-architecture.md)

Esto es una profundización independiente, no un paso de la ruta de aprendizaje. Usa los ficheros reales de `cac-gitops-platform` como ejemplos trabajados — lee [la referencia de plataforma](../../../references/es/cac-gitops-platform.md) junto a esta página para la vista fichero a fichero.

## Qué hace realmente `flux bootstrap github`

```bash
flux bootstrap github \
  --owner=<tu-usuario-github> \
  --repository=cac-gitops-platform \
  --branch=main \
  --path=clusters/kind-dev \
  --personal \
  --private
```

1. Instala los controladores de Flux en el clúster (`clusters/kind-dev/flux-system/gotk-components.yaml`).
2. Confirma un `GitRepository/flux-system` y una `Kustomization/flux-system` raíz en el mismo repositorio, apuntando a `--path` (`gotk-sync.yaml`).
3. Esa `Kustomization` raíz reconcilia `clusters/kind-dev` en sí mismo — incluido `flux-system/` — así que Flux gestiona su propia instalación desde Git después del bootstrap. Por eso los ficheros `gotk-*.yaml` se describen como generados: editarlos a mano choca con la siguiente reconciliación.

Todo lo que viene después (el `GitRepository` `apps-source.yaml` para `java-api-gitops`, la `Kustomization` `apps/java-api.yaml`) es contenido Git normal descubierto a través de esa misma Kustomization raíz, no parte del bootstrap en sí.

## Controladores usados en este laboratorio

| Controlador | Observa | Produce |
| --- | --- | --- |
| [`source-controller`](https://fluxcd.io/flux/components/source/) | `GitRepository` (también `HelmRepository`, `OCIRepository`, `Bucket`) | Un artefacto obtenido y versionado del origen — esto es lo que lee `kustomize-controller`. |
| [`kustomize-controller`](https://fluxcd.io/flux/components/kustomize/) | `Kustomization` | Ejecuta `kubectl kustomize` (o la API Go de Kustomize) sobre el `path` de un origen y aplica el resultado al clúster. |

Ambos son visibles con:

```bash
flux get sources git -A
flux get kustomizations -A
```

## [`GitRepository`](https://fluxcd.io/flux/components/source/gitrepositories/) — los campos que importan

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

| Campo | Significado |
| --- | --- |
| `interval` | Cada cuánto sondea `source-controller` el remoto en busca de nuevos commits. |
| `ref.branch` | También acepta `tag` o `semver` para fijar una versión en lugar de una rama que se mueve. |
| `secretRef` (no fijado aquí) | Necesario para un repositorio privado — apunta a un Secret con credenciales. Un repo público como este no necesita ninguno. |

## [`Kustomization`](https://fluxcd.io/flux/components/kustomize/kustomizations/) — los campos que importan

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

| Campo | Significado |
| --- | --- |
| `interval` | Cada cuánto se vuelve a aplicar esta Kustomization, con independencia del intervalo de sondeo del propio origen. |
| `path` | Directorio dentro del origen que se construye con Kustomize. |
| `prune` | Elimina objetos del clúster que esta Kustomization aplicó antes pero que ya no están declarados en Git. Esto es lo que hace que borrar un manifiesto en Git elimine realmente el objeto. |
| `wait` | Bloquea la reconciliación para no reportarse como sana hasta que los objetos aplicados están ready (Deployments disponibles, etc.), no solo "aplicados". |
| `timeout` | Cuánto espera `wait` antes de marcar la reconciliación como fallida. |
| `dependsOn` (no fijado aquí) | Ordena una Kustomization después de otra — útil cuando divides infraestructura y apps de forma más fina que en este laboratorio. |
| `targetNamespace` | Fuerza todos los objetos construidos desde `path` a este namespace, incluso si los manifiestos no fijan uno. |

## Por qué funciona la corrección de drift

En cada `interval`, `kustomize-controller` vuelve a aplicar los manifiestos construidos. `kubectl apply` es declarativo: volver a aplicar el mismo YAML no hace nada si no ha cambiado nada, pero si algo en el clúster se ha desviado de ese YAML (un `kubectl scale` manual), la siguiente aplicación devuelve el clúster al estado de Git. Este es todo el mecanismo detrás de la demo de drift de la Formación 01 — no hay ninguna función especial de "detección de drift", solo una reaplicación periódica del estado deseado, igual que siempre se comporta `kubectl apply`.

Fuérzalo de inmediato durante una demo en lugar de esperar al `interval`:

```bash
flux reconcile source git java-api -n flux-system
flux reconcile kustomization java-api -n flux-system --with-source
```

## Controladores que ya están corriendo, pero sin usar hasta formaciones posteriores

`flux bootstrap github` sin flags `--components`/`--components-extra` — exactamente el comando de arriba — instala **cuatro** controladores, no dos. Comprueba `kubectl get pods -n flux-system` en el clúster real de este laboratorio y verás `helm-controller` y `notification-controller` ahí ya, junto a `source-controller` y `kustomize-controller`. La Formación 01 simplemente nunca crea los objetos que les darían algo que hacer.

| Controlador | Propósito | Formación |
| --- | --- | --- |
| [`helm-controller`](https://fluxcd.io/flux/components/helm/) | Reconcilia objetos `HelmRelease` contra un origen `HelmRepository`/`OCIRepository` — para instalar charts de Helm de forma declarativa. Instalado e inactivo desde el bootstrap; nada que reconciliar hasta que exista un `HelmRelease`. | Posterior (empaquetado) |
| [`notification-controller`](https://fluxcd.io/flux/components/notification/) | Convierte eventos de Flux en alertas (Slack, webhooks) y puede recibir webhooks del proveedor Git para disparar una reconciliación instantánea en lugar de esperar al `interval`. Instalado e inactivo desde el bootstrap; nada que enviar hasta que exista un `Provider`/`Alert`. | Posterior |
| [`image-reflector-controller` / `image-automation-controller`](https://fluxcd.io/flux/components/image/) | Escanean un registro en busca de nuevos tags de imagen y confirman el tag actualizado de vuelta en Git automáticamente. **No se instalan** con el comando de bootstrap de arriba — estos dos sí necesitan `--components-extra=image-reflector-controller,image-automation-controller` en el bootstrap. | Formación 03 — entrega de imágenes |
