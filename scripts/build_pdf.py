"""Create the brief Canvas PDF from actual reports, never from invented results."""
import json
from pathlib import Path
from datetime import datetime, timedelta
from xml.sax.saxutils import escape
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak

ROOT = Path(__file__).resolve().parent.parent
load = lambda p: json.loads((ROOT / p).read_text(encoding='utf-8'))
data = load('entrega/datos.json')
summary = load('evidence/resumen.json')
fixed = load('evidence/03-corregida.json')
broken = load('evidence/02-fallo-controlado.json')
out = ROOT / 'entrega/informe.pdf'
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='BodyES', fontName='Helvetica', fontSize=10, leading=14, spaceAfter=8, textColor=colors.HexColor('#26364a')))
styles.add(ParagraphStyle(name='SmallES', fontName='Helvetica', fontSize=8, leading=11, spaceAfter=5))
styles.add(ParagraphStyle(name='TitleES', fontName='Helvetica-Bold', fontSize=22, leading=26, textColor=colors.HexColor('#103b5c'), spaceAfter=12))
styles['Heading2'].textColor = colors.HexColor('#103b5c')
styles['Heading2'].fontSize = 13
styles['Heading2'].spaceBefore = 9
story = []
def p(text, style='BodyES'):
    story.append(Paragraph(text, styles[style]))
def heading(text):
    p(text, 'Heading2')
def field(name, key):
    value = data.get(key, '').strip()
    p(f'<b>{name}:</b> {escape(value) if value else "PENDIENTE DE COMPLETAR"}')
def link_field(name, key):
    value = data.get(key, '').strip()
    if value and value.startswith(('https://', 'http://')):
        p(f'<b>{name}:</b> <link href="{escape(value)}" color="#1769aa">{escape(value)}</link>')
    else:
        p(f'<b>{name}:</b> PENDIENTE - agregar un enlace real y comprobar acceso del docente.')

p('Validación de una API<br/>con Postman y OpenAPI', 'TitleES')
p('API local de pedidos | Trabajo individual | Evidencia ejecutada', 'BodyES')
for name, key in [('Estudiante', 'nombre'), ('Carné', 'carne')]:
    field(name, key)
if data.get('seccion','').strip():
    field('Sección','seccion')
link_field('Repositorio', 'repositorio')
link_field('Video (máximo 3 minutos)', 'video')
p('Acceso comprobado: repositorio público pero todavía vacío; el video solicitó iniciar sesión. Verificar publicación del código y permisos del docente antes de Canvas.', 'SmallES')
if not all(data.get(k, '').strip() for k in ['nombre','carne','repositorio','video']):
    p('<b>Estado de la entrega:</b> evidencia técnica completa; este PDF requiere identificación y enlaces reales antes de subirlo a Canvas.', 'SmallES')
heading('Aplicación y riesgos seleccionados')
p('La API lista pedidos propios con paginación, crea y consulta recursos protegidos y confirma un pedido mediante PUT. Dos usuarios sintéticos permiten comprobar permisos. Un CUADERNO cuesta Q25 y el servidor calcula el importe. Los riesgos evaluados son acceso ajeno, datos inválidos, pérdida del cambio, repetición con efectos duplicados e incompatibilidad del cuerpo de respuesta.')
heading('Ejecuciones reales y resultado')
dt = datetime.fromisoformat(summary['generatedAt'].replace('Z','+00:00')) - timedelta(hours=6)
p(f'Fecha local: {dt.strftime("%d/%m/%Y %H:%M:%S")} (America/Guatemala). Cada corrida contiene 12 casos TC01 a TC12, más SETUP y CLEANUP: 14 solicitudes principales y {fixed["responseSamples"]} interacciones de pedidos con lecturas auxiliares.', 'SmallES')
rows = [['Corrida','Casos','Aprobados','Fallidos','Aserciones\nfallidas','Salida'],
        ['Base','12','12','0','0','0'],
        ['Defecto local','12','8','4',str(summary['broken']['assertionFailures']),'1'],
        ['Corregida','12','12','0','0','0']]
