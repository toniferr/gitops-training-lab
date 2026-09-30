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

# Versions this training edition was tested with. Override one to try another, e.g.:
#   KIND_VERSION=v0.34.0 sh scripts/wsl/install-prerequisites.sh
KUBECTL_VERSION="${KUBECTL_VERSION:-v1.37.1}"
KIND_VERSION="${KIND_VERSION:-v0.33.0}"
FLUX_VERSION="${FLUX_VERSION:-2.9.5}"   # same as the Flux components committed on the platform branch

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# verify <file> <expected-sha256>: stop before installing anything that doesn't match.
verify() {
  if ! echo "$2  $1" | sha256sum -c --quiet - >/dev/null 2>&1; then
    echo "[error] checksum verification failed for $(basename "$1"); nothing was installed from it."
    exit 1
  fi
}

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

echo "[5/7] Installing kubectl ${KUBECTL_VERSION}..."
KUBECTL_URL="https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/${ARCH}/kubectl"
curl -fsSL -o "$TMP/kubectl" "$KUBECTL_URL"
verify "$TMP/kubectl" "$(curl -fsSL "${KUBECTL_URL}.sha256")"
sudo install -o root -g root -m 0755 "$TMP/kubectl" /usr/local/bin/kubectl

echo "[6/7] Installing kind ${KIND_VERSION}..."
KIND_URL="https://github.com/kubernetes-sigs/kind/releases/download/${KIND_VERSION}/kind-linux-${ARCH}"
curl -fsSL -o "$TMP/kind" "$KIND_URL"
verify "$TMP/kind" "$(curl -fsSL "${KIND_URL}.sha256sum" | cut -d ' ' -f1)"
sudo install -o root -g root -m 0755 "$TMP/kind" /usr/local/bin/kind

echo "[7/7] Installing the flux CLI ${FLUX_VERSION}..."
FLUX_URL="https://github.com/fluxcd/flux2/releases/download/v${FLUX_VERSION}"
FLUX_TGZ="flux_${FLUX_VERSION}_linux_${ARCH}.tar.gz"
curl -fsSL -o "$TMP/$FLUX_TGZ" "$FLUX_URL/$FLUX_TGZ"
verify "$TMP/$FLUX_TGZ" "$(curl -fsSL "$FLUX_URL/flux_${FLUX_VERSION}_checksums.txt" | grep " ${FLUX_TGZ}\$" | cut -d ' ' -f1)"
tar -xzf "$TMP/$FLUX_TGZ" -C "$TMP" flux
sudo install -o root -g root -m 0755 "$TMP/flux" /usr/local/bin/flux

echo
echo "Done. Open a NEW terminal (so your user picks up the docker group), then verify"
echo "everything with:"
echo "  sh scripts/wsl/check-prerequisites.sh"
echo
echo "Note: members of the docker group can control the Docker daemon, which is"
echo "equivalent to root access on this machine. Keep that in mind on a shared machine."
