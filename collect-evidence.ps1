$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$sourceRoot = Split-Path $PSScriptRoot -Parent
New-Item -ItemType Directory -Path (Join-Path $PSScriptRoot 'schemas') -Force | Out-Null
# Exact allowlist of non-secret schemas and model declarations. No full extraction.
$specifications = @(
    @('Backend_plateforme_v2-main.zip', 'Backend_plateforme_v2-main/govern-v3/app/rgc/schemas/rgc-contract-0.1.0.schema.json', 'backend-v2-rgc-0.1.0.schema.json'),
    @('neomundi-runtime-measurement-main.zip', 'neomundi-runtime-measurement-main/schema/contract-v0.1.schema.json', 'runtime-contract-v0.1.schema.json'),
    @('neomundi-runtime-measurement-main.zip', 'neomundi-runtime-measurement-main/schema/contract-v0.2.schema.json', 'runtime-contract-v0.2.schema.json')
)
$evidence = @()
foreach ($spec in $specifications) {
    $archive = [IO.Compression.ZipFile]::OpenRead((Join-Path $sourceRoot $spec[0]))
    try {
        $entry = $archive.GetEntry($spec[1])
        $destination = Join-Path $PSScriptRoot ('schemas/' + $spec[2])
        $inputStream = $entry.Open()
        try {
            $outputStream = [IO.File]::Create($destination)
            try { $inputStream.CopyTo($outputStream) } finally { $outputStream.Dispose() }
        } finally { $inputStream.Dispose() }
        $evidence += [pscustomobject]@{
            archive = $spec[0]; entry = $spec[1]; copy = ('schemas/' + $spec[2])
            sha256 = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash.ToLower()
        }
    } finally { $archive.Dispose() }
}
$evidence | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'schemas/provenance.json') -Encoding UTF8
$archive = [IO.Compression.ZipFile]::OpenRead((Join-Path $sourceRoot 'Backend_plateforme_v2-main.zip'))
$declarations = @()
try {
    foreach ($name in @('requests', 'responses')) {
        $entry = $archive.GetEntry('Backend_plateforme_v2-main/govern-v3/app/models/' + $name + '.py')
        $reader = [IO.StreamReader]::new($entry.Open())
        try { $lines = $reader.ReadToEnd() -split "`n" } finally { $reader.Dispose() }
        for ($i = 0; $i -lt $lines.Length; $i++) {
            if ($lines[$i] -match '^class |^    [a-zA-Z_][a-zA-Z_0-9]*:') {
                $declarations += [pscustomobject]@{source=$entry.FullName; line=($i+1); declaration=$lines[$i].TrimEnd()}
            }
        }
    }
} finally { $archive.Dispose() }
$declarations | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'schemas/backend-model-declarations.json') -Encoding UTF8
Write-Output 'Three source schemas and model declaration index collected locally.'
