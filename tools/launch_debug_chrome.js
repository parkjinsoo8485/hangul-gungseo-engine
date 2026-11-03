const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const os = require('os');

const PORT = 9222;
const userDataDir = path.join(os.tmpdir(), 'chrome_non_headless_' + PORT);

const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

console.log('Spawning visible Chrome...');
const chrome = spawn(chromePath, [
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + userDataDir,
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1280,900',
    'http://localhost:8080/'
], {
    detached: true,
    stdio: 'ignore'
});
chrome.unref();

setTimeout(async () => {
    http.get('http://127.0.0.1:' + PORT + '/json/version', res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log('Chrome Debugger Connected successfully:');
            console.log(data);
            process.exit(0);
        });
    }).on('error', err => {
        console.error('Failed to connect:', err.message);
        process.exit(1);
    });
}, 2500);
