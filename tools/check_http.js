const http = require('http');
http.get('http://localhost:8080/index.html', res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('HTTP Status:', res.statusCode);
        console.log('Includes stemX_C?', data.includes('stemX_C'));
        console.log('Includes maxJungHRight?', data.includes('maxJungHRight'));
        console.log('char-input value:', data.match(/id="char-input"[^>]+/)?.[0]);
    });
});
