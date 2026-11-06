param(
    [Parameter(Mandatory = $true)]
    [string]$BackupPath
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

$resolvedBackupPath = [System.IO.Path]::GetFullPath((Join-Path $projectRoot $BackupPath))
if (-not (Test-Path -LiteralPath $resolvedBackupPath -PathType Leaf)) {
    throw "Arquivo de backup nao encontrado: $resolvedBackupPath"
}

$stagePath = Join-Path ([System.IO.Path]::GetTempPath()) "breadle-restore-$([guid]::NewGuid().ToString('N'))"
New-Item -ItemType Directory -Path $stagePath | Out-Null

try {
    Expand-Archive -LiteralPath $resolvedBackupPath -DestinationPath $stagePath
    $dumpPath = Join-Path $stagePath 'database.dump'
    $backupStoragePath = Join-Path $stagePath 'backend-storage'
    if (-not (Test-Path -LiteralPath $dumpPath -PathType Leaf) -or
        -not (Test-Path -LiteralPath $backupStoragePath -PathType Container)) {
        throw 'O ZIP nao parece ser um backup Breadle valido: database.dump ou backend-storage ausente.'
    }

    $confirmation = Read-Host 'Isso substituira os dados do banco e sobrescrevera arquivos de mesmo nome em backend\storage. Digite RESTAURAR para confirmar'
    if ($confirmation -cne 'RESTAURAR') {
        Write-Output 'Restauracao cancelada; nenhum dado foi alterado.'
        return
    }

    if (-not (Test-Path '.env')) {
        throw 'Arquivo .env nao encontrado. Execute primeiro scripts\prepare-windows.ps1.'
    }

    $dbUsername = 'breadle'
    $usernameLine = Get-Content '.env' | Where-Object { $_ -match '^DB_USERNAME=' } | Select-Object -First 1
    if ($usernameLine) {
        $dbUsername = $usernameLine.Substring('DB_USERNAME='.Length)
    }

    docker compose up -d postgres
    if ($LASTEXITCODE -ne 0) {
        throw 'Nao foi possivel iniciar o PostgreSQL do projeto.'
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
        throw 'O PostgreSQL nao ficou pronto em 30 segundos.'
    }

    docker cp $dumpPath 'breadle-postgres:/tmp/breadle-restore.dump'
    if ($LASTEXITCODE -ne 0) {
        throw 'Falha ao copiar o dump para o container PostgreSQL.'
    }
    try {
        docker compose exec -T postgres pg_restore --clean --if-exists --no-owner --no-acl -U $dbUsername -d breadle /tmp/breadle-restore.dump
        if ($LASTEXITCODE -ne 0) {
            throw 'Falha ao restaurar o banco. Confira se a versao do PostgreSQL e compativel e os logs acima.'
        }
    }
    finally {
        docker compose exec -T postgres rm -f /tmp/breadle-restore.dump
    }

    $storagePath = Join-Path $projectRoot 'backend\storage'
    New-Item -ItemType Directory -Path $storagePath -Force | Out-Null
    $storageItems = Get-ChildItem -LiteralPath $backupStoragePath -Force
    if ($storageItems) {
        Copy-Item (Join-Path $backupStoragePath '*') $storagePath -Recurse -Force
    }

    Write-Output 'Banco e arquivos locais restaurados. Inicie o backend e o frontend conforme o README.md.'
}
finally {
    Remove-Item -LiteralPath $stagePath -Recurse -Force
}
