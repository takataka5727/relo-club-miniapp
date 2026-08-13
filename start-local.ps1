$ErrorActionPreference = "Stop"
$projectDirectory = $PSScriptRoot
Set-Location -LiteralPath $projectDirectory

if (Get-Command node -ErrorAction SilentlyContinue) {
  node .\server.js
  exit
}

if (Get-Command py -ErrorAction SilentlyContinue) {
  Write-Host "富士フイルム版 PC確認用URL: http://localhost:5174"
  py -m http.server 5174 --bind 0.0.0.0
  exit
}

throw "Node.jsまたはPythonが見つかりません。"
