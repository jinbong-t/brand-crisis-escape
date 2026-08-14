$content = [System.IO.File]::ReadAllText("app.js", [System.Text.Encoding]::UTF8)

# Fix DEPT list
$content = $content -replace "id:\s*'dept-1',\s*name:\s*'[^']+'", "id: 'dept-1', name: '디자인기획부'"
$content = $content -replace "id:\s*'dept-2',\s*name:\s*'[^']+'", "id: 'dept-2', name: '소재개발부'"
$content = $content -replace "id:\s*'dept-3',\s*name:\s*'[^']+'", "id: 'dept-3', name: '스타일링부'"
$content = $content -replace "id:\s*'dept-4',\s*name:\s*'[^']+'", "id: 'dept-4', name: '생산전략부'"
$content = $content -replace "id:\s*'dept-5',\s*name:\s*'[^']+'", "id: 'dept-5', name: '마케팅부'"
$content = $content -replace "id:\s*'dept-6',\s*name:\s*'[^']+'", "id: 'dept-6', name: '품질관리부'"

# Fix getRoleDesc block
$oldRoleDesc = "(?s)function getRoleDesc\(role\) \{.*?^\}"
$newRoleDesc = "function getRoleDesc(role) {
    switch(role) {
        case '인턴': return '직접적인 단서 탐색';
        case '사원': return '자료 해석 및 분석';
        case '차장': return '핵심 개념 도출';
        case '부장': return '종합 판단 및 제출';
    }
}"
$content = $content -replace $oldRoleDesc, $newRoleDesc

# Fix the roles array which might be corrupted like ['', '', '', '']
$content = $content -replace "const roles = \['[^']+', '[^']+', '[^']+', '[^']+'\];", "const roles = ['인턴', '사원', '차장', '부장'];"

# Ensure UTF-8 with BOM since that's what was used before, or just UTF-8
$utf8NoBom = New-Object System.Text.UTF8Encoding $true
[System.IO.File]::WriteAllText("app.js", $content, $utf8NoBom)
Write-Output "Fixed Korean text in app.js"
