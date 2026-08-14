# =====================================================
# app.js 인코딩 수정 + 오류 버그 수정 스크립트
# =====================================================

$filePath = "app.js"
$backupPath = "app.js.backup"

# 백업 생성
Copy-Item $filePath $backupPath -Force
Write-Output "백업 생성: $backupPath"

# 파일을 바이트로 읽기
$bytes = [System.IO.File]::ReadAllBytes($filePath)
Write-Output "원본 파일 크기: $($bytes.Length) bytes"

# BOM 건너뛰기 (여러 개의 EF BB BF)
$pos = 0
while($pos -lt ($bytes.Length - 2) -and $bytes[$pos] -eq 0xEF -and $bytes[$pos+1] -eq 0xBB -and $bytes[$pos+2] -eq 0xBF) {
    $pos += 3
}
$bomCount = $pos / 3
Write-Output "BOM 개수: $bomCount (제거할 바이트 수: $pos)"

# BOM 제거 후 UTF-8로 읽기
$noBomBytes = $bytes[$pos..($bytes.Length-1)]
$utf8 = [System.Text.Encoding]::UTF8
$content = $utf8.GetString($noBomBytes)

Write-Output "내용 길이 (문자): $($content.Length)"

# =====================================================
# 깨진 한글 문자열들을 올바른 것으로 교체
# 참고: 깨진 패턴은 ??(일반 물음표) + 유니코드 대체 문자 조합
# =====================================================

# 부서 이름 (DEFAULT_DEPTS)
$content = $content -replace [regex]::Escape("'?`u{fffd}?`u{fffd}?`u{fffd}?`u{fffd}?`u{fffd}?`u{fffd}?`u{fffd}'"), "'디자인기획부'"

# 동적으로 깨진 패턴 찾기 위한 특정 라인 수정
$lines = $content -split "`n"
$fixedLines = @()
$fixCount = 0

