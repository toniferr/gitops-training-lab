# GitOps Training Lab

Bilingual teaching material for a hands-on introduction to [Kubernetes](https://kubernetes.io/docs/concepts/overview/), Configuration as Code (CaC), [GitOps](https://opengitops.dev/), and [Flux](https://fluxcd.io/flux/). It is designed for Ubuntu or WSL2 and uses personal GitHub repositories only.

[Leer en español](README.es.md)

## Purpose and boundaries

This repository is the teaching guide: it contains explanations, instructor runbooks, learner exercises, validation scripts, diagrams, and the training websites. It is deliberately **not** the operational source of truth for a cluster.

The canonical repositories are:

| Repository | Responsibility |
| --- | --- |
| [`cac-gitops-platform`](https://github.com/toniferr/cac-gitops-platform) | Flux bootstrap, cluster entry points, namespaces, and application references. |
| [`java-api-gitops`](https://github.com/toniferr/java-api-gitops) | Spring Boot source, image definition, and the Java API Kubernetes manifests. |

## Start here

1. On your existing WSL2/Ubuntu setup, install the required tooling with [the setup guide](docs/en/01-wsl-ubuntu-setup.md).
2. Follow [Training 01](training/01-gitops-flux-foundations/learner-guide.md).
3. Use the bilingual references to understand every relevant Kubernetes and Flux file.
4. Go deeper anytime with the [study references](docs/en/00-learning-path.md#study-references): Kubernetes concepts, Flux architecture, and a kubectl cheatsheet.

## Manual quick start

This is a manual verification path. Read and run one command at a time from WSL2 or Ubuntu; nothing in this repository starts a cluster automatically.

Keep the three repositories as sibling directories inside your WSL2/Ubuntu (not on a mounted Windows path like `/mnt/c/...`), starting by cloning this repository:

```bash
mkdir -p ~/Workspace && cd ~/Workspace
git clone https://github.com/toniferr/gitops-training-lab.git
cd gitops-training-lab
sh scripts/wsl/check-prerequisites.sh
sh scripts/wsl/install-prerequisites.sh   # only if the step above reports a missing tool or a different version
kind create cluster --name gitops-lab --config setup/kind/gitops-lab-kind.yaml
kubectl config use-context kind-gitops-lab
```

Fork [`cac-gitops-platform`](https://github.com/toniferr/cac-gitops-platform) and [`java-api-gitops`](https://github.com/toniferr/java-api-gitops) into your account, unticking **"Copy the `main` branch only"**. Then clone your forks beside this repository, on the training branch, and point the platform at your application fork. `<your-github-username>` is a placeholder for your own account:

```bash
cd ~/Workspace
git clone --branch training/01-gitops-flux-foundations git@github.com:<your-github-username>/cac-gitops-platform.git
git clone --branch training/01-gitops-flux-foundations git@github.com:<your-github-username>/java-api-gitops.git
cd cac-gitops-platform
sed -i 's|github.com/toniferr/java-api-gitops|github.com/<your-github-username>/java-api-gitops|' clusters/kind-dev/flux-system/apps-source.yaml
git add clusters/kind-dev/flux-system/apps-source.yaml
git commit -m "point java-api source at my fork"
git push
```

Build the API and make its local image available to the Kind nodes:

```bash
cd ~/Workspace/java-api-gitops
docker build -t gitops-lab/java-api:0.1.0 .
kind load docker-image gitops-lab/java-api:0.1.0 --name gitops-lab
```

Bootstrap Flux from the **platform** repository. Use a *fine-grained* personal GitHub token, limited to your `cac-gitops-platform` fork and with a short expiry (the [learner guide](training/01-gitops-flux-foundations/learner-guide.md) lists the permissions). `read -rs` asks for it without echoing it or saving it in your shell history; never commit it. As a learner, `<your-github-username>` must be your own account (your fork), never `toniferr`; running this with someone else's account fails on push permissions, and pointing your cluster at someone else's repository by accident is exactly what forking avoids:

```bash
cd ~/Workspace/cac-gitops-platform
read -rs GITHUB_TOKEN && export GITHUB_TOKEN
flux bootstrap github \
  --owner=<your-github-username> \
  --repository=cac-gitops-platform \
  --branch=training/01-gitops-flux-foundations \
  --path=clusters/kind-dev \
  --personal \
  --private=false
unset GITHUB_TOKEN
git pull --ff-only   # brings back the commits bootstrap pushed
```

Verify reconciliation and call the API from a second terminal:

```bash
flux get sources git -A
flux get kustomizations -A
kubectl get all -n java-api
kubectl port-forward -n java-api svc/java-api 8080:80
curl http://localhost:8080
```

The platform currently fetches `java-api-gitops` as a separate Flux source. It must be readable by the cluster: a public repository works directly; a private repository needs read credentials configured in its `GitRepository` resource. See the [platform reference](references/en/cac-gitops-platform.md) before changing that setup.

Delete the disposable cluster when finished:

```bash
kind delete cluster --name gitops-lab
```

## Training branches

`main` always contains the newest stable shared material. A `training/*` branch is a preserved, reproducible edition of one training. Each training uses the same branch name across the three repositories:

```text
training/01-gitops-flux-foundations
```

The platform branch is the branch Flux watches. The application branch is the version of the app consumed by that platform. This repository's branch documents the exact exercise and expected state.

### Which branch should I use?

Fork the repositories and use the `training/01-gitops-flux-foundations` branch in your fork. It is safe to commit experiments there because the fork is personal; use `git revert` to return to the starting state.

A finished edition is also tagged in the three repositories, for example `training-01-v1.0.0`.

## Directory map

```text
docs/          Shared theory and workstation setup, in English and Spanish.
docs/*/reference/  Standalone study deep dives (Kubernetes, Flux, kubectl), read anytime.
training/      Instructor and learner material for each training.
references/    File-by-file explanations of the canonical repositories.
scripts/       POSIX shell validation helpers for WSL2 and Ubuntu.
setup/         Local cluster configuration files.
site/          This branch's training website (GitHub Pages).
assets/        Diagrams and screenshots used by the material.
```
