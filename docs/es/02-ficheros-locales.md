# Ficheros locales y ayudas de validación

`setup/kind/gitops-lab-kind.yaml` crea un nodo control-plane y un nodo worker. Mapea el puerto 30080 del nodo Kind al puerto 30080 de la estación, ligado a `127.0.0.1` para que solo sea accesible desde tu máquina, no desde tu red. La API Java no usa ese mapeo porque emplea un Service ClusterIP; solo está ahí por si pruebas un Service NodePort. El puerto 8080 queda libre para `kubectl port-forward`.

`scripts/wsl/check-prerequisites.sh` no instala nada. Informa de si existen los comandos necesarios, avisa si kubectl, kind o flux no coinciden con las versiones con las que se probó esta formación (están en `scripts/wsl/versions.sh`) y comprueba si se alcanza el daemon Docker. Por eso es seguro ejecutarlo repetidamente antes de una clase.

`scripts/wsl/install-prerequisites.sh` sí instala: git, Docker Engine, Java 21, Maven, kubectl, kind y el CLI de flux, vía `apt` y la descarga oficial de cada proyecto — todo dentro de Ubuntu (ver [la guía de preparación](01-preparacion-wsl-ubuntu.md)). Pide contraseña de `sudo`, y si falta `systemd` te lo dice y se detiene para que reinicies WSL antes de reintentar.

`scripts/validation/validate-kustomize.sh` renderiza el punto de entrada Kind de plataforma y los manifiestos Java con `kubectl kustomize`. Acepta rutas absolutas opcionales a los repositorios de plataforma y aplicación. Ejecútalo desde WSL antes de confirmar cambios YAML:

```bash
sh scripts/validation/validate-kustomize.sh \
  ~/Workspace/cac-gitops-platform \
  ~/Workspace/java-api-gitops
```
