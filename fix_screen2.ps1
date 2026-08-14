
$bytes = [System.IO.File]::ReadAllBytes("app.js")
$pos = 0
while($pos -lt ($bytes.Length - 2) -and $bytes[$pos] -eq 0xEF -and $bytes[$pos+1] -eq 0xBB -and $bytes[$pos+2] -eq 0xBF) { $pos += 3 }
$content = [System.Text.Encoding]::UTF8.GetString($bytes[$pos..($bytes.Length-1)])

$lines = $content -split "`n"

# startScreen2 함수 교체 (라인 697~897, 0-indexed: 696~896)
$newFunc = @'
// ==========================================
// Screen 2: 1단계 (디자인요소실) 로직
// ==========================================
function startScreen2(deptData) {
    mainHeader.classList.remove('hidden');
    currentTeamDisplay.textContent = `${currentDeptName} - ${currentRole}`;
    
    document.getElementById('display-current-role').textContent = currentRole;
    
    // 1단계 스토리 모달 띄우기
    document.getElementById('stage1-story-modal').classList.remove('hidden');
    
    document.getElementById('btn-start-stage1-missions').onclick = () => {
        document.getElementById('stage1-story-modal').classList.add('hidden');
    };
    
    // 미션 1-1 (몽타주) 설정
    const montageData = PUZZLE_DATA.stage1.montage[currentRole];
    document.getElementById('montage-clue-text').innerHTML = montageData.text;
    
    const optionsContainer = document.getElementById('montage-options');
    optionsContainer.innerHTML = '';
    montageData.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'btn-secondary';
        btn.textContent = opt;
        btn.addEventListener('click', () => {
            optionsContainer.querySelectorAll('button').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            
            if (btn.textContent === montageData.answer) {
                alert('정답입니다! 다음 미션이 열렸습니다');
                optionsContainer.querySelectorAll('button').forEach(b => b.disabled = true);
                const m2 = document.getElementById('mission-1-2');
                if (m2) {
                    m2.classList.remove('hidden');
                    m2.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            } else {
                alert('틀렸습니다. 단서를 다시 확인해보세요.');
                btn.classList.remove('selected');
            }
        });
        optionsContainer.appendChild(btn);
    });

    // 미션 1-2 (원단 교집합) 설정
    const fabricData = PUZZLE_DATA.stage1.fabricStandards[currentRole];
    document.getElementById('fabric-clue-title').textContent = fabricData.title;
    document.getElementById('fabric-clue-text').textContent = fabricData.text;
    
    const btnSubmitM2 = document.getElementById('btn-submit-mission-1-2');
    if (btnSubmitM2) {
        btnSubmitM2.textContent = currentRole === '부장' ? '최종 승인하기' : '부장님께 결재 올리기';
    }
    
    document.querySelectorAll('.fabric-btn').forEach(btn => {
        btn.onclick = () => btn.classList.toggle('selected');
    });

    document.getElementById('btn-submit-mission-1-2').onclick = async () => {
        const selectedButtons = Array.from(document.querySelectorAll('.fabric-btn.selected'));
        if (selectedButtons.length === 0) {
            alert('원단을 하나 이상 선택해주세요.');
            return;
        }
        
        const selectedValues = selectedButtons.map(btn => btn.getAttribute('data-val')).sort();
        let isCorrect = false;
        if (Array.isArray(fabricData.answer)) {
            const answerValues = [...fabricData.answer].sort();
            isCorrect = JSON.stringify(selectedValues) === JSON.stringify(answerValues);
        } else {
            isCorrect = selectedValues.length === 1 && selectedValues[0] === fabricData.answer;
        }
        
        if (isCorrect) {
            document.getElementById('btn-submit-mission-1-2').disabled = true;
            document.querySelectorAll('.fabric-btn').forEach(b => b.disabled = true);
            
            if (currentRole === '부장') {
                document.getElementById('btn-submit-mission-1-2').textContent = '최종 확인 완료 ✓';
                document.getElementById('manager-submit-panel').classList.remove('hidden');
                document.getElementById('manager-submit-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                document.getElementById('btn-submit-mission-1-2').textContent = '단서 전달 완료 ✓';
                
                try {
                    const roleRef = doc(db, `departments/${currentDeptId}/roles`, currentRole);
                    await setDoc(roleRef, { stage1Confirmed: true, selectedFabrics: selectedValues }, { merge: true });
                } catch(e) {
                    console.error('저장 오류:', e);
                }
                
                const waitingEl = document.getElementById('mission-complete-waiting');
                if (waitingEl) {
                    waitingEl.classList.remove('hidden');
                    waitingEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
                
                alert('미션 완료! 부장님의 팀 토론 결과를 기다리세요.');
            }
        } else {
            alert('틀렸습니다. 각 부분의 조건을 다시 한번 꼼꼼히 확인하세요');
        }
    };

    if (currentRole === '부장') {
        document.getElementById('manager-montage-panel').classList.remove('hidden');
        document.getElementById('manager-submit-panel').classList.add('hidden');
        
        onSnapshot(collection(db, `departments/${currentDeptId}/roles`), (snapshot) => {
            const requiredRoles = ['인턴', '사원', '차장'];
            
            requiredRoles.forEach(role => {
                const statusEl = document.getElementById(`status-${role}`);
                if (!statusEl) return;
                
                const roleDoc = snapshot.docs.find(d => d.id === role);
                const isConfirmed = roleDoc && roleDoc.data().stage1Confirmed;
                
                if (isConfirmed) {
                    statusEl.classList.add('done');
                    statusEl.querySelector('.status-icon').textContent = '✅';
                    statusEl.style.background = 'rgba(0,100,0,0.5)';
                } else {
                    statusEl.classList.remove('done');
                    statusEl.querySelector('.status-icon').textContent = '❌';
                    statusEl.style.background = 'rgba(0,0,0,0.5)';
                }
            });
            
            document.getElementById('btn-submit-stage1').disabled = false;
        });
        
        const btnSubmitStage1 = document.getElementById('btn-submit-stage1');
        btnSubmitStage1.onclick = async () => {
            const finalAnswer1 = document.getElementById('manager-final-answer-1').value;
            const finalAnswer2 = document.getElementById('manager-final-answer-2').value;
            const errorMsg = document.getElementById('manager-error-msg');
            
            if (!finalAnswer1 || !finalAnswer2) {
                alert('미션 1(몽타주)과 미션 2(친환경 원단) 정답을 모두 선택해주세요.');
                return;
            }
            
            if (finalAnswer1 === 'B' && finalAnswer2 === 'H') {
                errorMsg.classList.add('hidden');
                btnSubmitStage1.disabled = true;
                btnSubmitStage1.textContent = '✓ 정답 확인 완료!';
                
                const directionPanel = document.getElementById('direction-choice-panel');
                if (directionPanel) {
                    directionPanel.classList.remove('hidden');
                    directionPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            } else {
                errorMsg.classList.remove('hidden');
                errorMsg.textContent = '오답입니다! 팀원들이 모아온 단서(교집합)를 다시 분석해보세요.';
            }
        };
        
        const btnProfit = document.getElementById('btn-direction-profit');
        const btnEco = document.getElementById('btn-direction-eco');
        
        const goToStage2 = async (direction) => {
            if (btnProfit) btnProfit.disabled = true;
            if (btnEco) btnEco.disabled = true;
            
            try {
                await setDoc(doc(db, 'departments', currentDeptId), {
                    currentStage: 2,
                    stage1Direction: direction,
                    showStage1Reasoning: false
                }, { merge: true });
            } catch(e) {
                console.error('2단계 진입 오류:', e);
                alert('서버 오류가 발생했습니다. 다시 시도해주세요.');
                if (btnProfit) btnProfit.disabled = false;
                if (btnEco) btnEco.disabled = false;
            }
        };
        
        if (btnProfit) {
            btnProfit.onclick = () => {
                if (confirm('디자인/수익 중심으로 2단계를 진행하시겠습니까? (선택 후 모든 팀원이 2단계로 이동합니다)')) {
                    goToStage2('profit');
                }
            };
        }
        if (btnEco) {
            btnEco.onclick = () => {
                if (confirm('환경/지속가능한 의생활 방향으로 2단계를 진행하시겠습니까? (선택 후 모든 팀원이 2단계로 이동합니다)')) {
                    goToStage2('eco');
                }
            };
        }
        
    } else {
        document.getElementById('manager-montage-panel').classList.add('hidden');
        document.getElementById('manager-submit-panel').classList.add('hidden');
    }
}
'@

# 0-indexed: 696~896
$before = $lines[0..695]
$after = $lines[897..($lines.Length-1)]

$newContent = ($before -join "`n") + "`n" + $newFunc + "`n" + ($after -join "`n")

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText("app.js", $newContent, $utf8NoBom)
Write-Output "저장 완료! 크기: $((Get-Item 'app.js').Length) bytes"

# 검증
$check = [System.IO.File]::ReadAllText("app.js", [System.Text.Encoding]::UTF8)
$hasFunc = $check.Contains("goToStage2")
$hasDirectionPanel = $check.Contains("direction-choice-panel")
Write-Output "goToStage2 함수 포함: $hasFunc"
Write-Output "direction-choice-panel 참조: $hasDirectionPanel"
