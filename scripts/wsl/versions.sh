# Versions this training edition was tested with, read by check-prerequisites.sh and
# install-prerequisites.sh. Override one to try another, e.g.:
#   KIND_VERSION=v0.34.0 sh scripts/wsl/install-prerequisites.sh
KUBECTL_VERSION="${KUBECTL_VERSION:-v1.37.1}"
KIND_VERSION="${KIND_VERSION:-v0.33.0}"
FLUX_VERSION="${FLUX_VERSION:-2.9.5}"   # same as the Flux components committed on the platform branch
