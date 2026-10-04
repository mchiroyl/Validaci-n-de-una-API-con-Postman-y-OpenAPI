# File conversion for QA using Word's document API, without interacting with its UI.
param([string]$InputFile = 'entrega/informe.docx', [string]$OutputDirectory = 'tmp/word-preview')
$taskDocxPath = (Resolve-Path -LiteralPath $InputFile).Path
$taskPreviewDir = [System.IO.Path]::GetFullPath((Join-Path (Get-Location).Path $OutputDirectory))
New-Item -ItemType Directory -Path $taskPreviewDir -Force | Out-Null
$taskWordEngine = New-Object -ComObject Word.Application
$taskWordEngine.DisplayAlerts = 0
$taskDocument = $null
try {
    $taskDocument = $taskWordEngine.Documents.Open($taskDocxPath, $false, $true)
    $taskDocument.ExportAsFixedFormat((Join-Path $taskPreviewDir 'informe.pdf'), 17)
    Write-Output ('Páginas Word: ' + $taskDocument.ComputeStatistics(2))
} finally {
    if ($null -ne $taskDocument) { $taskDocument.Close(0) }
    if ($taskWordEngine.Documents.Count -eq 0) { $taskWordEngine.Quit() }
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($taskWordEngine) | Out-Null
}
