# Referencia: `cac-gitops-platform`

Repositorio canónico: `https://github.com/toniferr/cac-gitops-platform`.

## Responsabilidad

Este repositorio es el punto de entrada del estado deseado para un clúster. Flux hace bootstrap aquí, lee `clusters/kind-dev`, crea el namespace `java-api`, obtiene la fuente de la aplicación Java y aplica sus manifiestos.

## `clusters/kind-dev/kustomization.yaml`

El fichero raíz de [Kustomize](https://kustomize.io/) lista cuatro grupos de recursos:

| Recurso | Significado |
| --- | --- |
| `flux-system` | Controladores generados por Flux y definiciones locales de fuentes Flux. |
| `../../infrastructure/namespaces` | Objetos Namespace compartidos, incluido `java-api`. |
| `infrastructure` | Punto de extensión para infraestructura específica del clúster. |
| `apps` | Kustomizations Flux de cargas elegidas para este clúster. |

Kustomize no despliega por sí solo una aplicación aquí: ensambla este directorio para que Flux lo aplique como estado declarado del clúster.

## `clusters/kind-dev/flux-system/gotk-sync.yaml`

Este fichero lo genera `flux bootstrap github`; no se edita a mano. Su [`GitRepository`](https://fluxcd.io/flux/components/source/gitrepositories/)`/flux-system` registra la URL y rama Git de plataforma. Su [`Kustomization`](https://fluxcd.io/flux/components/kustomize/kustomizations/)`/flux-system` lee `./clusters/kind-dev`, iniciando la cadena anterior.

## `clusters/kind-dev/flux-system/apps-source.yaml`

`GitRepository/java-api` indica a source-controller que clone `java-api-gitops` cada minuto. La URL es la fuente de aplicación y `ref.branch` selecciona la rama exacta usada en la formación. Un repositorio privado de aplicación necesita credenciales de lectura adecuadas para esta fuente.

## `clusters/kind-dev/apps/java-api.yaml`

Esta `Kustomization` de Flux indica: obtener la fuente `java-api`, construir `./k8s`, aplicarla en el namespace `java-api`, esperar a disponibilidad y eliminar objetos que ya no estén declarados porque `prune` es verdadero. El intervalo de cinco minutos es la reconciliación normal; la CLI puede forzarla durante una demo.

## `infrastructure/namespaces/java-api.yaml`

Es un [Namespace](https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/) Kubernetes ordinario. Debe existir antes de crear una carga con namespace. Mantén primitivas de entorno o clúster en plataforma, no en repositorios de aplicación.

## Adaptación para la rama de formación

En una rama de formación, cambia tanto la fuente bootstrap de plataforma como `ref` del `GitRepository` Java a `training/01-gitops-flux-foundations`. Así el ejercicio queda fijado a versiones compatibles de plataforma y aplicación.

¿Trabajas desde tu propio fork? Cambia también `url` en `apps-source.yaml` a tu propio fork de `java-api-gitops` — cambiar solo `ref.branch` sigue leyendo de donde apunte `url`. Olvidar esto es la forma más común de que este ejercicio falle en silencio: tus commits van a tu fork, pero el clúster sigue reconciliando contra el repositorio original.
