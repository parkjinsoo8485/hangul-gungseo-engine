const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.mp4': 'video/mp4',
    '.ttf': 'font/ttf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
    // CORS 헤더 추가 (수집기-엔진 간 실시간 통신 원활화)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        return res.end();
    }

    const cleanUrl = req.url.split('?')[0];

    // API: 서버 상태 확인
    if (cleanUrl === '/api/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ status: 'ok', server: 'Hangul Warehouse Server', port: PORT }));
    }

    // API: 부품 중심선 개별 저장
    if (req.method === 'POST' && cleanUrl === '/api/save_part') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const payload = JSON.parse(body);
                const id = payload.id;
                const partData = payload.data;
                const medians = payload.medians || (partData && partData.medians);
                const strokeWidths = payload.strokeWidths || (partData && partData.strokeWidths);

                if (!id || !medians) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'Missing id or medians' }));
                }

                const whPath = path.join(__dirname, 'hangul_150_parts_warehouse.json');
                const wh = JSON.parse(fs.readFileSync(whPath, 'utf8'));
                if (!wh.parts[id]) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: `Part not found: ${id}` }));
                }

                wh.parts[id].medians = medians;
                if (strokeWidths) wh.parts[id].strokeWidths = strokeWidths;
                if (partData && partData.strokes && partData.strokes.length > 0) {
                    wh.parts[id].strokes = partData.strokes;
                }
                wh.meta.lastUpdated = new Date().toISOString();

                // Final 파일과 기존 파일에 동시 기록 (Final 우선)
                const finalJsonPath = path.join(__dirname, 'hangul_150_parts_warehouse_final.json');
                const legacyJsonPath = path.join(__dirname, 'hangul_150_parts_warehouse.json');
                const jsonStr = JSON.stringify(wh, null, 2);

                fs.writeFileSync(finalJsonPath, jsonStr, 'utf8');
                fs.writeFileSync(legacyJsonPath, jsonStr, 'utf8');

                // JS 파일도 _final 및 기존 파일 동시 동기화
                const jsContent = 'window.HANGUL_150_WAREHOUSE = ' + jsonStr + ';\nif (typeof module !== "undefined") module.exports = window.HANGUL_150_WAREHOUSE;\n';
                fs.writeFileSync(path.join(__dirname, 'hangul_150_parts_warehouse_final.js'), jsContent, 'utf8');
                fs.writeFileSync(path.join(__dirname, 'hangul_150_parts_warehouse.js'), jsContent, 'utf8');

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    id,
                    savedFiles: ['hangul_150_parts_warehouse_final.json', 'hangul_150_parts_warehouse_final.js', 'hangul_150_parts_warehouse.json', 'hangul_150_parts_warehouse.js'],
                    message: `Successfully saved ${id} to Final warehouse files`
                }));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // API: 153개 부품 전체 일괄 디스크 저장
    if (req.method === 'POST' && cleanUrl === '/api/save_all') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const payload = JSON.parse(body);
                const warehouseData = payload.warehouse;
                if (!warehouseData || !warehouseData.parts) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'Missing warehouse data' }));
                }

                const jsonStr = JSON.stringify(warehouseData, null, 2);
                fs.writeFileSync(path.join(__dirname, 'hangul_150_parts_warehouse_final.json'), jsonStr, 'utf8');
                fs.writeFileSync(path.join(__dirname, 'hangul_150_parts_warehouse.json'), jsonStr, 'utf8');

                const jsContent = 'window.HANGUL_150_WAREHOUSE = ' + jsonStr + ';\nif (typeof module !== "undefined") module.exports = window.HANGUL_150_WAREHOUSE;\n';
                fs.writeFileSync(path.join(__dirname, 'hangul_150_parts_warehouse_final.js'), jsContent, 'utf8');
                fs.writeFileSync(path.join(__dirname, 'hangul_150_parts_warehouse.js'), jsContent, 'utf8');

                const count = Object.keys(warehouseData.parts).length;
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    count,
                    savedFiles: ['hangul_150_parts_warehouse_final.json', 'hangul_150_parts_warehouse_final.js'],
                    message: `Successfully saved all ${count} parts to Final files`
                }));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }
    let filePath = path.join(__dirname, cleanUrl === '/' ? 'index.html' : cleanUrl);

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            return res.end('404 Not Found');
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Access-Control-Allow-Origin': '*'
        });
        if (req.method === 'HEAD') {
            return res.end();
        }
        fs.createReadStream(filePath).pipe(res);
    });
});

server.listen(PORT, () => {
    console.log(`[Hangul Server] Local server running at http://localhost:${PORT}/`);
    console.log(`[Hangul Server] http://localhost:${PORT}/index.html`);
});
