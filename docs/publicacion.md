# Selección para publicar

Repositorio previsto: https://github.com/mchiroyl/Validaci-n-de-una-API-con-Postman-y-OpenAPI

| Archivos | Decisión | Motivo |
| --- | --- | --- |
| src/, tests/, scripts/ | Publicar | Aplicación, verificaciones y preparación reproducible |
| package.json y package-lock.json | Publicar | Requisitos y versiones exactas; conservar también overrides documentados |
| openapi/ y postman/ | Publicar | Contrato, colección y ambiente sin valores runtime |
| README y docs/matriz.*, diseno, uso-ia, guion-video, artefactos, checklist, publicacion | Publicar | Reproducción, decisiones, alcance y declaración de apoyo |
| .github/workflows/, .gitignore, .gitattributes | Publicar | Automatización limitada y exclusiones |
| evidence/ informes sanitizados y capturas revisadas | Publicar | Resultados reales; no publicar cuerpos SETUP ni Authorization reales |
| .local/, node_modules/, .env*, tmp/, logs | Excluir | Sesiones, datos runtime, dependencias y temporales |
| entrega/ y DOCX de la raíz | Excluir de Git | Identificación y documento privado para Canvas; incluye ZIP y copia extraída |
| docs/plan.md y verificacion-enlaces.md | Excluir de Git | Plan interno y enlace de video de la entrega personal |
| Exportaciones crudas de Postman | Excluir | Pueden contener sesiones aunque una variable esté marcada como sensible |

La captura original de instalación muestra la auditoría histórica de 19 entradas. No debe presentarse como instalación posterior a los overrides. La auditoría posterior registra 7 entradas, no cero. La captura del aviso de importación no es evidencia de una filtración: el archivo revisado contiene el literal ficticio invalid-demo-session en TC08.

El README debe contener requisitos y versiones, instalación limpia, preparación y arranque, importación y ejecución completa de Postman, doce casos y conteos reales, fallo controlado y corrección, idempotencia por efecto final, alcance de validación de esquemas, límites, riesgos de dependencias y uso de IA. No debe afirmar publicación, Actions aprobado, acceso al video o revisión personal si todavía no se verificaron.

El proyecto se publica con sus limitaciones de seguridad documentadas. El workflow conserva el control de auditoría: los avisos pendientes impiden presentarlo como aprobado.
