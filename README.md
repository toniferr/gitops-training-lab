# GitOps Training Lab

Bilingual teaching material for an incremental, hands-on introduction to [Kubernetes](https://kubernetes.io/docs/concepts/overview/), Configuration as Code (CaC), [GitOps](https://opengitops.dev/), and [Flux](https://fluxcd.io/flux/). It is designed for Ubuntu or WSL2 and uses personal GitHub repositories only.

[Leer en español](README.es.md)

## Purpose and boundaries

This repository is the teaching guide: it contains explanations, instructor runbooks, learner exercises, validation scripts, diagrams, and the training websites. It is deliberately **not** the operational source of truth for a cluster.

The canonical repositories are:

| Repository | Responsibility |
| --- | --- |
| [`cac-gitops-platform`](https://github.com/toniferr/cac-gitops-platform) | Flux bootstrap, cluster entry points, namespaces, and application references. |
| [`java-api-gitops`](https://github.com/toniferr/java-api-gitops) | Spring Boot source, image definition, and the Java API Kubernetes manifests. |

## Start here

1. Read [the learning path](docs/en/00-learning-path.md).
2. On your existing WSL2/Ubuntu setup, install the required tooling with [the setup guide](docs/en/01-wsl-ubuntu-setup.md).
3. Follow [Training 01 as an instructor](training/01-gitops-flux-foundations/instructor-runbook.md), or [as a learner](training/01-gitops-flux-foundations/learner-guide.md). The session is delivered with its [training website](https://toniferr.github.io/gitops-training-lab/).
4. Use the bilingual references to understand every relevant Kubernetes and Flux file.
5. Go deeper anytime with the [study references](docs/en/00-learning-path.md#study-references): Kubernetes concepts, Flux architecture, and a kubectl cheatsheet.

## Manual quick start

This is a manual verification path. Read and run one command at a time from WSL2 or Ubuntu; nothing in this repository starts a cluster automatically.

Keep the three repositories as sibling directories inside your WSL2/Ubuntu (not on a mounted Windows path like `/mnt/c/...`), starting by cloning this repository:

```bash
mkdir -p ~/Workspace && cd ~/Workspace
git clone https://github.com/toniferr/gitops-training-lab.git
cd gitops-training-lab
sh scripts/wsl/check-prerequisites.sh
sh scripts/wsl/install-prerequisites.sh   # only if something is missing above
kind create cluster --name gitops-lab --config setup/kind/gitops-lab-kind.yaml
kubectl config use-context kind-gitops-lab
```

Build the API and make its local image available to the Kind nodes:

```bash
cd ../java-api-gitops
docker build -t gitops-lab/java-api:0.1.0 .
kind load docker-image gitops-lab/java-api:0.1.0 --name gitops-lab
```

Bootstrap Flux from the **platform** repository. Use a *fine-grained* personal GitHub token, limited to your `cac-gitops-platform` fork and with a short expiry (the [learner guide](training/01-gitops-flux-foundations/learner-guide.md) lists the permissions). `read -rs` asks for it without echoing it or saving it in your shell history; never commit it. `<your-github-username>` is a placeholder — as a learner, this must be your own account (your fork), never `toniferr`; running this with someone else's account fails on push permissions, and pointing your cluster at someone else's repository by accident is exactly what forking avoids. Replace the branch if you are testing a training branch instead of `main`:

```bash
cd ../cac-gitops-platform
read -rs GITHUB_TOKEN && export GITHUB_TOKEN
flux bootstrap github \
  --owner=<your-github-username> \
  --repository=cac-gitops-platform \
  --branch=main \
  --path=clusters/kind-dev \
  --personal \
  --private
unset GITHUB_TOKEN
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
training/02-kubernetes-foundations
training/03-kustomize-environments
```

The platform branch is the branch Flux watches. The application branch is the version of the app consumed by that platform. This repository's branch documents the exact exercise and expected state.

### Which branch should I use?

| Role | Branch workflow |
| --- | --- |
| Learner | Fork the repositories and use the matching `training/01-gitops-flux-foundations` branch in the fork. It is safe to commit experiments there because the fork is personal; use `git revert` to return to the starting state. |
| Instructor preparing a repeatable session | Work in the matching `training/*` branch in all three repositories. Flux watches the platform branch with that same name. |

A finished edition is also tagged in the three repositories, for example `training-01-v1.0.0`.

## Training website

Each training is delivered with a static website instead of slides, published on GitHub Pages: [toniferr.github.io/gitops-training-lab](https://toniferr.github.io/gitops-training-lab/). The portal lists every published `training/*` branch, and each one lives on its own path (for example `/01-gitops-flux-foundations/`), frozen together with its branch. It has a presentation mode, an instructor mode with notes and a timer, and Spanish and English versions.

The session content is in each branch's `site/content/es.md` and `site/content/en.md`. See [site/README.md](site/README.md) to write it, preview it locally, and for the one-time GitHub Pages setup.

## Directory map

```text
docs/          Shared theory and workstation setup, in English and Spanish.
docs/*/reference/  Standalone study deep dives (Kubernetes, Flux, kubectl), read anytime.
training/      Instructor and learner material for each incremental training.
references/    File-by-file explanations of the canonical repositories.
scripts/       POSIX shell validation helpers for WSL2 and Ubuntu.
setup/         Local cluster configuration files.
site/          This branch's training website (GitHub Pages).
assets/        Diagrams and screenshots used by the material.
```
