$content = [System.IO.File]::ReadAllText("app.js", [System.Text.Encoding]::UTF8)

$content = $content -replace "id: 'dept-1'.*name: '[^']+'", "id: 'dept-1', name: '디자인기획부'"
$content = $content -replace "id: 'dept-2'.*name: '[^']+'", "id: 'dept-2', name: '소재개발부'"
$content = $content -replace "id: 'dept-3'.*name: '[^']+'", "id: 'dept-3', name: '스타일링부'"
$content = $content -replace "id: 'dept-4'.*name: '[^']+'", "id: 'dept-4', name: '생산전략부'"
$content = $content -replace "id: 'dept-5'.*name: '[^']+'", "id: 'dept-5', name: '마케팅부'"
$content = $content -replace "id: 'dept-6'.*name: '[^']+'", "id: 'dept-6', name: '품질관리부'"

$content = $content -replace "roles = \['[^']+', '[^']+', '[^']+', '[^']+'\]", "roles = ['인턴', '사원', '차장', '부장']"
$content = $content -replace "const montageData = PUZZLE_DATA\.stage1\.montage\[currentRole\];", "const montageData = PUZZLE_DATA.stage1.montage[currentRole];

    if (!montageData) {
        console.error('Invalid currentRole for montageData:', currentRole);
        alert('역할 데이터가 유효하지 않습니다.');
        return;
    }"

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText("app.js", $content, $utf8NoBom)
Write-Output "Done replacing strings in app.js"