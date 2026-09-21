# Ruta de aprendizaje

Este laboratorio es incremental por branch de github. Completa una rama de formación antes de avanzar; cada ejercicio posterior presupone el modelo operativo aprendido antes.

| Formación | Pregunta que responde |
| --- | --- |
| 01 — Fundamentos de [GitOps](https://opengitops.dev/) y [Flux](https://fluxcd.io/flux/) | ¿Cómo se convierte Git en el estado deseado del clúster? |
| 02 — Kubernetes para GitOps | ¿Qué objetos de Kubernetes gestiona realmente GitOps? |
| 03 — [Kustomize](https://kustomize.io/) y entornos | ¿Cómo varía una aplicación por entorno (dev/qa/prod) con seguridad? |
| 04 — Entrega de aplicaciones | ¿Cómo llega una imagen construida a [Kubernetes](https://kubernetes.io/docs/concepts/overview/) a través de Git, y en qué se diferencia de CI? |
| 05 — Platform GitOps | ¿Cómo gestionas la infraestructura de todo un clúster mediante Git, no solo una app? |
| 06 — Secretos y seguridad | ¿Cómo proteges valores ([SOPS](https://github.com/getsops/sops), [Sealed Secrets](https://sealed-secrets.netlify.app/)) y limitas cargas (RBAC) en un flujo GitOps? |
| 07 — Observabilidad y troubleshooting | Dado un despliegue roto, ¿dónde está roto realmente el pipeline GitOps? |
| 08 — Flux vs [Argo CD](https://argo-cd.readthedocs.io/en/stable/) | Mismo modelo GitOps, distinto controlador — ¿cuándo usar cada uno? |
| 09 — Enterprise GitOps | ¿Cómo es esto con CI/CD, pull requests, promoción y Azure/OpenShift? |
| 10 — Reto final (capstone) | ¿Puedes explicar cada flecha desde el commit hasta el Pod en ejecución? |

## Modelo mental

```text
Commit en Git → Flux lee estado deseado → La API de Kubernetes lo almacena
                                         → Sus controladores lo hacen real
```

El repositorio de Java describe la carga. El de plataforma selecciona esa carga para un clúster. Flux se ejecuta dentro del clúster y compara continuamente Git con la API de Kubernetes.

## Responsabilidades de repositorio

No edites una copia de un manifiesto en este repositorio didáctico esperando que el clúster cambie. Haz el cambio en el repositorio canónico que indique el ejercicio, confirma el cambio en la rama de formación, súbelo e inspecciona Flux. En los siguientes pasos del README ahondarás en el tema.

## Bucle seguro de aprendizaje

1. Comprueba el contexto activo con `kubectl config current-context`.
2. Haz un cambio declarativo pequeño en Git.
3. Confírmalo y súbelo.
4. Inspecciona `flux get sources git -A` y `flux get kustomizations -A`.
5. Inspecciona el recurso Kubernetes afectado.
6. Revierte mediante Git al terminar.

Todavía no necesitas nada de esto instalado para leer esta página: es el patrón que practicarás a partir de la Formación 01, una vez tengas las herramientas listas con [la guía de preparación](01-preparacion-wsl-ubuntu.md).

## Referencias de estudio

Son profundizaciones independientes, no pasos secuenciales — léelas cuando quieras más profundidad de la que da un ejercicio, sin importar en qué formación estés:

- [Recorrido por el clúster Kind](reference/recorrido-cluster-kind.md) — qué hay corriendo justo después de `kind create cluster`, antes de que existan Flux o la app: nodos, namespaces por defecto, y los Pods de `kube-system`.
- [Recorrido post-bootstrap](reference/recorrido-post-bootstrap.md) — la continuación: qué creó realmente `flux bootstrap` en `flux-system`, y cómo produjo el `Deployment`/`Service`/`ConfigMap` en `java-api`.
- [Conceptos de Kubernetes](reference/conceptos-kubernetes.md) — Pods, Deployments, Services, ConfigMaps, probes, límites de recursos y labels/selectores.
- [Arquitectura de Flux](reference/arquitectura-flux.md) — qué crea el bootstrap, los campos de `GitRepository`/`Kustomization`, y por qué funciona la corrección de drift.
- [Chuleta de kubectl](reference/chuleta-kubectl.md) — comandos organizados por tarea, con los nombres reales de este laboratorio.
