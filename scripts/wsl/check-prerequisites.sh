#!/usr/bin/env sh
set -eu

for tool in docker kubectl kind flux git java mvn; do
  if command -v "$tool" >/dev/null 2>&1; then
    printf '[ok]      %s -> %s\n' "$tool" "$(command -v "$tool")"
  else
    printf '[missing] %s\n' "$tool"
  fi
done

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
