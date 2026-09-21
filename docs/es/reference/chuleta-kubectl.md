# Chuleta de [kubectl](https://kubernetes.io/docs/reference/kubectl/) (referencia)

[Read in English](../../en/reference/kubectl-cheatsheet.md)

Organizada por tarea, no alfabéticamente. Los comandos usan los nombres reales de este laboratorio (namespace `java-api`, Deployment `api-java-gitops`) para que puedas ejecutarlos tal cual contra el clúster Kind. Todos los comandos de esta página aparecen también en el [runbook de instructor](../../training/01-gitops-flux-foundations/instructor-runbook.es.md) o en la [guía de alumno](../../training/01-gitops-flux-foundations/learner-guide.es.md) de la Formación 01; esta página es el índice hacia ellos.

## Contexto y clúster

```bash
kubectl config current-context
kubectl config use-context kind-gitops-lab
kubectl config get-contexts
kubectl get nodes
```

Comprueba siempre el contexto antes de ejecutar algo destructivo — un contexto equivocado significa que apuntas al clúster incorrecto.

## Inspeccionar objetos

```bash
kubectl get all -n java-api
kubectl get deployment/api-java-gitops -n java-api -o wide
kubectl get pods -n java-api --show-labels
kubectl describe deployment/api-java-gitops -n java-api
kubectl explain deployment.spec.strategy
```

`describe` es casi siempre lo primero que hay que ejecutar cuando algo no funciona — incluye los Events recientes de ese objeto. `explain` imprime la documentación del campo directamente desde el esquema de la API; úsalo cuando un campo del YAML no te resulte familiar.

## Events y logs

```bash
kubectl get events -n java-api --sort-by=.lastTimestamp
kubectl logs deployment/api-java-gitops -n java-api
kubectl logs deployment/api-java-gitops -n java-api -f       # seguir en vivo
kubectl logs deployment/api-java-gitops -n java-api --previous  # último crash
```

## Exec y port-forward

```bash
kubectl exec -it deployment/api-java-gitops -n java-api -- sh
kubectl port-forward -n java-api svc/java-api 8080:80
```

`port-forward` bloquea la terminal — ejecútalo en una segunda terminal, como hace el runbook de la Formación 01, y haz `curl http://localhost:8080` desde la primera.

## Aplicar y comparar (declarativo)

```bash
kubectl apply -k java-api-gitops/k8s
kubectl kustomize java-api-gitops/k8s
kubectl diff -k java-api-gitops/k8s
```

En este laboratorio nunca ejecutas `apply` a mano contra `java-api` — lo hace el `kustomize-controller` de Flux. Estos comandos sirven para *validar* lo que Flux aplicaría, justo lo que `scripts/validation/validate-kustomize.sh` automatiza con `kubectl kustomize`.

## Rollouts

```bash
kubectl rollout status deployment/api-java-gitops -n java-api
kubectl rollout history deployment/api-java-gitops -n java-api
kubectl rollout undo deployment/api-java-gitops -n java-api
```

No uses `rollout undo` en este laboratorio para corregir un error — cambia el estado del clúster sin cambiar Git, así que Flux lo reconciliará de vuelta. Revierte en Git en su lugar (`git revert`) y deja que Flux aplique el estado revertido.

## Scale manual (solo para la demo de drift)

```bash
kubectl scale deployment/api-java-gitops -n java-api --replicas=3
kubectl get deployment/api-java-gitops -n java-api
```

Esta es, a propósito, la forma "incorrecta" de cambiar el número de réplicas en un entorno GitOps — es la demo de lo que corrige Flux.

## Receta de troubleshooting

Cuando algo no se vea bien, comprueba en este orden — cada paso suele explicar el siguiente:

1. `flux get sources git -A` — ¿está reconciliando siquiera el origen Git?
2. `flux get kustomizations -A` — ¿se está aplicando y está sana la Kustomization?
3. `kubectl get events -n java-api --sort-by=.lastTimestamp` — ¿qué intentó hacer realmente Kubernetes?
4. `kubectl describe deployment/api-java-gitops -n java-api` — detalle a nivel de objeto y sus propios Events.
5. `kubectl logs …` — solo una vez que el Pod existe y está en ejecución; los logs no explican un Pod que nunca llegó a programarse.

## Flags de salida útiles

| Flag | Efecto |
| --- | --- |
| `-o wide` | Más columnas (nodo, IP) sin el YAML completo. |
| `-o yaml` / `-o json` | Objeto completo, útil para encadenar con `grep` o `jq`. |
| `-w` | Observa cambios en vez de una foto puntual. |
| `--sort-by=.lastTimestamp` | Orden cronológico para `events`. |
| `-A` | Todos los namespaces (funciona con `kubectl get` y con cualquier `flux get`). |
