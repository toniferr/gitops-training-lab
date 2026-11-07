# Formación 01 — Fundamentos de GitOps y Flux

<!--
Contenido de la web de esta formación. Convenciones (ver site/README.md):
- Cada "## Título {etiqueta}" es una sección (una pantalla en modo presentación).
- Una sección con el comentario "instructor" solo se ve en modo formador.
- "> [!NOTES]" son notas del formador; "> [!NOTE]", "> [!TIP]", "> [!WARNING]" son avisos.
- "> [!DOCS]" con una lista de enlaces: documentación para ampliar, al pie de la sección.
- Bloques ```flow, ```cards y ```steps: una línea por elemento, "Título | texto".
- Enlaces "repo:ruta" apuntan al fichero en GitHub, en la rama publicada.
-->

Resultado de la sesión: distinguir **estado deseado** de **estado de ejecución**, y ver a [Flux](https://fluxcd.io/flux/) reconciliar un clúster real a partir de un commit.

## Antes de la sesión {Preparación}

<!-- instructor -->

Usa la misma rama, `training/01-gitops-flux-foundations`, en `cac-gitops-platform` y `java-api-gitops`. El [`GitRepository`](https://fluxcd.io/flux/components/source/gitrepositories/) de plataforma debe apuntar al repositorio Java **y a esa rama**. Haz bootstrap de Flux contra la rama de plataforma.

Prepara la imagen local antes de compartir pantalla:

```bash
cd ~/Workspace/java-api-gitops
docker build -t gitops-lab/java-api:0.1.0 .
kind load docker-image gitops-lab/java-api:0.1.0 --name gitops-lab
```

Verifica todo antes de que llegue el alumnado:

```bash
kubectl config current-context
flux get sources git -A
flux get kustomizations -A
kubectl get all -n java-api
```

> [!TIP]
> Deja abierta una segunda terminal con `kubectl port-forward -n java-api svc/java-api 8080:80`; la usarás en la demo.

> [!DOCS]
> - [Guion del formador](repo:training/01-gitops-flux-foundations/instructor-runbook.es.md)
> - [Preparación de WSL2/Ubuntu](repo:docs/es/01-preparacion-wsl-ubuntu.md)
> - [Recorrido por el clúster Kind](repo:docs/es/reference/recorrido-cluster-kind.md)
> - [Bootstrap de Flux con GitHub](https://fluxcd.io/flux/installation/bootstrap/github/)

## Introducción {Contexto · 0–2 min}

- **Dónde:** arquitectura de IOPEDGE, para Inditex
- **Equipo:** IOP Turing Lee, por Alan Turing y Tim Berners-Lee
- **Qué proveemos:** un sistema de *locations* donde otros equipos despliegan sus workloads

![Plataforma: el sistema de locations engloba los microservicios, Azure (Cosmos DB, Event Hubs, Kubernetes…) y los clústeres de tiendas y almacenes; los equipos de Inditex sacan sus versiones con un push a Git y Flux reconcilia esos clústeres automáticamente](diagrams/iopedge-platform.es.svg "Cada equipo saca sus versiones por su cuenta: hace push a Git y Flux reconcilia automáticamente. Es lo que hoy veremos en pequeño, en un laboratorio.")

> [!NOTES]
> Recorre primero la caja azul: tocamos los microservicios, Azure y los clústeres. Termina en la fila de abajo, que es el puente hacia la formación: los equipos de Inditex sacan versiones sin depender de nosotros.

## ¿Qué es un clúster de Kubernetes? {Teoría · 2–6 min}

Un **clúster** es un grupo de máquinas, llamadas **nodos**, que trabajan como si fueran una sola. [Kubernetes](https://kubernetes.io/docs/concepts/overview/) es el software que las coordina: tú le dices *qué* quieres ejecutar, y él decide *dónde* y se encarga de que siga funcionando.

![Clúster de Kubernetes: un plano de control con kube-apiserver, etcd, scheduler y controller-manager, y dos nodos worker con kubelet, containerd y Pods](diagrams/cluster.es.svg "Un Pod es uno o varios contenedores que se ejecutan juntos: la unidad mínima de Kubernetes. En este laboratorio, kind simula el clúster entero en tu portátil: cada nodo es un contenedor Docker dentro de WSL2.")

> [!NOTES]
> Analogía: el plano de control es la torre de control de un aeropuerto y los nodos son las pistas; nada aterriza sin pasar por la torre (`kube-apiserver`). No entres en cada componente: basta con saber que existen y qué papel juegan. Señala la caja «Tú o Flux»: más adelante verán que, con GitOps, quien habla con el clúster es Flux.

> [!DOCS]
> - [Kubernetes: componentes del clúster](https://kubernetes.io/docs/concepts/overview/components/)
> - [Kubernetes: Pods](https://kubernetes.io/docs/concepts/workloads/pods/)
> - [Recorrido por el clúster Kind](repo:docs/es/reference/recorrido-cluster-kind.md)
> - [Kind](https://kind.sigs.k8s.io/)

## Kubernetes no ejecuta órdenes: reconcilia estado {Teoría · 2–6 min}

Esta idea prepara todo lo demás: GitOps usa **el mismo patrón**, solo que con Git como entrada estable.

```flow
YAML / spec | Declaras qué quieres, no cómo hacerlo.
`kube-apiserver` | Lo valida y lo guarda en `etcd` como estado deseado.
`controller-manager` | Sus controladores comparan deseado y real, y actúan.
Status | Reporta el estado real observado.
```

El controlador repite este ciclo sin fin: comparar `spec` con `status`, y actuar si difieren.

> [!NOTES]
> Pregunta al grupo: «si borro un Pod de un Deployment con 2 réplicas, ¿qué pasa?». La respuesta (aparece otro) es la reconciliación en pequeño.

> [!DOCS]
> - [Conceptos de Kubernetes](repo:docs/es/reference/conceptos-kubernetes.md)
> - [Kubernetes: controladores](https://kubernetes.io/docs/concepts/architecture/controller/)
> - [Kubernetes: objetos](https://kubernetes.io/docs/concepts/overview/working-with-objects/)

## Anatomía de un manifiesto {Teoría · 6–10 min}

Todo objeto cuenta la misma historia: quién soy, qué quiero, qué está ocurriendo.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mi-app
  labels:
    app.kubernetes.io/name: mi-app
spec:
  replicas: 2            # lo que edita Git
status:
  availableReplicas: 2   # lo que reporta el clúster
```

