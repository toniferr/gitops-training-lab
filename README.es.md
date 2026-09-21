# Laboratorio de formación GitOps

Material didáctico bilingüe para una introducción incremental y práctica a [Kubernetes](https://kubernetes.io/docs/concepts/overview/), Configuration as Code (CaC), [GitOps](https://opengitops.dev/) y [Flux](https://fluxcd.io/flux/). Está diseñado para Ubuntu o WSL2 y utiliza exclusivamente repositorios personales de GitHub.

[Read in English](README.md)

## Propósito y límites

Este repositorio es la guía didáctica: contiene explicaciones, guiones para quien imparte la formación, ejercicios para alumnado, scripts de validación, diagramas y diapositivas. De forma intencionada, **no** es la fuente operativa de verdad de ningún clúster.

Los repositorios canónicos, y que deberías hacer fork, son:

| Repositorio | Responsabilidad |
| --- | --- |
| [`cac-gitops-platform`](https://github.com/toniferr/cac-gitops-platform) | Bootstrap de Flux, puntos de entrada de clústeres, namespaces y referencias a aplicaciones. |
| [`java-api-gitops`](https://github.com/toniferr/java-api-gitops) | Código Spring Boot, definición de imagen y manifiestos Kubernetes de la API Java. |

## Empieza aquí

1. Lee [la ruta de aprendizaje](docs/es/00-ruta-aprendizaje.md).
2. Sobre tu WSL2/Ubuntu ya existente, instala las herramientas necesarias con [la guía de preparación](docs/es/01-preparacion-wsl-ubuntu.md).
3. Sigue la [formación 01 como formador](training/01-gitops-flux-foundations/instructor-runbook.es.md) o [como alumno](training/01-gitops-flux-foundations/learner-guide.es.md).
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
sh scripts/wsl/install-prerequisites.sh   # solo si falta algo en el paso anterior
kind create cluster --name gitops-lab --config setup/kind/gitops-lab-kind.yaml
kubectl config use-context kind-gitops-lab
```

Construye la API y deja su imagen local disponible para los nodos de Kind:

```bash
cd ../java-api-gitops
docker build -t gitops-lab/java-api:0.1.0 .
kind load docker-image gitops-lab/java-api:0.1.0 --name gitops-lab
```

Haz bootstrap de Flux desde el repositorio de **plataforma**. Usa tu token personal de GitHub solo en la shell; no lo confirmes nunca en Git. `<tu-usuario-github>` es un placeholder — si eres alumno, tiene que ser tu propia cuenta (tu fork), nunca `toniferr`; ejecutar esto con la cuenta de otra persona falla por permisos de push, y apuntar tu clúster al repositorio de otra persona por error es justo lo que el fork evita. Sustituye la rama si estás probando una rama de formación en lugar de `main`:

```bash
cd ../cac-gitops-platform
export GITHUB_TOKEN='tu-token-personal'
flux bootstrap github \
  --owner=<tu-usuario-github> \
  --repository=cac-gitops-platform \
  --branch=main \
  --path=clusters/kind-dev \
  --personal \
  --private
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
training/02-kustomize-environments
training/03-image-delivery
```

La rama de plataforma es la que observa Flux. La rama de aplicación es la versión de la app que consume esa plataforma. La rama de este repositorio documenta el ejercicio y el estado esperado.

### ¿Qué rama debo usar?

| Rol | Flujo de ramas |
| --- | --- |
| Alumno | Haz fork de los repositorios y usa la rama correspondiente `training/01-gitops-flux-foundations` en el fork. Es seguro confirmar experimentos ahí porque el fork es personal; usa `git revert` para volver al estado inicial. |
| Formador que prepara una sesión reproducible | Trabaja en la rama `training/*` correspondiente de los tres repositorios. Flux observa la rama de plataforma con ese mismo nombre. |
| Mantenedor del material | Mejora documentación común y compatible hacia atrás en `main`. Crea la siguiente rama `training/*` desde `main` actualizado. |

Para iniciar una formación desde el material más reciente:

```bash
git switch main
git pull --ff-only
git switch -c training/02-kustomize-environments
```

Cuando una sesión sea estable, etiqueta sus tres ramas de repositorio equivalentes, por ejemplo `training-01-v1.0.0`.

## Mapa de directorios

```text
docs/          Teoría común y preparación de equipo, en inglés y español.
docs/*/reference/  Profundizaciones de estudio independientes (Kubernetes, Flux, kubectl), para leer cuando quieras.
training/      Material de formador y alumnado por formación incremental.
references/    Explicaciones fichero a fichero de los repositorios canónicos.
scripts/       Ayudas POSIX de validación para WSL2 y Ubuntu.
setup/         Configuración de clúster local.
slides/        Diapositivas.
assets/        Diagramas y capturas utilizadas por el material.
```