table = Table(rows, colWidths=[105,45,66,55,82,45], hAlign='LEFT')
table.setStyle(TableStyle([
    ('BACKGROUND',(0,0),(-1,0),colors.HexColor('#103b5c')), ('TEXTCOLOR',(0,0),(-1,0),colors.white),
    ('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('FONTNAME',(0,1),(-1,-1),'Helvetica'),
    ('FONTSIZE',(0,0),(-1,-1),9),('LEADING',(0,0),(-1,-1),11),('VALIGN',(0,0),(-1,-1),'MIDDLE'),
    ('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8),
    ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#edf3f8'),colors.white]),
    ('GRID',(0,0),(-1,-1),0.35,colors.HexColor('#ccd7e2'))]))
story.append(table)
story.append(Spacer(1,10))
p(f'Cada corrida ejecutó {fixed["assertions"]} aserciones. Los informes TXT/JSON/HTML de evidence/ contienen el detalle por ID. Código 1 en la corrida defectuosa; el orquestador exige ese fallo para aceptar la demostración.', 'SmallES')
heading('Prueba negativa e idempotencia')
p('<b>TC09:</b> usuario A recibe 403 al leer o confirmar un pedido B; una lectura autorizada con B mantiene draft, contador 0 y fecha nula. <b>TC12:</b> repetir PUT deja el contador persistido en 1, misma fecha, Q50 y el mismo conjunto de cuatro pedidos propios. Se comprueba el efecto final mediante GET, no solo igualdad de respuestas.')
story.append(PageBreak())
p('Contrato, incompatibilidad y reproducción', 'TitleES')
heading('Defecto detectado y corrección')
p('El cambio local en src/api.mjs convierte total a texto únicamente en GET /orders/{id}. OpenAPI sigue exigiendo un número. TC04 falla en la aserción de esquema Order y en el valor esperado Q50. También fallan lecturas posteriores de TC09, TC11 y TC12. Restaurar la serialización numérica y ejecutar desde SETUP limpio produce 12/12 aprobados; no se debilita el contrato.')
tc04 = next(x for x in broken['cases'] if x['id']=='TC04')
err = next(x for x in tc04['assertions'] if 'esquema Order' in x['name'] and not x['passed'])
p('<b>Extracto real del fallo:</b> '+escape(err['name'])+'<br/>'+escape(err.get('message','')), 'SmallES')
p('<b>Contrato intacto (SHA-256):</b><br/>'+summary['contractSha256'][:32]+'<br/>'+summary['contractSha256'][32:], 'SmallES')
p('La huella es idéntica en base, fallo y corrección. La fuente corregida también coincide con la original. El parche y los informes se conservan en evidence/.', 'SmallES')
heading('Cobertura y alcance')
p('La matriz contiene doce situaciones distintas con ID, operación, riesgo, precondiciones, datos, resultado, aserciones y limpieza. Cubre paginación válida/inválida, creación y consulta posterior, cantidad inválida, campo obligatorio, credenciales ausentes/inválidas, recurso ajeno/inexistente, primera confirmación y repetición. Se verifican cuerpos de éxito y error.')
p('Postman verifica estados, estructura, reglas y efectos. Swagger Parser valida la estructura del documento OpenAPI 3.1. Ajv 2020 valida los cuerpos observados por operación y estado. <b>No es validación completa de OpenAPI</b>: no comprueba automáticamente todo parámetro, cabecera o petición posible. Tampoco se evalúan carga ni autenticación productiva.')
heading('Cómo reproducir')
p('<b>Requisitos verificados:</b> Node '+escape(fixed['node'])+', npm 11.17.0, Newman 6.2.2; colección v2.1.0 y OpenAPI 3.1.0. Instalar con <b>npm ci</b>. Para la demostración completa: <b>npm run verify</b>. Este comando prepara datos nuevos y ejecuta base, defecto y corrección; no necesita otro servidor abierto.', 'SmallES')
p('Para Collection Runner: <b>npm run prepare:data</b>, <b>npm start</b>; importar colección y ambiente de postman/, seleccionar el ambiente local, 1 iteración, las 14 solicitudes en orden y sin persistir variables. Los casos reales son TC01..TC12. SETUP emite sesiones locales aleatorias y CLEANUP elimina el pedido de la corrida y borra variables. README contiene instrucciones completas.', 'SmallES')
heading('Uso de IA y comprobaciones personales')
p('Codex apoyó diseño, código, contrato, matriz y scripts, y ejecutó las pruebas locales incluidas. Los datos de las pruebas son sintéticos, sin contraseñas. El estudiante proporcionó el enlace del video; no fue posible revisar su duración ni contenido porque pidió iniciar sesión. <b>Pendiente del estudiante:</b> comprender y repetir personalmente las pruebas, completar su declaración de revisión y comprobar acceso del docente a los enlaces. No se atribuyen revisiones personales no realizadas.', 'SmallES')
p('Archivos para el repositorio: src/, openapi/, postman/, docs/matriz.*, README y evidence/. PDF y ZIP local en entrega/. Los enlaces proporcionados deben permitir acceso al docente; su disponibilidad se registra por separado en docs/verificacion-enlaces.md.', 'SmallES')

def footer(canvas, doc):
    canvas.saveState()
    width, height = A4
    canvas.setStrokeColor(colors.HexColor('#ccd7e2'))
    canvas.line(40, 36, width-40, 36)
    canvas.setFont('Helvetica',8)
    canvas.setFillColor(colors.HexColor('#51657a'))
    canvas.drawString(40,24,'Validación API de pedidos | Evidencia local reproducible')
    canvas.drawRightString(width-40,24,str(doc.page))
    canvas.restoreState()

SimpleDocTemplate(str(out), pagesize=A4, rightMargin=42, leftMargin=42, topMargin=38, bottomMargin=48,
                  title='Validación de API con Postman y OpenAPI', author='Proyecto académico - apoyo de IA declarado').build(story,onFirstPage=footer,onLaterPages=footer)
print(out)
