$lines = Get-Content app.js -Encoding UTF8
$lines[174] = "        case '부장': return '팀의 최종 결정자';"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllLines("app.js", $lines, $utf8NoBom)
