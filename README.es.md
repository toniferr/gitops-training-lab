# Laboratorio de formación GitOps

Material didáctico bilingüe para una introducción práctica a [Kubernetes](https://kubernetes.io/docs/concepts/overview/), Configuration as Code (CaC), [GitOps](https://opengitops.dev/) y [Flux](https://fluxcd.io/flux/). Está diseñado para Ubuntu o WSL2 y utiliza exclusivamente repositorios personales de GitHub.

[Read in English](README.md)

## Propósito y límites

Este repositorio es la guía didáctica: contiene explicaciones, guiones para quien imparte la formación, ejercicios para alumnado, scripts de validación, diagramas y las webs de formación. De forma intencionada, **no** es la fuente operativa de verdad de ningún clúster.

Los repositorios canónicos, y que deberías hacer fork, son:

| Repositorio | Responsabilidad |
| --- | --- |
| [`cac-gitops-platform`](https://github.com/toniferr/cac-gitops-platform) | Bootstrap de Flux, puntos de entrada de clústeres, namespaces y referencias a aplicaciones. |
| [`java-api-gitops`](https://github.com/toniferr/java-api-gitops) | Código Spring Boot, definición de imagen y manifiestos Kubernetes de la API Java. |

## Empieza aquí

1. Lee [la ruta de aprendizaje](docs/es/00-ruta-aprendizaje.md).
2. Sobre tu WSL2/Ubuntu ya existente, instala las herramientas necesarias con [la guía de preparación](docs/es/01-preparacion-wsl-ubuntu.md).
3. Sigue la [formación 01](training/01-gitops-flux-foundations/learner-guide.es.md).
4. Utiliza las referencias bilingües para entender cada fichero relevante de Kubernetes y Flux.
5. Profundiza cuando quieras con las [referencias de estudio](docs/es/00-ruta-aprendizaje.md#referencias-de-estudio): conceptos de Kubernetes, arquitectura de Flux y una chuleta de kubectl.

## Inicio rápido manual

Este es un recorrido de verificación manual. Lee y ejecuta un comando cada vez desde WSL2 o Ubuntu; nada de este repositorio inicia un clúster automáticamente.

Mantén los tres repositorios como directorios hermanos dentro de tu WSL2/Ubuntu (no en una ruta de Windows montada como `/mnt/c/...`) y empieza clonando este repositorio:

```bash
mkdir -p ~/Workspace && cd ~/Workspace
git clone https://github.com/toniferr/gitops-training-lab.git
cd gitops-training-lab
sh scripts/wsl/check-prerequisites.sh
sh scripts/wsl/install-prerequisites.sh   # solo si el paso anterior indica que falta algo o que hay otra versión
kind create cluster --name gitops-lab --config setup/kind/gitops-lab-kind.yaml
kubectl config use-context kind-gitops-lab
```

Haz fork de [`cac-gitops-platform`](https://github.com/toniferr/cac-gitops-platform) y [`java-api-gitops`](https://github.com/toniferr/java-api-gitops) hacia tu cuenta, desmarcando **«Copy the `main` branch only»**. Después clona tus forks junto a este repositorio, en la rama de formación, y apunta la plataforma a tu fork de la aplicación. `<tu-usuario-github>` es un placeholder de tu propia cuenta:

```bash
cd ~/Workspace
git clone --branch training/01-gitops-flux-foundations git@github.com:<tu-usuario-github>/cac-gitops-platform.git
git clone --branch training/01-gitops-flux-foundations git@github.com:<tu-usuario-github>/java-api-gitops.git
cd cac-gitops-platform
sed -i 's|github.com/toniferr/java-api-gitops|github.com/<tu-usuario-github>/java-api-gitops|' clusters/kind-dev/flux-system/apps-source.yaml
git add clusters/kind-dev/flux-system/apps-source.yaml
git commit -m "point java-api source at my fork"
git push
```

Construye la API y deja su imagen local disponible para los nodos de Kind:

```bash
cd ~/Workspace/java-api-gitops
docker build -t gitops-lab/java-api:0.1.0 .
kind load docker-image gitops-lab/java-api:0.1.0 --name gitops-lab
```

Haz bootstrap de Flux desde el repositorio de **plataforma**. Usa un token personal de GitHub *fine-grained*, limitado a tu fork de `cac-gitops-platform` y con caducidad corta (la [guía del alumno](training/01-gitops-flux-foundations/learner-guide.es.md) detalla los permisos). `read -rs` lo pide sin mostrarlo ni guardarlo en el historial de la shell; no lo confirmes nunca en Git. Si eres alumno, `<tu-usuario-github>` tiene que ser tu propia cuenta (tu fork), nunca `toniferr`; ejecutar esto con la cuenta de otra persona falla por permisos de push, y apuntar tu clúster al repositorio de otra persona por error es justo lo que el fork evita:

```bash
cd ~/Workspace/cac-gitops-platform
read -rs GITHUB_TOKEN && export GITHUB_TOKEN
flux bootstrap github \
  --owner=<tu-usuario-github> \
  --repository=cac-gitops-platform \
  --branch=training/01-gitops-flux-foundations \
  --path=clusters/kind-dev \
  --personal \
  --private=false
unset GITHUB_TOKEN
git pull --ff-only   # trae los commits que subió el bootstrap
```

Verifica la reconciliación y llama a la API desde una segunda terminal:

```bash
flux get sources git -A
flux get kustomizations -A
kubectl get all -n java-api
kubectl port-forward -n java-api svc/java-api 8080:80
curl http://localhost:8080
```

La plataforma obtiene actualmente `java-api-gitops` como una fuente Flux separada. El clúster debe poder leerla: un repositorio público funciona directamente; uno privado necesita credenciales de lectura configuradas en su recurso `GitRepository`. Consulta la [referencia de plataforma](references/es/cac-gitops-platform.md) antes de cambiar esa configuración.

Elimina el clúster desechable al terminar:

```bash
kind delete cluster --name gitops-lab
```

## Ramas de formación

`main` contiene siempre el material común más reciente y estable. Una rama `training/*` es una edición conservada y reproducible de una formación. Cada formación usa el mismo nombre de rama en los tres repositorios:

```text
training/01-gitops-flux-foundations
```

La rama de plataforma es la que observa Flux. La rama de aplicación es la versión de la app que consume esa plataforma. La rama de este repositorio documenta el ejercicio y el estado esperado.

### ¿Qué rama debo usar?

Haz fork de los repositorios y usa la rama `training/01-gitops-flux-foundations` en tu fork. Es seguro confirmar experimentos ahí porque el fork es personal; usa `git revert` para volver al estado inicial.

Cada edición terminada se etiqueta además en los tres repositorios, por ejemplo `training-01-v1.0.0`.

## Mapa de directorios

```text
docs/          Teoría común y preparación de equipo, en inglés y español.
docs/*/reference/  Profundizaciones de estudio independientes (Kubernetes, Flux, kubectl), para leer cuando quieras.
training/      Material de formador y alumnado de cada formación.
references/    Explicaciones fichero a fichero de los repositorios canónicos.
scripts/       Ayudas POSIX de validación para WSL2 y Ubuntu.
setup/         Configuración de clúster local.
site/          Web de la formación de esta rama (GitHub Pages).
assets/        Diagramas y capturas utilizadas por el material.
```
