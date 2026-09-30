# Formación 01 — Guía del alumno

[English guide](learner-guide.md)

## Qué practicarás

Desplegarás una API Java desde Git, cambiarás su número de réplicas declarado, crearás drift manual y comprobarás que Flux restaura el valor de Git.

## Distribución del workspace

Mantén los tres repositorios juntos:

```text
~/Workspace/
  gitops-training-lab/
  cac-gitops-platform/
  java-api-gitops/
```

Usa siempre tus propios forks de GitHub en cac-gitops-platform y java-api-gitops, nunca los repositorios canónicos directamente — un fork te da una copia en la que nadie más puede escribir, y a la que las acciones de nadie más pueden afectar. gitops-training-lab es solamente una guía didáctica que puedes clonar y revisarla.

## Haz fork de los repositorios

1. En GitHub, abre [`cac-gitops-platform`](https://github.com/toniferr/cac-gitops-platform) y [`java-api-gitops`](https://github.com/toniferr/java-api-gitops) (los repositorios canónicos) y pulsa **Fork** en cada uno, hacia tu propia cuenta.
2. Clónalos junto a este repositorio (gitops-training-lab), sustituyendo `<tu-usuario-github>` por tu cuenta:

```bash
cd ~/Workspace
git clone https://github.com/<tu-usuario-github>/cac-gitops-platform.git
git clone https://github.com/<tu-usuario-github>/java-api-gitops.git
```

Si tienes instalado [GitHub CLI](https://cli.github.com/), un solo comando por repo hace el fork y el clonado a la vez: `gh repo fork toniferr/cac-gitops-platform --clone=true` (y lo mismo con `java-api-gitops`).

3. En **cada** fork, cambia a branch `training/01-gitops-flux-foundations`. Es tu copia personal, así que confirma directamente ahí los cambios del ejercicio y reviértelos cuando quieras volver al punto inicial:

```bash
git switch training/01-gitops-flux-foundations
```

## Configuración inicial del fork

Haz esto una vez, antes de los ejercicios, para que tu clúster lea de tus forks y no de los originales:

1. En **tu fork** de `cac-gitops-platform`, edita `clusters/kind-dev/flux-system/apps-source.yaml` y cambia:
   - `spec.url` a la URL de tu propio fork: `https://github.com/<tu-usuario-github>/java-api-gitops.git`.
   - `spec.ref.branch` a `training/01-gitops-flux-foundations`. Si dejas `main`, Flux sigue leyendo la rama `main` de tu fork de `java-api-gitops` aunque tú confirmes los cambios del ejercicio en la rama de formación — tus commits no tendrían ningún efecto visible.

   Haz commit y push de ese cambio. Si te saltas por completo este paso, Flux sigue leyendo el `java-api-gitops` original de `toniferr` — tus cambios en tu propio fork no tendrían ningún efecto visible.
2. Construye la imagen de la API Java y cárgala en el clúster local. Kubernetes no la puede descargar de ningún registro — solo existe como imagen local en tu máquina, y `kind` necesita una copia dentro de sus propios nodos:

```bash
cd ~/Workspace/java-api-gitops
docker build -t gitops-lab/java-api:0.1.0 .
kind load docker-image gitops-lab/java-api:0.1.0 --name gitops-lab
```

3. Haz bootstrap de Flux contra **tu** fork de plataforma, sustituyendo `<tu-usuario-github>` por tu propia cuenta. Crea un [token personal *fine-grained*](https://github.com/settings/personal-access-tokens/new) limitado **solo a tu fork de `cac-gitops-platform`**, con caducidad corta (por ejemplo, 7 días) y los permisos `Administration: Read and write` + `Contents: Read and write`. `--private` hace que el bootstrap cree una *deploy key* en el repositorio, y sin `Administration` falla con `403 Resource not accessible by personal access token` justo al generar la clave. Un token clásico con scope `repo` también funciona, pero da acceso a **todos** tus repositorios: evítalo.

`read -rs` pide el token sin mostrarlo en pantalla ni guardarlo en el historial de la shell (pégalo y pulsa Enter); `unset` lo borra de la sesión al terminar:

```bash
read -rs GITHUB_TOKEN && export GITHUB_TOKEN
flux bootstrap github \
  --owner=<tu-usuario-github> \
  --repository=cac-gitops-platform \
  --branch=training/01-gitops-flux-foundations \
  --path=clusters/kind-dev \
  --personal \
  --private
unset GITHUB_TOKEN
```

Espera a que `flux get kustomizations -A` muestre todo `Ready`, y mira qué se acaba de crear con el [recorrido post-bootstrap](../../docs/es/reference/recorrido-post-bootstrap.md) antes de empezar los ejercicios de abajo.

## Ejercicios

1. Inspecciona `java-api-gitops/k8s/deployment.yaml`; identifica imagen, réplicas, [probes](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#container-probes) y límites de recursos.

   ```bash
   cd ~/Workspace/java-api-gitops
   cat k8s/deployment.yaml
   ```

   Localiza `spec.replicas` (cuántos Pods declara Git), `spec.template.spec.containers[0].image` (qué imagen debe correr), `readinessProbe`/`livenessProbe` (cómo decide Kubernetes si un Pod está listo para recibir tráfico o si hay que reiniciarlo) y `resources.requests`/`resources.limits` (memoria/CPU reservada y el tope máximo). Esto es puro estado deseado tal cual vive en Git — todavía no has tocado Flux ni el clúster, solo estás leyendo el fichero.

2. En la rama de formación de aplicación de tu fork, cambia `replicas` de `2` a `1`, haz commit y push.

   Edita `k8s/deployment.yaml` a mano (cambia `replicas: 2` por `replicas: 1`) y confirma el cambio:

   ```bash
   git switch training/01-gitops-flux-foundations   # si no estás ya en ella
   git add k8s/deployment.yaml
   git commit -m "scale java-api to 1 replica"
   git push
   ```

   Este push todavía no cambia nada en el clúster. Flux no reacciona a GitHub en tiempo real: solo se entera en su próxima reconciliación, según `spec.interval` del `GitRepository` (por defecto, cada minuto en este laboratorio).

3. Reconcilia Flux y verifica que el [Deployment](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/) pasa a `1/1`.

   ```bash
   flux reconcile source git java-api -n flux-system
   flux reconcile kustomization java-api -n flux-system --with-source
   kubectl get deployment/api-java-gitops -n java-api
   ```

   `reconcile source git` obliga a Flux a releer el repositorio ahora mismo en vez de esperar al intervalo. `reconcile kustomization --with-source` aplica contra el clúster lo que acaba de leer. En unos segundos deberías ver `READY 1/1`.

4. Escálalo manualmente a `3` e inspecciónalo inmediatamente.

   ```bash
   kubectl scale deployment/api-java-gitops -n java-api --replicas=3
   kubectl get deployment/api-java-gitops -n java-api
   ```

   Verás `3/3` durante unos segundos: Kubernetes obedece el comando al instante porque no sabe (ni le importa) que Git dice `1`. Esto es *drift* — el estado real del clúster ya no coincide con el estado deseado en Git.

5. Reconcilia Flux de nuevo y observa la vuelta a `1`.

   ```bash
   flux reconcile kustomization java-api -n flux-system --with-source
   kubectl get deployment/api-java-gitops -n java-api
   ```

   Flux vuelve a comparar Git contra el clúster, ve que `replicas` en Git sigue siendo `1`, y deshace tu escalado manual sin que nadie haya tocado `deployment.yaml` de nuevo. Esta es la corrección de drift — el núcleo de GitOps.

6. Revierte tu commit de Git y verifica que vuelve el estado original.

   ```bash
   git revert HEAD --no-edit
   git push
   flux reconcile source git java-api -n flux-system
   flux reconcile kustomization java-api -n flux-system --with-source
   kubectl get deployment/api-java-gitops -n java-api
   ```

   `git revert` crea un commit nuevo que deshace el anterior, en vez de borrar historial — la auditoría de qué pasó queda intacta. Tras reconciliar, el Deployment vuelve a `2/2`, el valor con el que empezaste.

Si algo falla, inspecciona estado antes de adivinar:

```bash
flux get sources git -A
flux get kustomizations -A
kubectl get events -n java-api --sort-by=.lastTimestamp
kubectl describe deployment/api-java-gitops -n java-api
```

## Qué sigue

Si algún comando de los anteriores te ha resultado poco familiar, es normal — profundiza con las [referencias de estudio](../../docs/es/00-ruta-aprendizaje.md#referencias-de-estudio) (conceptos de Kubernetes, arquitectura de Flux, chuleta de kubectl) antes o después de esta sesión. Consulta la [ruta de aprendizaje](../../docs/es/00-ruta-aprendizaje.md) para ver qué añaden las siguientes formaciones sobre esta.

## Rollback

Para dejar tu WSL limpio al terminar (o antes de repetir el ejercicio desde cero):

1. Elimina el clúster local. Esto se lleva por delante Flux, los namespaces `flux-system` y `java-api`, y todo lo que corría dentro, de una sola vez:

   ```bash
   kind delete cluster --name gitops-lab
   ```

2. `flux bootstrap` añadió una *deploy key* SSH a tu repositorio `cac-gitops-platform` en GitHub para que Flux pudiera leerlo. Borrar el clúster **no** la borra de GitHub — sigue ahí, con acceso de lectura permanente al repo, aunque ya no la use nada. Bórrala tú a mano: en GitHub, `Settings → Deploy keys` de `cac-gitops-platform`, busca la entrada que empieza por `flux-system-` y elimínala. Si creaste el token solo para esta formación, revócalo también en `Settings → Developer settings → Personal access tokens`.

3. (Opcional) Borra la imagen local de la API si no vas a repetir el ejercicio pronto:

   ```bash
   docker rmi gitops-lab/java-api:0.1.0
   ```

Lo que se queda tal cual, a propósito: tus clones de los tres repositorios, la rama `training/01-gitops-flux-foundations` con tus commits, y las herramientas instaladas (`docker`, `kind`, `flux`, `kubectl`, Java/Maven). Nada de eso forma parte del clúster, y lo necesitarás para la próxima formación.

## Qué implica tener este ecosistema en tu equipo

- **Consumo real de recursos.** El daemon de Docker corre en segundo plano de forma continua, incluso sin ningún clúster activo. Con el clúster arriba, sus dos nodos (cada uno un contenedor Docker con su propio `containerd`/kubelet anidado) más `etcd`, el `kube-apiserver` y los cuatro controladores de Flux pueden consumir varios GB de RAM y de disco (imágenes de nodo de `kind` + imágenes de los controladores). En equipos con poca RAM física esto es una fracción significativa de la máquina, no un detalle menor — lo viste de primera mano si tuviste que ajustar `.wslconfig` en la [guía de preparación](../../docs/es/01-preparacion-wsl-ubuntu.md).
- **El clúster es desechable por diseño.** No hay backups ni alta disponibilidad; nada sobrevive a un `kind delete cluster` salvo lo que ya está en Git, que es justo el punto de GitOps. Perfecto para aprender, pero no esperes que sobreviva a un reinicio del portátil o a una actualización de Docker sin querer.
- **Tráfico y credenciales reales, no simulados.** Mientras el clúster vive, Flux consulta GitHub cada `spec.interval` (aquí, cada minuto) usando la deploy key que creó. Es autenticación real contra un repositorio real, con una clave que queda activa hasta que la borres explícitamente — no expira sola.
