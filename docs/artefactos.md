# Informe editable

El informe local está en entrega/informe.docx. Se conserva junto con entrega/datos.json para su revisión y exportación a PDF; ambos se excluyen de Git por contener identificación personal.

Las capturas originales están en evidence/capturas/. El script scripts/build_word.py permite regenerar el informe con Python y python-docx 1.2.0. scripts/render_word.ps1 permite verificar su presentación con Word en Windows.

Ejecute npm run verify para repetir las pruebas y npm run delivery para comprobar la entrega sin generar archivos ZIP. No atribuya capturas anteriores a ejecuciones nuevas.
