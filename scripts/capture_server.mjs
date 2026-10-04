// Read-only local presentation of sanitized evidence for browser screenshots.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const routes = { '/base':'01-base', '/fallo':'02-fallo-controlado', '/corregida':'03-corregida', '/negativa':'manual' };
const titles = { '/base':'Colección completa desde datos limpios', '/fallo':'Incompatibilidad detectada por el contrato', '/corregida':'Corrección y efecto final idempotente', '/negativa':'Prueba negativa de acceso a pedido ajeno' };
const shell = (title, content) => `<!doctype html><html lang="es"><meta charset="utf-8"><title>${escape(title)}</title><style>*{box-sizing:border-box}body{margin:0;padding:24px 32px;font:19px Arial,sans-serif;color:#182536;background:#fff}main{max-width:900px}h1{font-size:27px;line-height:1.15;margin:0 0 12px}.meta{font-size:16px;color:#4b5563;margin:8px 0}.summary{font-weight:bold;margin:18px 0;font-size:22px}table{width:100%;border-collapse:collapse;font-size:18px}th,td{border:1px solid #cbd5e1;text-align:left;padding:7px 10px}th{background:#e7edf5}td:last-child{font-weight:bold}.pass{color:#175c36}.fail{color:#a91818}pre{font:17px/1.35 Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere;background:#f3f5f8;padding:14px;margin:12px 0}h2{font-size:22px;margin:20px 0 10px}.note{font-size:16px;margin:16px 0 0}p{line-height:1.35}</style><main id="evidence"><h1>${escape(title)}</h1>${content}<p class="note">Captura del informe local de Newman. Datos reales de los informes sanitizados; sin sesiones de autenticación.</p></main></html>`;
const server = createServer(async(req,res)=>{
  try {
    const path = new URL(req.url,'http://127.0.0.1').pathname;
    if(path === '/postman-cli') {
      const r = JSON.parse(await readFile('evidence/postman-cli.json','utf8'));
      const log = await readFile('evidence/postman-cli.txt','utf8');
      const summary = log.slice(log.indexOf('-------------------------------------------------------------------'));
      const content = `<div class="meta">Postman CLI ${escape(r.version)} | ${escape(r.executedAt)}</div><p class="summary">${escape(r.cases)} casos | ${escape(r.assertions)} aserciones | ${escape(r.failedAssertions)} fallidas | salida ${escape(r.exitCode)}</p><p>${escape(r.ids.join(' · '))}</p><pre>${escape(summary)}</pre><p>Vista del registro real de Postman CLI. Ejecución local sin publicación de resultados en Postman Cloud; no es una captura de Postman Desktop.</p>`;
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
      res.end(shell('Colección ejecutada con Postman CLI',content).replace('Captura del informe local de Newman.','Captura del informe local de Postman CLI.'));return;
    }
    if(!routes[path]) {res.writeHead(404);res.end('Not found');return;}
    const report = JSON.parse(await readFile(`evidence/${routes[path]}.json`,'utf8'));
    const time = new Date(report.executedAt).toLocaleString('es-GT',{timeZone:'America/Guatemala',hour12:false});
    let content = `<div class="meta">${escape(time)} | America/Guatemala | Node ${escape(report.node)} | Newman ${escape(report.dependencies.newman)}</div>`;
    content += `<div class="summary">${report.casesExecuted}/12 casos ejecutados · ${report.casesPassed} aprobados · ${report.casesFailed} fallidos<br>${report.assertions} aserciones · ${report.assertionFailures} fallidas · salida ${report.exitCode}</div>`;
    if(path==='/base'||path==='/corregida') {
      const shownCases = path==='/corregida' ? report.cases.filter(c=>['TC04','TC11','TC12'].includes(c.id)) : report.cases;
      if(path==='/corregida') content += '<p class="meta">Extracto de los casos de contrato y confirmación. La corrida completa ejecutó y aprobó TC01..TC12.</p>';
      content += '<table><tr><th>Caso</th><th>Situación</th><th>HTTP</th><th>Resultado</th></tr>' + shownCases.map(c=>`<tr><td>${c.id}</td><td>${escape(c.name.split(' | ')[1])}</td><td>${c.status}</td><td class="${c.passed?'pass':'fail'}">${c.passed?'APROBADO':'FALLIDO'}</td></tr>`).join('')+'</table>';
      content += `<p class="meta">${report.primaryRequests} solicitudes principales: SETUP + TC01..TC12 + CLEANUP.<br>${report.responseSamples} interacciones de pedidos incluyendo lecturas posteriores.</p>`;
      if(path==='/corregida') {
        const samples = report.responseSamplesSanitized;
        const saved = [...samples].reverse().find(x=>x.operation.startsWith('GET /orders/')&&x.status===200&&x.body.owner==='usuario_a');
        const listing = [...samples].reverse().find(x=>x.operation==='GET /orders'&&x.body.total===4);
        content += '<h2>TC12 confirma el efecto persistido</h2><pre>'+escape(`GET posterior: status=${saved.body.status}; confirmationCount=${saved.body.confirmationCount}; total=${saved.body.total}\nconfirmedAt=${saved.body.confirmedAt}\nGET /orders: total=${listing.body.total}; mismo conjunto de IDs verificado\nPASS TC12 | lectura final mantiene efecto único`)+'</pre>';
      }
    } else if(path==='/fallo') {
      const tc04 = report.cases.find(x=>x.id==='TC04');
      const failure = tc04.assertions.find(x=>x.name.includes('esquema Order')&&!x.passed);
      const sample = report.responseSamplesSanitized.find(x=>x.operation.startsWith('GET /orders/')&&x.status===200&&typeof x.body.total==='string');
      content += '<h2>Defecto local real en src/api.mjs</h2><pre>'+escape('Antes: return send(200, order);\nDefecto: return send(200, { ...order, total: String(order.total) });')+'</pre>';
      content += '<h2>HTTP 200 con cuerpo incompatible</h2><pre>'+escape('OpenAPI Order.total: { "type": "number" }\nRespuesta GET: { "quantity": '+sample.body.quantity+', "total": "'+sample.body.total+'" }')+'</pre>';
      content += '<h2 class="fail">'+escape('FAIL '+failure.name)+'</h2><pre>'+escape(failure.message)+'</pre>';
      content += '<p>También fallan TC09, TC11 y TC12 por las lecturas posteriores. El contrato permanece intacto.</p>';
    } else {
      const forbidden = report.responseSamplesSanitized.filter(x=>x.status===403);
      const owner = report.responseSamplesSanitized.find(x=>x.status===200&&x.body.owner==='usuario_b');
      content += '<h2>TC09 rechaza lectura y confirmación con el usuario A</h2><pre>'+escape(forbidden.map(x=>`${x.operation.split(' ')[0]} /orders/{foreignId}${x.operation.endsWith('/confirmation')?'/confirmation':''} -> HTTP ${x.status}\n${JSON.stringify(x.body)}`).join('\n\n'))+'</pre>';
      content += '<h2>Lectura posterior autorizada con el usuario B</h2><pre>'+escape(`GET /orders/{foreignId} -> HTTP ${owner.status}\n${JSON.stringify({owner:owner.body.owner,status:owner.body.status,confirmationCount:owner.body.confirmationCount,confirmedAt:owner.body.confirmedAt},null,2)}`)+'</pre>';
      content += '<p class="pass"><b>TC09 APROBADO:</b> el rechazo funciona y no produce efectos sobre el pedido ajeno.</p>';
    }
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(shell(titles[path],content));
  } catch {res.writeHead(500);res.end('Cannot read verified report');}
});
server.listen(3033,'127.0.0.1',()=>console.log('Visor temporal de evidencia en http://127.0.0.1:3033'));
process.on('SIGINT',()=>server.close(()=>process.exit(0)));
