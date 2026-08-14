$lines = [System.IO.File]::ReadAllLines("app.js")
$lines[293] = "        const roles = ['인턴', '사원', '차장', '부장'];"
$lines[340] = "        const roles = ['인턴', '사원', '차장', '부장'];"
$lines[931] = "            const roles = ['인턴', '사원', '차장'];"
$lines[1038] = "            const roles = ['인턴', '사원', '차장'];"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllLines("app.js", $lines, $utf8NoBom)
Write-Output "Array lines replaced exactly."