```cards
apiVersion + kind | Tipo de contrato con Kubernetes.
metadata | Nombre, labels, namespace.
spec | Estado **deseado** por el equipo — lo que edita Git.
status | Estado **observado** por el clúster — lo que reporta `kubectl`.
```

> [!NOTES]
> Regla de la demo: no leas todo el YAML; señala solo el campo que cambia de decisión (`replicas`).

> [!DOCS]
> - [Kubernetes: `spec` y `status`](https://kubernetes.io/docs/concepts/overview/working-with-objects/#object-spec-and-status)
> - [Labels y selectores](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/)
> - [Conceptos de Kubernetes](repo:docs/es/reference/conceptos-kubernetes.md)

## GitOps: Git como contrato operativo {Teoría · 6–10 min}

Git deja de ser solo historial y pasa a ser la entrada que el clúster obedece.

```flow
Pull Request | cambio revisado
Git | estado deseado
Flux | reconciliador
Kubernetes | ejecución real
```

Los cuatro principios de [OpenGitOps](https://opengitops.dev/):

```cards
Declarativo | El sistema se describe como estado deseado, no como pasos.
Versionado e inmutable | Ese estado vive en Git, con historial completo.
Pull automático | Un agente dentro del clúster lo trae; nadie hace push al clúster.
Reconciliación continua | El agente compara y corrige el drift en cada intervalo.
```

> [!DOCS]
> - [Principios de OpenGitOps](https://opengitops.dev/)
> - [Flux: conceptos básicos](https://fluxcd.io/flux/concepts/)

## Dos repositorios, dos responsabilidades {Nuestro escenario · 10–13 min}

Pasamos de la teoría a nuestro escenario. Los cambios en un clúster deben ser **repetibles y auditables**; por eso separamos quién decide qué corre en el clúster y quién describe la aplicación.

```steps
cac-gitops-platform | Bootstrap de Flux, namespaces y qué aplicaciones observa el clúster.
java-api-gitops | Código Spring Boot, `Dockerfile` y los manifiestos Kubernetes de la API.
```

Los manifiestos de `java-api-gitops/k8s/` son el [Deployment](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/) `api-java-gitops`, el [Service](https://kubernetes.io/docs/concepts/services-networking/service/) `java-api` y el [ConfigMap](https://kubernetes.io/docs/concepts/configuration/configmap/) `java-api-config`, dentro del namespace `java-api` que crea la plataforma.

> [!NOTES]
> Idea a fijar: `cac-gitops-platform` es la fuente de verdad del clúster (qué corre en él); `java-api-gitops` describe la aplicación. Cada equipo cambia su repositorio sin tocar el del otro.

> [!DOCS]
> - [Ruta de aprendizaje](repo:docs/es/00-ruta-aprendizaje.md)
> - [`cac-gitops-platform`, fichero a fichero](repo:references/es/cac-gitops-platform.md)
> - [`java-api-gitops`, fichero a fichero](repo:references/es/java-api-gitops.md)

## Cómo encaja todo: Git, Flux y Kubernetes {Nuestro escenario · 10–13 min}

[Flux](https://fluxcd.io/flux/) es un conjunto de controladores que viven **dentro** del clúster. Vigilan tus repositorios de Git y aplican en Kubernetes lo que encuentran, una y otra vez. Tú solo cambias Git.

![Git, Flux y Kubernetes: haces push a GitHub; source-controller descarga los repositorios; kustomize-controller aplica los manifiestos en kube-apiserver; Kubernetes ejecuta el Deployment, los Pods y el Service de java-api](diagrams/gitops-flux.es.svg "Si alguien cambia el clúster a mano, en el siguiente ciclo Flux lo devuelve a lo que dice Git.")

> [!NOTES]
> Recorre el dibujo siguiendo un único cambio, `replicas: 2 → 1`: lo editas y haces push (abajo a la izquierda), `source-controller` lo descarga, `kustomize-controller` lo aplica y Kubernetes deja un solo Pod. Es exactamente lo que harás en vivo en la Demo 1.

> [!DOCS]
> - [Flux: componentes](https://fluxcd.io/flux/components/)
> - [`GitRepository`](https://fluxcd.io/flux/components/source/gitrepositories/)
> - [`Kustomization`](https://fluxcd.io/flux/components/kustomize/kustomizations/)
> - [Arquitectura de Flux](repo:docs/es/reference/arquitectura-flux.md)
> - [Recorrido post-bootstrap](repo:docs/es/reference/recorrido-post-bootstrap.md)

## Demo 1 — Un commit se convierte en estado del clúster {Demo en vivo · 13–18 min}

```steps
Editar | En `k8s/deployment.yaml`, cambia `replicas: 2` → `1`.
Commit + push | A la rama `training/01-gitops-flux-foundations`.
Reconciliar | Pide a Flux que relea Git y aplique ya, sin esperar al intervalo.
Verificar | El Deployment pasa a `1/1`.
```

```bash
git add k8s/deployment.yaml
git commit -m "scale java-api to 1 replica"
git push

flux reconcile kustomization java-api -n flux-system --with-source
kubectl rollout status deployment/api-java-gitops -n java-api
```

> [!NOTES]
> Remarca que el `push` por sí solo no cambia nada todavía: Flux no reacciona a GitHub en tiempo real, solo en su próxima reconciliación. `flux reconcile` solo adelanta ese momento.

> [!DOCS]
> - [`flux reconcile`](https://fluxcd.io/flux/cmd/flux_reconcile/)
> - [`kubectl rollout`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/)
> - [Guía del alumno](repo:training/01-gitops-flux-foundations/learner-guide.es.md)

## Demo 2 — Provocar drift y verlo corregirse {Demo en vivo · 18–21 min}

Un cambio manual en el clúster **no es** estado deseado.

```bash
kubectl scale deployment/api-java-gitops -n java-api --replicas=3
kubectl get deployment/api-java-gitops -n java-api   # 3/3, momentáneamente

flux reconcile kustomization java-api -n flux-system --with-source
kubectl get deployment/api-java-gitops -n java-api   # vuelve a 1/1
```

Kubernetes obedece el `scale` al instante porque no sabe que Git dice `1`. En la siguiente reconciliación, Flux compara Git con el clúster y deshace el cambio manual.

> [!TIP]
> No es magia: es `kubectl apply` reaplicado sobre un objeto que se desvió de su YAML.

> [!DOCS]
> - [Por qué funciona la corrección de drift](repo:docs/es/reference/arquitectura-flux.md#por-qué-funciona-la-corrección-de-drift)
> - [`kubectl scale`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_scale/)

## Rollback por Git, y qué evitar {Cierre · 21–25 min}

```bash
git revert HEAD --no-edit
git push
flux reconcile kustomization java-api -n flux-system --with-source
```

Flux reconcilia el estado revertido igual que cualquier otro commit, y el historial de lo ocurrido queda intacto.

> [!WARNING]
> Evita `kubectl rollout undo`: cambia el clúster sin cambiar Git, y Flux lo deshace en el siguiente ciclo. Evita también `kubectl apply` manual contra `java-api`: Flux ya lo gestiona y hacerlo a mano confunde el origen de verdad.

> [!NOTES]
> Volver a 2 réplicas arranca un Pod nuevo y, con `wait: true`, `flux reconcile` puede esperar cerca de un minuto: aprovecha ese rato para explicar el aviso de «qué evitar». No uses un cambio de ConfigMap como demostración visible: la app lo consume como variable de entorno, así que un Pod existente no se reinicia solo al cambiar el ConfigMap.

> [!DOCS]
> - [`git revert`](https://git-scm.com/docs/git-revert)
> - [Flux: `prune`](https://fluxcd.io/flux/components/kustomize/kustomizations/#prune)

## Practica por tu cuenta {Alumnado}

Repite el ejercicio completo en **tus propios forks**, con la [guía del alumno](repo:training/01-gitops-flux-foundations/learner-guide.es.md): fork de los repositorios, configuración inicial, bootstrap de Flux, ejercicios y rollback.

```cards
Fork | [`cac-gitops-platform`](https://github.com/toniferr/cac-gitops-platform) y [`java-api-gitops`](https://github.com/toniferr/java-api-gitops) en tu cuenta, desmarcando «Copy the `main` branch only».
Rama | `training/01-gitops-flux-foundations` en ambos forks.
Entorno | [Preparación de WSL2/Ubuntu](repo:docs/es/01-preparacion-wsl-ubuntu.md) y clúster `kind`.
```

> [!DOCS]
> - [Kind: quick start](https://kind.sigs.k8s.io/docs/user/quick-start/)
> - [Recorrido post-bootstrap](repo:docs/es/reference/recorrido-post-bootstrap.md)
> - [Receta de troubleshooting](repo:docs/es/reference/chuleta-kubectl.md#receta-de-troubleshooting)
