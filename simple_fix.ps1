$lines = [System.IO.File]::ReadAllLines("app.js", [System.Text.Encoding]::UTF8)
for ($i = 0; $i -lt $lines.Length; $i++) {
    $idx = $lines[$i].IndexOf("const roles = [")
    if ($idx -ge 0) {
        $prefix = $lines[$i].Substring(0, $idx)
        if ($i -lt 500) {
            $lines[$i] = $prefix + "const roles = ['인턴', '사원', '차장', '부장'];"
        } else {
            $lines[$i] = $prefix + "const roles = ['인턴', '사원', '차장'];"
        }
    }
}
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllLines("app.js", $lines, $utf8NoBom)
Write-Output "Simple string fix applied."
