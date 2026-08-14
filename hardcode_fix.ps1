$lines = [System.IO.File]::ReadAllLines("app.js", [System.Text.Encoding]::UTF8)

for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i].Contains("const roles =")) {
        if ($lines[$i].Contains("부??];") -or $lines[$i].Contains("遺€??];") -or $lines[$i].Contains("부??]")) {
            $lines[$i] = "        const roles = ['인턴', '사원', '차장', '부장'];"
        }
    }
}

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllLines("app.js", $lines, $utf8NoBom)
Write-Output "Hardcode replaced line 294 and 341!"
