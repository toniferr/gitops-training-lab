# Tooling setup

[Versión en español](../es/01-preparacion-wsl-ubuntu.md)

We assume you already have WSL2 + Ubuntu working, and Git plus your GitHub account already configured (SSH key included). If any of that is missing, sort it out before continuing — it isn't covered here.

## What you'll have at the end

| Tool | Why it is needed |
| --- | --- |
| [Docker Engine](https://docs.docker.com/engine/install/ubuntu/) | Builds the Java image and hosts Kind nodes. Installed inside Ubuntu itself, not as a Windows app. |
| [kubectl](https://kubernetes.io/docs/reference/kubectl/) | Queries and changes Kubernetes resources. |
| [kind](https://kind.sigs.k8s.io/) | Creates the local Kubernetes cluster. |
| [flux](https://fluxcd.io/flux/) | Bootstraps and inspects Flux. |
| Java 21 and Maven | Build the sample API. |

## 1. Clone this repository

Every command in this guide and in the trainings runs from inside this repository, and assumes it lives on your **native WSL2 filesystem** (`~/Workspace/...`), not on a mounted Windows path (`/mnt/c/...`): Docker and Kind are noticeably slower, and sometimes fail in odd ways, on a mounted Windows disk.

```bash
mkdir -p ~/Workspace && cd ~/Workspace
git clone https://github.com/toniferr/gitops-training-lab.git
cd gitops-training-lab
```

This repository is cloned directly (no fork needed: it's reading material, not something you'll change). The two operational repositories, `cac-gitops-platform` and `java-api-gitops`, are the ones you'll fork and clone as part of [Training 01](../../training/01-gitops-flux-foundations/learner-guide.md) — as siblings of this directory, inside the same `~/Workspace`.

## 2. Check what's missing

```bash
sh scripts/wsl/check-prerequisites.sh
```

Installs nothing: it reports which commands exist and whether the Docker daemon responds. Safe to run as many times as you like.

## 3. Install what's missing

```bash
sh scripts/wsl/install-prerequisites.sh
```

Installs Git, Docker Engine, Java 21, Maven, kubectl, kind, and the flux CLI via `apt` and each project's official download — entirely inside Ubuntu, no Windows application involved. The detail of each install lives in the script itself (`scripts/wsl/install-prerequisites.sh`), not in this guide. It asks for your `sudo` password.

If your distribution doesn't have `systemd` enabled (needed for the Docker daemon to start on its own), the script tells you, adjusts `/etc/wsl.conf` for you, and asks you to restart WSL (`wsl --shutdown` from PowerShell, then reopen Ubuntu) before running it again.

Open a new terminal when it's done (so your user picks up the `docker` group), then repeat step 2 to confirm nothing is missing anymore.

## 4. Create the local cluster

```bash
kind create cluster --name gitops-lab --config setup/kind/gitops-lab-kind.yaml
kubectl config use-context kind-gitops-lab
kubectl get nodes
kubectl get namespaces
kubectl get pods -A
```

Before touching Flux, take a look at what's already there — nodes, namespaces, and the system Pods Kubernetes needs just to exist — with the [guided cluster tour](reference/kind-cluster-tour.md).

The cluster is disposable. Delete it with `kind delete cluster --name gitops-lab` when you're done.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `docker info` fails or hangs | The Docker daemon isn't running. | `sudo systemctl start docker` (or `sudo service docker start` if your distribution doesn't use systemd). |
| `permission denied` talking to the Docker socket | Your Linux user isn't in the `docker` group, or you haven't opened a new terminal since it was added. | `sudo usermod -aG docker $USER`, then open a new terminal. |
| The script stops asking you to enable `systemd` | Docker Engine on WSL2 needs `systemd` as PID 1 to manage the service. | Follow what the script prints: `wsl --shutdown` from PowerShell, reopen Ubuntu, and re-run `install-prerequisites.sh`. |
| `kind create cluster` fails with network or container errors | Docker isn't actually available, or a `gitops-lab` cluster already exists half-created. | Re-check Docker; `kind delete cluster --name gitops-lab` and recreate. |
| `kind create cluster` fails at "Starting control-plane" (a `kubeadm` error), with a `cgroup v1 is deprecated` warning | Your WSL2 is using cgroup v1; recent kind node images need cgroup v2. `sh scripts/wsl/check-prerequisites.sh` catches this. | Add `kernelCommandLine = cgroup_no_v1=all` under `[wsl2]` in `%UserProfile%\.wslconfig` (Windows side, not the Ubuntu terminal). Then, from PowerShell: `wsl --shutdown`, reopen Ubuntu, and check `cat /sys/fs/cgroup/cgroup.controllers` before retrying. Closing and reopening the Ubuntu window is **not** enough — it needs the `wsl --shutdown`. |
| `curl` downloads fail or hang while running the script | Corporate proxy or SSL inspection blocking outbound access. | Ask IT for the `HTTP_PROXY`/`HTTPS_PROXY`/`NO_PROXY` variables or the corporate certificate to trust; export them before retrying the step. |
| WSL is very slow or runs out of memory | Unconstrained, WSL2 can use all available RAM. | Create `%UserProfile%\.wslconfig` on Windows with a limit, e.g. `[wsl2]\nmemory=8GB`, then `wsl --shutdown` and reopen Ubuntu. |
| Everything looks broken after a network change or sleep/VPN switch | WSL2 sometimes doesn't recover cleanly from sleep or a network change while the laptop was asleep. | `wsl --shutdown` from PowerShell, then reopen Ubuntu. |
| `kind create cluster` fails at "Starting control-plane" during `kubeadm`, and the log ends in `connect: connection refused` against port 6443 (no cgroup warning at all) | `kube-apiserver` never actually came up. On hosts with limited physical RAM, WSL2 defaults to 50% of it, which can be too tight for the cluster's two nodes (etcd, apiserver, controller-manager, scheduler, kubelet, and nested containerd, doubled across control-plane and worker). | Create or edit `%UserProfile%\.wslconfig` on Windows with a more generous explicit limit, e.g. `[wsl2]\nmemory=6GB` (leave at least 1-2GB for Windows). Then `wsl --shutdown` from PowerShell, reopen Ubuntu, and retry `kind create cluster`. |
