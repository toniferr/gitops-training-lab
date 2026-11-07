#!/usr/bin/env sh
set -eu

. "$(dirname "$0")/versions.sh"

for tool in docker kubectl kind flux git java mvn; do
  if command -v "$tool" >/dev/null 2>&1; then
    printf '[ok]      %s -> %s\n' "$tool" "$(command -v "$tool")"
  else
    printf '[missing] %s\n' "$tool"
  fi
done

# check_version <tool> <installed> <tested>
check_version() {
  if [ "$2" = "$3" ]; then
    printf '[ok]      %s version %s\n' "$1" "$2"
  else
    printf '[warning] %s version is %s, but this training was tested with %s\n' "$1" "${2:-unknown}" "$3"
    printf '          To install the tested version: sh scripts/wsl/install-prerequisites.sh\n'
  fi
}

if command -v kubectl >/dev/null 2>&1; then
  check_version kubectl "$(kubectl version --client 2>/dev/null | awk '/Client Version/ {print $3}')" "$KUBECTL_VERSION"
fi
if command -v kind >/dev/null 2>&1; then
  check_version kind "$(kind version 2>/dev/null | awk '{print $2}')" "$KIND_VERSION"
fi
if command -v flux >/dev/null 2>&1; then
  check_version flux "$(flux --version 2>/dev/null | awk '{print $3}')" "$FLUX_VERSION"
fi

if command -v docker >/dev/null 2>&1; then
  if docker info >/dev/null 2>&1; then
    printf '[ok]      Docker daemon reachable\n'
  else
    printf '[warning] Docker exists but its daemon is unreachable\n'
    printf '          Start it: sudo systemctl start docker (or: sudo service docker start)\n'
  fi
fi

if [ -r /sys/fs/cgroup/cgroup.controllers ]; then
  printf '[ok]      cgroup v2 unified hierarchy\n'
else
  printf '[warning] cgroup v1 (or hybrid) detected -- kind cannot start kubeadm on this\n'
  printf '          Add this to .wslconfig in your Windows user profile folder:\n'
  printf '            [wsl2]\n'
  printf '            kernelCommandLine = cgroup_no_v1=all\n'
  printf '          Then, from PowerShell: wsl --shutdown, reopen Ubuntu, and re-run this check.\n'
fi