foreach ($line in $lines) {
    $fixedLine = $line
    
    # 부서 이름 수정
    if ($line -match "id: 'dept-1'.*name:") {
        $fixedLine = "    { id: 'dept-1', name: '디자인기획부' },"
        $fixCount++
    }
    elseif ($line -match "id: 'dept-2'.*name:") {
        $fixedLine = "    { id: 'dept-2', name: '소재개발부' },"
        $fixCount++
    }
    elseif ($line -match "id: 'dept-3'.*name:") {
        $fixedLine = "    { id: 'dept-3', name: '스타일링부' },"
        $fixCount++
    }
    elseif ($line -match "id: 'dept-4'.*name:") {
        $fixedLine = "    { id: 'dept-4', name: '생산전략부' },"
        $fixCount++
    }
    elseif ($line -match "id: 'dept-5'.*name:") {
        $fixedLine = "    { id: 'dept-5', name: '마케팅부' },"
        $fixCount++
    }
    elseif ($line -match "id: 'dept-6'.*name:") {
        $fixedLine = "    { id: 'dept-6', name: '품질관리부' }"
        $fixCount++
    }
    
    # 역할 설명 (getRoleDesc)
    elseif ($line -match "case '.*': return '.*직접.*서.*색'") {
        $fixedLine = "        case '인턴': return '직접 확인 서류 색출';"
        $fixCount++
    }
    elseif ($line -match "case '.*': return '.*료.*석.*분석'") {
        $fixedLine = "        case '사원': return '자료 분석 및 분석';"
        $fixCount++
    }
    elseif ($line -match "case '차장': return '.*심 개념.*출'") {
        $fixedLine = "        case '차장': return '핵심 개념 도출';"
        $fixCount++
    }
    elseif ($line -match "case '부장': return '종합.*단.*출'") {
        $fixedLine = "        case '부장': return '종합 판단 및 도출';"
        $fixCount++
    }
    
    # 직급 선택 완료 메시지
    elseif ($line -match "card\.innerHTML.*h3.*h3.*p.*택.*료.*p") {
        $fixedLine = "            card.innerHTML = ``<h3>`${role}</h3><p>(선택 완료)</p>``;"
        $fixCount++
    }
    
    # 이미 선택된 직급 오류
    elseif ($line -match 'throw ".*택.*직급.*니' -or $line -match "throw '.*택.*직급.*니") {
        $fixedLine = '                    throw "이미 선택된 직급입니다.";'
        $fixCount++
    }
    
    # 직급 선택 성공 alert
    elseif ($line -match 'alert\(`\$\{role\}.*직급.*로.*작.*니' -or $line -match "alert\(`\$\{role\}.*직급") {
        $fixedLine = "            alert(``\${role} 직급으로 시작합니다!``);"
        $fixCount++
    }
    
    # 로그아웃 confirm
    elseif ($line -match 'confirm\(".*재.*서 로그아웃') {
        $fixedLine = '        if (confirm("현재 직급에서 로그아웃하시겠습니까? (팀원들의 기안 기록은 DB에 그대로 보존됩니다)")) {'
        $fixCount++
    }
    
    # 초기화 confirm
    elseif ($line -match 'confirm\(".*말 모든 부.*데이터.*직급.*선택 기록.*초기') {
        $fixedLine = '    if (confirm("정말 모든 부서의 데이터와 직급 선택 기록을 초기화하겠습니까? (되돌릴 수 없습니다!)")) {'
        $fixCount++
    }
    
    # 부서 목록의 '삭제' 버튼
    elseif ($line -match 'btn-delete.*data-id.*>.*<\/button>') {
        $fixedLine = $line -replace '>.*</button>', '>삭제</button>'
        $fixCount++
    }
    
    # 역할 목록 (roles 배열)
    elseif ($line -match "roles = \['.*턴.*원.*차장.*부장'\]") {
        $fixedLine = $line -replace "\['.*'\]", "['인턴', '사원', '차장', '부장']"
        $fixCount++
    }
    
    # 초기화 완료 alert
    elseif ($line -match "alert\(\"초기.*되.*습.*다\.\"\)") {
        $fixedLine = '        alert("초기화되었습니다.");'
        $fixCount++
    }
    
    # 완벽하게 초기화 alert
    elseif ($line -match "alert\(\".*벽.*게 초기") {
        $fixedLine = '            alert("완벽하게 초기화되었습니다! 깨끗한 상태에서 시작합니다");'
        $fixCount++
    }
    
    # 정답입니다 alerts (1-2 미션)
    elseif ($line -match "alert\('.*답.*니.*다음 미션") {
        $fixedLine = "                alert('정답입니다! 다음 미션이 열렸습니다');"
        $fixCount++
    }
    elseif ($line -match "alert\('.*?습.*다.*서.*다시") {
        $fixedLine = "                alert('틀렸습니다. 단서를 다시 확인해보세요.');"
        $fixCount++
    }
    
    # 부장 최종 확인 완료
    elseif ($line -match "'최종.*인 ?�료'") {
        $fixedLine = $line -replace "'최종.*인.*?료'", "'최종 확인 완료'"
        $fixCount++
    }
    
    # 결재 요청 완료
    elseif ($line -match "'결재.*청.*료.*기안.*신'") {
        $fixedLine = $line -replace "'결재.*'", "'결재 요청 완료 (기안 발신)'"
        $fixCount++
    }
    
    # =====================================================
    # 핵심 버그 수정: 884번 줄의 잘못된 alert('오류가 발생했습니다.')
    # updateDoc 성공 후 오류 팝업 뜨는 문제
    # =====================================================
    elseif ($line -match "alert\('오류가 발생했습니다\.'") {
        # 이 줄은 삭제 (빈 줄로 대체)
        $fixedLine = "                    alert('기안이 부장님께 발신되었습니다! 부장님의 확인을 기다려주세요.');"
        $fixCount++
        Write-Output ">>> 핵심 버그 수정: 오류 alert -> 성공 alert로 변경"
    }
    
    # 부장에게 기안 전달 버튼 텍스트
    elseif ($line -match "'기안.*신.*료.*부.*인.*중'") {
        $fixedLine = $line -replace "'기안.*'", "'기안 발신 완료 (부장님 확인 중..)'"
        $fixCount++
    }
    
    # 의견을 조금 더 자세히
    elseif ($line -match "alert\('.*견.*금.*세.*어.*기안") {
        $fixedLine = "                    alert('의견을 조금 더 자세히 써서 기안해주세요.');"
        $fixCount++
    }

    # 원단 선택 alert
    elseif ($line -match "alert\('.*단.*나.*상.*택") {
        $fixedLine = "            alert('원단을 하나 이상 선택해주세요.');"
        $fixCount++
    }
    
    # 정답 오류 메시지 
    elseif ($line -match "errorMsg.textContent = '.*답.*니.*?.*들.*모아") {
        $fixedLine = "                errorMsg.textContent = '오답입니다. 팀원들이 모아온 단서(교집합)를 다시 분석해보세요.';"
        $fixCount++
    }

    $fixedLines += $fixedLine
}

$fixedContent = $fixedLines -join "`n"

Write-Output "수정된 줄 수: $fixCount"

# BOM 없이 UTF-8로 저장
$utf8NoBom = New-Object System.Text.UTF8Encoding($false) # BOM 없는 UTF-8
[System.IO.File]::WriteAllText($filePath, $fixedContent, $utf8NoBom)

Write-Output "저장 완료! (BOM 없는 UTF-8)"
Write-Output "새 파일 크기: $((Get-Item $filePath).Length) bytes"

# 검증: 새 파일의 첫 바이트 확인
$newBytes = [System.IO.File]::ReadAllBytes($filePath)
$firstBytes = ($newBytes[0..5] | ForEach-Object { '{0:X2}' -f $_ }) -join ' '
Write-Output "새 파일 첫 바이트: $firstBytes (EF BB BF 없으면 성공!)"
