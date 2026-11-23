$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot
$dbUsername = 'breadle'

foreach ($tool in @('git', 'docker', 'java', 'node', 'npm')) {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
        throw "Ferramenta obrigatoria nao encontrada: $tool. Instale-a e execute este script novamente."
    }
}

docker info *> $null
if ($LASTEXITCODE -ne 0) {
    throw 'O Docker Desktop nao esta iniciado. Abra-o, aguarde ficar pronto e tente novamente.'
}

$javaVersionOutput = (& java -version 2>&1 | Out-String)
$javaVersionMatch = [regex]::Match($javaVersionOutput, 'version "(?<major>\d+)')
if (-not $javaVersionMatch.Success -or [int]$javaVersionMatch.Groups['major'].Value -lt 25) {
    throw 'Este projeto requer JDK 25 ou superior. Instale o JDK 25, ajuste JAVA_HOME/PATH e execute novamente.'
}

$localSecretsPath = Join-Path $projectRoot 'backend\local-secrets.properties'
if (-not (Test-Path $localSecretsPath)) {
    $jwtSecretBytes = New-Object byte[] 48
    $random = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $random.GetBytes($jwtSecretBytes)
    }
    finally {
        $random.Dispose()
    }

    $jwtSecret = [Convert]::ToBase64String($jwtSecretBytes)
    $utf8WithoutBom = New-Object -TypeName System.Text.UTF8Encoding -ArgumentList $false
    [System.IO.File]::WriteAllText($localSecretsPath, "jwt.secret=$jwtSecret`n", $utf8WithoutBom)
    Write-Output 'Segredo local de autenticação criado em backend\local-secrets.properties.'
}
else {
    Write-Output 'Segredo local de autenticação existente preservado.'
}

$envPath = Join-Path $projectRoot '.env'
if (Test-Path $envPath) {
    $usernameLine = Get-Content $envPath | Where-Object { $_ -match '^DB_USERNAME=' } | Select-Object -First 1
    if ($usernameLine) {
        $dbUsername = $usernameLine.Substring('DB_USERNAME='.Length)
    }
}

Push-Location 'frontend'
try {
    npm ci
    if ($LASTEXITCODE -ne 0) {
        throw 'Falha ao instalar dependencias do frontend (npm ci).'
    }
}
finally {
    Pop-Location
}

docker compose up -d
if ($LASTEXITCODE -ne 0) {
    throw 'Falha ao iniciar os servicos Docker.'
}

$databaseReady = $false
for ($attempt = 0; $attempt -lt 30; $attempt++) {
    docker compose exec -T postgres pg_isready -U $dbUsername -d breadle *> $null
    if ($LASTEXITCODE -eq 0) {
        $databaseReady = $true
        break
    }
    Start-Sleep -Seconds 1
}
if (-not $databaseReady) {
    throw 'O PostgreSQL nao ficou pronto em 30 segundos. Confira o Docker Desktop e tente novamente.'
}

Write-Output 'Preparacao concluida. Consulte o README.md para iniciar backend e frontend.'
