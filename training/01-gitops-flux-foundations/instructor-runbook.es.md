# Formación 01 — Guion del formador

Duración: 25 minutos. Resultado: el alumnado distingue estado deseado de estado de ejecución y demuestra la reconciliación de Flux.

[English version](instructor-runbook.md)

## Antes de la sesión

Usa el mismo nombre de rama, `training/01-gitops-flux-foundations`, en `cac-gitops-platform` y `java-api-gitops`. El [`GitRepository`](https://fluxcd.io/flux/components/source/gitrepositories/) de plataforma debe referenciar el repositorio Java y esa rama. Haz bootstrap de Flux contra la rama de plataforma, nunca contra este repositorio didáctico.

Prepara la imagen local antes de compartir pantalla:

```bash
cd ~/Workspace/java-api-gitops
docker build -t gitops-lab/java-api:0.1.0 .
kind load docker-image gitops-lab/java-api:0.1.0 --name gitops-lab
```

Verifica todo esto antes de que llegue el alumnado:

```bash
kubectl config current-context
flux get sources git -A
flux get kustomizations -A
kubectl get all -n java-api
```

## Flujo sugerido

| Minutos | Explicar | Mostrar |
| ---: | --- | --- |
| 0–2 | Quiénes somos y la plataforma que operamos con GitOps y Flux. | La diapositiva de introducción. |
| 2–6 | Qué es un clúster (plano de control, nodos y Pods) y por qué Kubernetes reconcilia estado. | El diagrama del clúster. |
| 6–10 | La anatomía de un manifiesto: `spec` y `status`. Qué es GitOps. | Un manifiesto genérico y los principios de OpenGitOps. |
| 10–13 | Nuestro escenario: los cambios en edge deben ser repetibles y auditables. | Los dos repositorios y el diagrama completo. |
| 13–18 | Un cambio Git se convierte en estado de ejecución. | Commit de `replicas: 2` a `1`, push y reconciliación. |
| 18–21 | El drift no es estado deseado. | Escalado manual a `3`; Flux lo devuelve a `1`. |
| 21–25 | Rollback y límites. | `git revert` y dónde practicar. |

## Comandos en directo

Mantén un port-forward en una segunda terminal:

```bash
kubectl port-forward -n java-api svc/java-api 8080:80
curl http://localhost:8080
```

Después de subir el cambio de manifiesto de la app:

```bash
flux reconcile kustomization java-api -n flux-system --with-source
kubectl rollout status deployment/api-java-gitops -n java-api
```

Demostración de drift:

```bash
kubectl scale deployment/api-java-gitops -n java-api --replicas=3
flux reconcile kustomization java-api -n flux-system --with-source
kubectl get deployment/api-java-gitops -n java-api
```

No uses un cambio de ConfigMap como demostración visible: la app actual lo consume como variable de entorno, por lo que un Pod existente no se reinicia solo al cambiar el ConfigMap.
