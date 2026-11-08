param([int]$Port = 8765, [switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$root = Join-Path $PSScriptRoot 'dist'
$allowed = @{'/'='index.html'; '/index.html'='index.html'; '/style.css'='style.css'; '/app.js'='app.js'; '/storage.js'='storage.js'; '/sw.js'='sw.js'}
$mime = @{'.html'='text/html; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.js'='text/javascript; charset=utf-8'}
$listener = $null
for ($attempt=0; $attempt -lt 20; $attempt++) {
    try {
        $listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, ($Port + $attempt))
        $listener.Start()
        $Port += $attempt
        break
    } catch { if ($listener) { $listener.Stop() }; $listener = $null }
}
if (-not $listener) { Write-Host 'No free local port. Close another FAZ launcher and try again.'; exit 1 }
$url = "http://localhost:$Port/"
Write-Host ''
Write-Host '  FAZ TRADING COMMUNITY' -ForegroundColor Yellow
Write-Host '  Your offline Pine Script library'
Write-Host "  Open in Edge or Chrome: $url" -ForegroundColor Green
Write-Host '  Keep this window open. Close it when you finish.'
Write-Host '  No internet connection or administrator rights needed.'
Write-Host ''
if (-not $NoBrowser) {
    $edgePaths = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe", "$env:LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe")
    $edge = $edgePaths | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    try { if ($edge) { Start-Process -FilePath $edge -ArgumentList $url -WindowStyle Hidden } else { Start-Process $url -WindowStyle Hidden } } catch { Write-Host "Open Edge or Chrome and paste: $url" }
}
try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        try {
            $client.ReceiveTimeout = 2500
            $stream = $client.GetStream()
            $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
            $request = $reader.ReadLine()
            if (-not $request) { continue }
            $hostHeader = ''; $headerBytes = 0
            while ($line = $reader.ReadLine()) {
                $headerBytes += $line.Length
                if ($headerBytes -gt 16384) { throw 'Request too large' }
                if ($line -match '^Host:\s*(.+)$') { $hostHeader = $Matches[1] }
            }
            $parts = $request.Split(' ')
            $path = $parts[1].Split('?')[0]
            $status = '200 OK'; $type = 'text/plain; charset=utf-8'; $body = [System.Text.Encoding]::UTF8.GetBytes('Not found')
            if ($hostHeader -ne "localhost:$Port" -and $hostHeader -ne "127.0.0.1:$Port") { $status='403 Forbidden' }
            elseif ($parts[0] -ne 'GET' -and $parts[0] -ne 'HEAD') { $status='405 Method Not Allowed' }
            elseif (-not $allowed.ContainsKey($path)) { $status='404 Not Found' }
            else {
                $file = Join-Path $root $allowed[$path]
                $body = [System.IO.File]::ReadAllBytes($file)
                $type = $mime[[System.IO.Path]::GetExtension($file)]
            }
            $headers = "HTTP/1.1 $status`r`nContent-Type: $type`r`nContent-Length: $($body.Length)`r`nConnection: close`r`nCache-Control: no-store`r`nX-Content-Type-Options: nosniff`r`nContent-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`r`n`r`n"
            $bytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
            $stream.Write($bytes,0,$bytes.Length)
            if ($parts[0] -ne 'HEAD') { $stream.Write($body,0,$body.Length) }
            $stream.Flush()
        } catch { } finally { $client.Close() }
    }
} finally { $listener.Stop() }
