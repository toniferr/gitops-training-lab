# Preparación de herramientas

[Read in English](../en/01-wsl-ubuntu-setup.md)

Asumimos que ya tienes WSL2 + Ubuntu funcionando, y Git junto con tu cuenta de GitHub ya configurados (clave SSH incluida). Si algo de eso falta, resuélvelo antes de seguir — no se cubre aquí.

## Qué vas a tener al final

| Herramienta | Por qué se necesita |
| --- | --- |
| [Docker Engine](https://docs.docker.com/engine/install/ubuntu/) | Construye la imagen Java y ejecuta los nodos de Kind. Se instala dentro de Ubuntu, no como app de Windows. |
| [kubectl](https://kubernetes.io/docs/reference/kubectl/) | Consulta y modifica recursos Kubernetes. |
| [kind](https://kind.sigs.k8s.io/) | Crea el clúster Kubernetes local. |
| [flux](https://fluxcd.io/flux/) | Hace bootstrap e inspecciona Flux. |
| Java 21 y Maven | Construyen la API de ejemplo. |

## 1. Clona este repositorio

Todos los comandos de esta guía y de las formaciones se ejecutan desde dentro de este repositorio, y asumen que vive en tu **sistema de ficheros nativo de WSL2** (`~/Workspace/...`).

```bash
mkdir -p ~/Workspace && cd ~/Workspace
git clone https://github.com/toniferr/gitops-training-lab.git
cd gitops-training-lab
```

Este repositorio se clona directamente (no hace falta fork: es material de lectura, no algo que vayas a modificar). Los dos repositorios operativos, `cac-gitops-platform` y `java-api-gitops`, sí los harás fork y los clonarás como parte de la [formación 01](../../training/01-gitops-flux-foundations/learner-guide.es.md) — como hermanos de este directorio, dentro del mismo `~/Workspace`.

## 2. Comprobar qué falta

```bash
sh scripts/wsl/check-prerequisites.sh
```

No instala nada: informa de qué comandos existen y si el daemon de Docker responde. Es seguro repetirlo cuantas veces quieras.

## 3. Instalar lo que falta

```bash
sh scripts/wsl/install-prerequisites.sh
```

Instala Git, Docker Engine, Java 21, Maven, kubectl, kind y el CLI de flux mediante `apt` y la descarga oficial de cada proyecto — todo dentro de Ubuntu, sin ninguna aplicación de Windows. El detalle de cada instalación vive en el propio script (`scripts/wsl/install-prerequisites.sh`), no en esta guía. Pide la contraseña de `sudo`.

Si tu distribución no tiene `systemd` activado (necesario para que el daemon de Docker arranque solo), el script te lo dirá, ajustará `/etc/wsl.conf` por ti y te pedirá reiniciar WSL (`wsl --shutdown` desde PowerShell, y reabrir Ubuntu) antes de volver a ejecutarlo.

Abre una terminal nueva al terminar (para que tu usuario recoja el grupo `docker`), y repite el paso 2 para confirmar que ya no falta nada.

## 4. Crear el clúster local

```bash
kind create cluster --name gitops-lab --config setup/kind/gitops-lab-kind.yaml
kubectl config use-context kind-gitops-lab
kubectl get nodes
kubectl get namespaces
kubectl get pods -A
```

Antes de tocar Flux, échale un vistazo a lo que ya hay ahí — nodos, namespaces y pods de sistema que Kubernetes necesita para existir por sí mismo — con el [recorrido guiado por el clúster](reference/recorrido-cluster-kind.md).

El clúster es desechable. Elimínalo con `kind delete cluster --name gitops-lab` cuando termines.

## Solución de problemas

| Síntoma | Causa probable | Solución |
| --- | --- | --- |
| `docker info` falla o se cuelga | El daemon de Docker no está arrancado. | `sudo systemctl start docker` (o `sudo service docker start` si tu distribución no usa systemd). |
| `permission denied` al hablar con el socket de Docker | Tu usuario Linux no está en el grupo `docker`, o no has abierto una terminal nueva desde que se añadió. | `sudo usermod -aG docker $USER` y abre una terminal nueva. |
| El script se para pidiendo activar `systemd` | Docker Engine en WSL2 necesita `systemd` como PID 1 para gestionar el servicio. | Sigue la instrucción que imprime el script: `wsl --shutdown` desde PowerShell, reabre Ubuntu, y vuelve a ejecutar `install-prerequisites.sh`. |
| `kind create cluster` falla con errores de red o de contenedor | Docker no está realmente disponible, o ya existe un clúster `gitops-lab` a medio crear. | Repite la verificación de Docker; `kind delete cluster --name gitops-lab` y vuelve a crear. |
| `kind create cluster` falla en "Starting control-plane" (error de `kubeadm`), con un aviso de `cgroup v1 is deprecated` | Tu WSL2 usa cgroup v1; las imágenes de nodo de kind recientes necesitan cgroup v2. `sh scripts/wsl/check-prerequisites.sh` lo detecta. | Añade `kernelCommandLine = cgroup_no_v1=all` bajo `[wsl2]` en `%UserProfile%\.wslconfig` (Windows, no la terminal Ubuntu). Luego, desde PowerShell: `wsl --shutdown`, reabre Ubuntu, y comprueba con `cat /sys/fs/cgroup/cgroup.controllers` antes de reintentar. Cerrar y volver a abrir la ventana de Ubuntu **no** basta — hace falta el `wsl --shutdown`. |
| Las descargas con `curl` fallan o se quedan colgadas al ejecutar el script | Proxy o inspección SSL corporativa bloqueando la salida a internet. | Pregunta a TI por las variables `HTTP_PROXY`/`HTTPS_PROXY`/`NO_PROXY` o el certificado corporativo que hay que confiar; expórtalas antes de repetir el paso. |
| WSL va muy lento o se queda sin memoria | Sin límites, WSL2 puede usar toda la RAM disponible. | Crea `%UserProfile%\.wslconfig` en Windows con un límite, por ejemplo `[wsl2]\nmemory=8GB`, y ejecuta `wsl --shutdown` seguido de reabrir Ubuntu. |
| Todo se ve raro tras un cambio de red o VPN | WSL2 a veces no se recupera bien de una suspensión o de un cambio de red mientras el portátil dormía. | `wsl --shutdown` desde PowerShell y vuelve a abrir Ubuntu. |
| `kind create cluster` falla en "Starting control-plane" con `kubeadm`, y el log termina en `connect: connection refused` contra el puerto 6443 (sin ningún aviso de cgroup) | `kube-apiserver` nunca llegó a arrancar. En máquinas con poca RAM física, WSL2 usa por defecto el 50% del total, y eso puede no bastar para los dos nodos del clúster (etcd, apiserver, controller-manager, scheduler, kubelet y containerd anidado, duplicado en control-plane y worker). | Crea o edita `%UserProfile%\.wslconfig` en Windows añadiendo un límite explícito más generoso, por ejemplo `[wsl2]\nmemory=6GB` (deja al menos 1-2GB para Windows). Luego `wsl --shutdown` desde PowerShell, reabre Ubuntu, y reintenta `kind create cluster`. |
