# Local files and validation helpers

`setup/kind/gitops-lab-kind.yaml` creates one control-plane and one worker node. It maps Kind node port 30080 to workstation port 8080. The Java API does not use this mapping because it uses a ClusterIP Service; it is reserved for a later NodePort exercise.

`scripts/wsl/check-prerequisites.sh` does not install anything. It reports whether the required commands exist and whether the Docker daemon can be reached. This makes it safe to run repeatedly before a class.

`scripts/wsl/install-prerequisites.sh` does install: git, Docker Engine, Java 21, Maven, kubectl, kind, and the flux CLI, via `apt` and each project's official download — all inside Ubuntu (see [the setup guide](01-wsl-ubuntu-setup.md)). It asks for your `sudo` password, and if `systemd` is missing it tells you and stops so you can restart WSL before retrying.

`scripts/validation/validate-kustomize.sh` renders the Kind platform entry point and the Java application manifests with `kubectl kustomize`. It accepts optional absolute paths to the platform and app repositories. Run it from WSL before committing YAML changes:

```bash
sh scripts/validation/validate-kustomize.sh \
  ~/Workspace/cac-gitops-platform \
  ~/Workspace/java-api-gitops
```
