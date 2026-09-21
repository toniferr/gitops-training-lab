# Referencia: `java-api-gitops`

Repositorio canónico: `https://github.com/toniferr/java-api-gitops`.

## Aplicación e imagen

`src/` es una API HTTP [Spring Boot](https://docs.spring.io/spring-boot/index.html). `Dockerfile` usa una construcción multi-stage: Maven compila el JAR en la primera etapa; la segunda, solo con JRE, lo ejecuta como usuario no root `app` en el puerto 8080. Kubernetes nunca construye esta imagen: se construye antes y se carga en Kind o se publica en un registro.

## `k8s/kustomization.yaml`

Selecciona el namespace `java-api`, incluye [ConfigMap](https://kubernetes.io/docs/concepts/configuration/configmap/), [Deployment](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/) y [Service](https://kubernetes.io/docs/concepts/services-networking/service/), y declara la etiqueta de imagen `0.1.0`. [Kustomize](https://kustomize.io/) puede sustituir la etiqueta desde este fichero sin editar directamente el Deployment.

## `k8s/configmap.yaml`

`java-api-config` proporciona `APP_GREETING`. El Deployment lo importa con `envFrom`. Como se convierte en variable de entorno del proceso, actualizar el ConfigMap no reinicia automáticamente un Pod existente.

## `k8s/deployment.yaml`

`Deployment/api-java-gitops` declara dos réplicas deseadas. Su selector y etiquetas de Pod deben coincidir exactamente; el Service usa la misma etiqueta de nombre. `imagePullPolicy: IfNotPresent` permite usar la imagen precargada en Kind. [Readiness](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#container-probes) determina cuándo un Pod recibe tráfico; liveness reinicia un proceso no saludable. Las solicitudes reservan 100m CPU y 256Mi de memoria; los límites lo acotan a 500m y 512Mi.

## `k8s/service.yaml`

`Service/java-api` es `ClusterIP`: es accesible dentro del clúster en el puerto 80 y reenvía al puerto de contenedor llamado `http`, 8080. Usa `kubectl port-forward` para navegador local o curl; no queda expuesto externamente por defecto.

## Primer ejercicio

Cambia solo el valor de réplicas del Deployment. Es seguro, observable de inmediato y demuestra tanto un rollout dirigido por Git como la corrección de drift.
