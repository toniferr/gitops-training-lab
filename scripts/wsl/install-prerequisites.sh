#!/usr/bin/env sh
set -eu

if [ "$(ps -p 1 -o comm=)" != "systemd" ]; then
  echo "[error] systemd is not enabled for this WSL distribution; Docker Engine needs it."
  if [ -f /etc/wsl.conf ] && grep -q '^\[boot\]' /etc/wsl.conf; then
    echo "Add 'systemd=true' under the existing [boot] section in /etc/wsl.conf yourself, then continue below."
  else
    printf '[boot]\nsystemd=true\n' | sudo tee -a /etc/wsl.conf >/dev/null
    echo "Added systemd=true to /etc/wsl.conf."
  fi
  echo "From PowerShell: wsl --shutdown"
  echo "Then reopen this Ubuntu terminal and re-run this script."
  exit 1
fi

echo "This installs git, curl, Docker Engine, Java 21, Maven, kubectl, kind, and the"
echo "flux CLI, system-wide (needs sudo)."
echo

ARCH="$(dpkg --print-architecture)"

echo "[1/7] Updating apt package lists..."
sudo apt-get update -y

echo "[2/7] Installing git, curl, and base packages..."
sudo apt-get install -y git curl ca-certificates unzip gnupg

echo "[3/7] Installing Docker Engine..."
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=${ARCH} signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker "$USER"
sudo systemctl enable --now docker

echo "[4/7] Installing Java 21 and Maven..."
sudo apt-get install -y openjdk-21-jdk maven

echo "[5/7] Installing kubectl..."
KUBECTL_VERSION="$(curl -fsSL https://dl.k8s.io/release/stable.txt)"
curl -fsSL -o /tmp/kubectl "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/${ARCH}/kubectl"
sudo install -o root -g root -m 0755 /tmp/kubectl /usr/local/bin/kubectl
rm -f /tmp/kubectl

echo "[6/7] Installing kind..."
KIND_VERSION="$(curl -fsSL https://api.github.com/repos/kubernetes-sigs/kind/releases/latest | grep -m1 '"tag_name"' | cut -d '"' -f4)"
curl -fsSL -o /tmp/kind "https://kind.sigs.k8s.io/dl/${KIND_VERSION}/kind-linux-${ARCH}"
sudo install -o root -g root -m 0755 /tmp/kind /usr/local/bin/kind
rm -f /tmp/kind

echo "[7/7] Installing the flux CLI..."
curl -s https://fluxcd.io/install.sh | sudo bash

echo
echo "Done. Open a NEW terminal (so your user picks up the docker group), then verify"
echo "everything with:"
echo "  sh scripts/wsl/check-prerequisites.sh"
