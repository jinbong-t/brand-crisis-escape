$filePath = "puzzle-data.js"
$bytes = [System.IO.File]::ReadAllBytes($filePath)
$euckr = [System.Text.Encoding]::GetEncoding("euc-kr")
$content = $euckr.GetString($bytes)
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($filePath, $content, $utf8NoBom)
Write-Output "Fixed encoding for puzzle-data.js"
