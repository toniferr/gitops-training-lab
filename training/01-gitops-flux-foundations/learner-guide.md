# Training 01 — Learner guide

[Guía en español](learner-guide.es.md)

## What you will practice

You will deploy a Java API from Git, change its declared replica count, create manual drift, and confirm that Flux restores the value from Git.

## Workspace layout

Keep the three repositories beside each other:

```text
~/Workspace/
  gitops-training-lab/
  cac-gitops-platform/
  java-api-gitops/
```

Use your own GitHub forks, never the canonical repositories directly — forking gives you a copy nobody else can push to, and that nobody else's actions can affect.

## Fork the repositories

1. On GitHub, open [`cac-gitops-platform`](https://github.com/toniferr/cac-gitops-platform) and [`java-api-gitops`](https://github.com/toniferr/java-api-gitops) (the canonical repositories) and click **Fork** on each, into your own account.
2. Clone them beside this repository, replacing `<your-github-username>` with your account:

```bash
cd ~/Workspace
git clone https://github.com/<your-github-username>/cac-gitops-platform.git
git clone https://github.com/<your-github-username>/java-api-gitops.git
```

If you have [GitHub CLI](https://cli.github.com/) installed, one command per repo does the fork and the clone together: `gh repo fork toniferr/cac-gitops-platform --clone=true` (and the same for `java-api-gitops`).

3. In **each** fork, check out `training/01-gitops-flux-foundations`. This is your personal copy, so commit the exercise changes directly to that branch; revert them when you want to return to the starting point:

```bash
git switch training/01-gitops-flux-foundations
```

## One-time fork setup

Do this once, before the exercises, so your cluster reads from *your* forks and not the originals:

1. In **your fork** of `cac-gitops-platform`, edit `clusters/kind-dev/flux-system/apps-source.yaml` and change:
   - `spec.url` to your own fork's URL: `https://github.com/<your-github-username>/java-api-gitops.git`.
   - `spec.ref.branch` to `training/01-gitops-flux-foundations`. Leave it on `main` and Flux keeps reading your fork's `main` branch even though you commit the exercise changes to the training branch — your commits would have no visible effect.

   Commit and push that change. Skip this step entirely and Flux keeps reading `toniferr`'s original `java-api-gitops` repository — your changes to your own fork would have no visible effect.
2. Build the Java API image and load it into the local cluster. Kubernetes can't pull it from any registry — it only exists as a local image on your machine, and `kind` needs a copy inside its own nodes:

```bash
cd ~/Workspace/java-api-gitops
docker build -t gitops-lab/java-api:0.1.0 .
kind load docker-image gitops-lab/java-api:0.1.0 --name gitops-lab
```

3. Bootstrap Flux against **your** platform fork, replacing `<your-github-username>` with your own account. Your [personal token](https://github.com/settings/tokens) needs permission to manage the repository's deploy keys (`--private` makes bootstrap create one): the full `repo` scope for a classic token, or `Administration: Read and write` + `Contents: Read and write` for a fine-grained one — without that it fails with `403 Resource not accessible by personal access token` right when generating the key:

```bash
export GITHUB_TOKEN='your-personal-token'
flux bootstrap github \
  --owner=<your-github-username> \
  --repository=cac-gitops-platform \
  --branch=training/01-gitops-flux-foundations \
  --path=clusters/kind-dev \
  --personal \
  --private
```

Wait for `flux get kustomizations -A` to show everything `Ready`, then look at what just got created with the [post-bootstrap tour](../../docs/en/reference/post-bootstrap-tour.md) before starting the exercises below.

## Exercises

1. Inspect `java-api-gitops/k8s/deployment.yaml`; identify the image, replicas, [probes](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#container-probes), and resource limits.

   ```bash
   cd ~/Workspace/java-api-gitops
   cat k8s/deployment.yaml
   ```

   Find `spec.replicas` (how many Pods Git declares), `spec.template.spec.containers[0].image` (which image should run), `readinessProbe`/`livenessProbe` (how Kubernetes decides a Pod is ready for traffic, or needs restarting), and `resources.requests`/`resources.limits` (reserved memory/CPU and the hard ceiling). This is pure desired state as it lives in Git — you haven't touched Flux or the cluster yet, just read the file.

2. In the application training branch in your fork, change `replicas` from `2` to `1`, commit, and push.

   Edit `k8s/deployment.yaml` by hand (change `replicas: 2` to `replicas: 1`) and commit it:

   ```bash
   git switch training/01-gitops-flux-foundations   # if not already on it
   git add k8s/deployment.yaml
   git commit -m "scale java-api to 1 replica"
   git push
   ```

   This push doesn't change anything in the cluster yet. Flux doesn't react to GitHub in real time — it only finds out at its next reconciliation, per the `GitRepository`'s `spec.interval` (every minute by default in this lab).

3. Reconcile Flux and verify that the [Deployment](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/) becomes `1/1`.

   ```bash
   flux reconcile source git java-api -n flux-system
   flux reconcile kustomization java-api -n flux-system --with-source
   kubectl get deployment/api-java-gitops -n java-api
   ```

   `reconcile source git` forces Flux to re-read the repository right now instead of waiting for the interval. `reconcile kustomization --with-source` applies what it just read against the cluster. Within a few seconds you should see `READY 1/1`.

4. Manually scale it to `3`; inspect it immediately.

   ```bash
   kubectl scale deployment/api-java-gitops -n java-api --replicas=3
   kubectl get deployment/api-java-gitops -n java-api
   ```

   You'll see `3/3` for a moment: Kubernetes obeys the command instantly because it doesn't know, or care, that Git says `1`. This is drift — the cluster's real state no longer matches the desired state in Git.

5. Reconcile Flux again and observe the return to `1`.

   ```bash
   flux reconcile kustomization java-api -n flux-system --with-source
   kubectl get deployment/api-java-gitops -n java-api
   ```

   Flux compares Git against the cluster again, sees `replicas` in Git is still `1`, and undoes your manual scale without anyone touching `deployment.yaml` again. This is drift correction — the core of GitOps.

6. Revert your Git commit and verify the original state returns.

   ```bash
   git revert HEAD --no-edit
   git push
   flux reconcile source git java-api -n flux-system
   flux reconcile kustomization java-api -n flux-system --with-source
   kubectl get deployment/api-java-gitops -n java-api
   ```

   `git revert` creates a new commit that undoes the previous one, instead of erasing history — the audit trail of what happened stays intact. After reconciling, the Deployment returns to `2/2`, the value you started with.

If something fails, inspect status before guessing:

```bash
flux get sources git -A
flux get kustomizations -A
kubectl get events -n java-api --sort-by=.lastTimestamp
kubectl describe deployment/api-java-gitops -n java-api
```

## What's next

If any of the commands above felt unfamiliar, that's expected — go deeper with the [study references](../../docs/en/00-learning-path.md#study-references) (Kubernetes concepts, Flux architecture, kubectl cheatsheet) before or after this session. Check the [learning path](../../docs/en/00-learning-path.md) for what the next trainings add on top of this one.

## Rollback

To leave your WSL clean when you're done (or before repeating the exercise from scratch):

1. Delete the local cluster. This takes Flux, the `flux-system` and `java-api` namespaces, and everything running inside them down in one shot:

   ```bash
   kind delete cluster --name gitops-lab
   ```

2. `flux bootstrap` added an SSH deploy key to your `cac-gitops-platform` repository on GitHub so Flux could read it. Deleting the cluster does **not** remove it from GitHub — it stays there, with permanent read access to the repo, even though nothing uses it anymore. Remove it by hand: on GitHub, `Settings → Deploy keys` for `cac-gitops-platform`, find the entry starting with `flux-system-` and delete it.

3. (Optional) Remove the local API image if you're not repeating the exercise soon:

   ```bash
   docker rmi gitops-lab/java-api:0.1.0
   ```

What stays as-is, on purpose: your clones of the three repositories, the `training/01-gitops-flux-foundations` branch with your commits, and the installed tools (`docker`, `kind`, `flux`, `kubectl`, Java/Maven). None of that is part of the cluster, and you'll need it for the next training.

## What running this ecosystem on your machine actually means

- **Real resource use.** The Docker daemon runs continuously in the background, even with no cluster active. With the cluster up, its two nodes (each a Docker container with its own nested `containerd`/kubelet) plus `etcd`, `kube-apiserver`, and Flux's four controllers can easily use several GB of RAM and disk (kind node images plus controller images). On hosts with limited physical RAM this is a meaningful fraction of the machine, not a footnote — you saw this firsthand if you had to adjust `.wslconfig` in the [setup guide](../../docs/en/01-wsl-ubuntu-setup.md).
- **The cluster is disposable by design.** There are no backups or high availability; nothing survives a `kind delete cluster` except what's already in Git, which is exactly GitOps's point. Great for learning, but don't expect it to survive a laptop reboot or an unplanned Docker update.
- **Real traffic and real credentials, not simulated.** While the cluster is alive, Flux polls GitHub every `spec.interval` (every minute, in this lab) using the deploy key it created. That's real authentication against a real repository, with a key that stays active until you explicitly delete it — it doesn't expire on its own.
