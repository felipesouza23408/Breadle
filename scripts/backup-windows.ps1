param(
    [string]$OutputDirectory = 'backups'
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

if (-not (Test-Path '.env')) {
    throw 'Arquivo .env nao encontrado. Prepare o projeto antes de criar um backup.'
}

docker compose up -d postgres
if ($LASTEXITCODE -ne 0) {
    throw 'Nao foi possivel iniciar o PostgreSQL do projeto.'
}

$dbUsername = 'breadle'
$usernameLine = Get-Content '.env' | Where-Object { $_ -match '^DB_USERNAME=' } | Select-Object -First 1
if ($usernameLine) {
    $dbUsername = $usernameLine.Substring('DB_USERNAME='.Length)
}

if ([System.IO.Path]::IsPathRooted($OutputDirectory)) {
    $resolvedOutputDirectory = [System.IO.Path]::GetFullPath($OutputDirectory)
}
else {
    $resolvedOutputDirectory = [System.IO.Path]::GetFullPath((Join-Path $projectRoot $OutputDirectory))
}
New-Item -ItemType Directory -Path $resolvedOutputDirectory -Force | Out-Null
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$archivePath = Join-Path $resolvedOutputDirectory "breadle-backup-$timestamp.zip"
$stagePath = Join-Path ([System.IO.Path]::GetTempPath()) "breadle-backup-$([guid]::NewGuid().ToString('N'))"
New-Item -ItemType Directory -Path $stagePath | Out-Null

try {
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
        throw 'O PostgreSQL nao ficou pronto em 30 segundos.'
    }

    docker compose exec -T postgres pg_dump -U $dbUsername -d breadle --format=custom --no-owner --no-acl --file=/tmp/breadle-transfer.dump
    if ($LASTEXITCODE -ne 0) {
        throw 'Falha ao exportar o banco. Confira se o PostgreSQL esta pronto.'
    }

    docker cp 'breadle-postgres:/tmp/breadle-transfer.dump' (Join-Path $stagePath 'database.dump')
    if ($LASTEXITCODE -ne 0) {
        throw 'Falha ao copiar o dump do banco para o pacote.'
    }
    docker compose exec -T postgres rm -f /tmp/breadle-transfer.dump

    $storagePath = Join-Path $projectRoot 'backend\storage'
    if (Test-Path $storagePath) {
        Copy-Item $storagePath (Join-Path $stagePath 'backend-storage') -Recurse
    }
    else {
        New-Item -ItemType Directory -Path (Join-Path $stagePath 'backend-storage') | Out-Null
    }

    Compress-Archive -Path (Join-Path $stagePath '*') -DestinationPath $archivePath
    Write-Output "Backup criado: $archivePath"
    Write-Output 'O arquivo nao contem .env. Guarde-o em local seguro: inclui dados do banco e arquivos de livros.'
}
finally {
    Remove-Item -LiteralPath $stagePath -Recurse -Force
}
