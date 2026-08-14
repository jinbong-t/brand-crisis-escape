$lines = Get-Content app.js -Encoding UTF8
$lines[741] = "        btnSubmitM2.textContent = currentRole === '부장' ? '최종 확인 완료' : '결재 올리기';"
$lines[766] = "            alert(currentRole === '부장' ? '확인되었습니다.' : '제출되었습니다.');"
$lines[768] = "            document.getElementById('btn-submit-mission-1-2').textContent = currentRole === '부장' ? '최종 확인 완료' : '결재 올리기';"
$lines[786] = "    if (currentRole === '부장') {"
$lines[912] = "    if (currentRole === '부장') {"
$lines[1020] = "    if (currentRole === '부장') {"
$lines[1214] = "    if (currentRole === '부장') {"

$lines[286] = "        const roles = ['인턴', '사원', '차장', '부장'];"
$lines[333] = "            const roles = ['인턴', '사원', '차장', '부장'];"
$lines[918] = "            const roles = ['인턴', '사원', '차장'];"
$lines[1025] = "            const roles = ['인턴', '사원', '차장'];"

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllLines("app.js", $lines, $utf8NoBom)
