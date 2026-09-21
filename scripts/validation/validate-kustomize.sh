#!/usr/bin/env sh
set -eu

PLATFORM_DIR="${1:-$HOME/Workspace/cac-gitops-platform}"
APP_DIR="${2:-$HOME/Workspace/java-api-gitops}"

kubectl kustomize "$PLATFORM_DIR/clusters/kind-dev" >/dev/null
kubectl kustomize "$APP_DIR/k8s" >/dev/null

printf 'Kustomize validation succeeded for platform and Java API.\n'
