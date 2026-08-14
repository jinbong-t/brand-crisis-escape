$content = [System.IO.File]::ReadAllText("app.js", [System.Text.Encoding]::UTF8)
$count = 0
$content = [regex]::Replace($content, "(?m)^(\s*)const roles = \[.*?;", {
    param($match)
    $count++
    return $match.Groups[1].Value + "const roles = ['인턴', '사원', '차장', '부장'];"
})
Write-Output "Replaced $count lines!"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText("app.js", $content, $utf8NoBom)
