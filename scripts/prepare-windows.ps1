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

if (-not (Test-Path '.env')) {
    Copy-Item '.env.example' '.env'
    $envLines = Get-Content '.env'
    $dbPasswordBytes = New-Object byte[] 32
    $jwtSecretBytes = New-Object byte[] 32
    $random = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $random.GetBytes($dbPasswordBytes)
        $random.GetBytes($jwtSecretBytes)
    }
    finally {
        $random.Dispose()
    }

    $dbPassword = [Convert]::ToBase64String($dbPasswordBytes)
    $jwtSecret = [Convert]::ToBase64String($jwtSecretBytes)
    $envLines = $envLines | ForEach-Object {
        if ($_ -match '^DB_PASSWORD=') {
            "DB_PASSWORD=$dbPassword"
        }
        elseif ($_ -match '^JWT_SECRET=') {
            "JWT_SECRET=$jwtSecret"
        }
        else {
            $_
        }
    }
    $utf8WithoutBom = New-Object -TypeName System.Text.UTF8Encoding -ArgumentList $false
    [System.IO.File]::WriteAllLines((Join-Path $projectRoot '.env'), $envLines, $utf8WithoutBom)
    Write-Output 'Arquivo .env criado com segredos locais aleatorios.'
}
else {
    Write-Output 'Arquivo .env existente preservado.'
}

$usernameLine = Get-Content '.env' | Where-Object { $_ -match '^DB_USERNAME=' } | Select-Object -First 1
if ($usernameLine) {
    $dbUsername = $usernameLine.Substring('DB_USERNAME='.Length)
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
