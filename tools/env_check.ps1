$paths = @('C:\Program Files\Google\Chrome\Application\chrome.exe','C:\Program Files (x86)\Google\Chrome\Application\chrome.exe','C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe','C:\Program Files\Microsoft\Edge\Application\msedge.exe')
foreach ($p in $paths) { if (Test-Path $p) { "BROWSER: $p" } }
"node_modules exists: " + (Test-Path 'c:\project\한글획순\node_modules')
"--- project files"
Get-ChildItem 'c:\project\한글획순' -Name | Select-Object -First 40
"--- fonts"
Get-ChildItem 'C:\Windows\Fonts' -Name | Where-Object { $_ -match 'batang|gungsu|gulim|malgun|HMKM|hy' } | Select-Object -First 30
