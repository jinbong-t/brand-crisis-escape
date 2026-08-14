$content = [System.IO.File]::ReadAllText("app.js", [System.Text.Encoding]::UTF8)

# Fix the broken 4-element array syntax error (missing quote)
$content = $content -replace "const roles = \['[^']+', '[^']+', '[^']+', '[^\]]+\];", "const roles = ['인턴', '사원', '차장', '부장'];"
# Fix the broken 3-element array
$content = $content -replace "const roles = \['[^']+', '[^']+', '[^']+'\];", "const roles = ['인턴', '사원', '차장'];"

# Also fix the currentRole === '부장' checks that were broken
$content = $content -replace "currentRole === '[^']+' \? '최종 확인 완료' : '결재 올리기'", "currentRole === '부장' ? '최종 확인 완료' : '결재 올리기'"

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText("app.js", $content, $utf8NoBom)
Write-Output "Syntax error fixed!"
