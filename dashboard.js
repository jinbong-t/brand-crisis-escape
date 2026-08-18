import { db, collection, doc, setDoc, getDoc, updateDoc, onSnapshot, getDocs, deleteDoc } from './firebase-config.js';

// 기본 활성 학급
let activeClass = '3-1';
const classInput = document.getElementById('class-input');
const currentTabTitle = document.getElementById('current-tab-title');

// 기본 6개 부서
const DEFAULT_DEPTS = [
    { id: 'dept-1', name: '디자인기획부' },
    { id: 'dept-2', name: '소재개발부' },
    { id: 'dept-3', name: '스타일링부' },
    { id: 'dept-4', name: '생산전략부' },
    { id: 'dept-5', name: '마케팅부' },
    { id: 'dept-6', name: '품질관리부' }
];

// 초기 학급 세팅 동기화
async function loadGlobalConfig() {
    const configSnap = await getDoc(doc(db, 'global', 'config'));
    if (configSnap.exists() && configSnap.data().currentActiveSession) {
        activeClass = configSnap.data().currentActiveSession;
    }
    classInput.value = activeClass;
    initDashboard();
}

classInput.addEventListener('click', () => {
    classInput.select();
});
classInput.addEventListener('focus', () => {
    classInput.select();
});

document.getElementById('btn-set-class')?.addEventListener('click', async () => {
    const newClass = classInput.value.trim();
    if (newClass) {
        activeClass = newClass;
        try {
            await setDoc(doc(db, 'global', 'config'), { currentActiveSession: activeClass }, { merge: true });
            alert(`현재 모니터링 학급이 [${activeClass}]로 변경되었습니다.\n새로고침되는 학생 화면은 자동으로 이 반으로 접속됩니다.`);
            initDashboard();
        } catch(e) {
            console.error(e);
            alert("학급 설정 저장 실패");
        }
    }
});

// 메뉴 탭 전환
const tabs = document.querySelectorAll('.nav-item');
const panes = document.querySelectorAll('.tab-pane');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        panes.forEach(p => p.classList.remove('active'));
        
        tab.classList.add('active');
        const target = tab.getAttribute('data-tab');
        document.getElementById(`tab-${target}`).classList.add('active');
        currentTabTitle.textContent = tab.textContent.trim();
    });
});

// 게임 화면 복귀
document.getElementById('btn-exit')?.addEventListener('click', () => {
    window.close();
});

// 실시간 현황판 초기화 버튼 (Stage 및 envScore 리셋)
document.getElementById('btn-reset-status')?.addEventListener('click', async () => {
    if (!confirm('정말로 모든 부서의 진행 상황(Stage)과 학급 환경 점수를 완전히 초기화하시겠습니까?')) return;
    
    try {
        const deptsRef = collection(db, `classes/${activeClass}/departments`);
        const snapshot = await getDocs(deptsRef);
        const promises = [];
        snapshot.forEach(docSnap => {
            promises.push(updateDoc(docSnap.ref, {
                currentStage: 0,
                envScore: 0,
                showStage1Reasoning: false,
                showStage3Reasoning: false
            }));
        });
        await Promise.all(promises);
        alert('모든 진행 상황과 환경 점수가 성공적으로 초기화되었습니다!');
    } catch (e) {
        console.error(e);
        alert('초기화 중 오류가 발생했습니다.');
    }
});

// ==========================================
// 파이어베이스 데이터 구독 및 렌더링
// ==========================================
let unsubscribes = [];

function initDashboard() {
    unsubscribes.forEach(unsub => unsub());
    unsubscribes = [];

    renderTeamTab();
    renderStatusTab();
    renderResultsTab();
    renderControlTab();
}

// 1. 조 편성 명단 관리 (팀 탭)
function renderTeamTab() {
    const container = document.getElementById('td-dept-list');
    container.innerHTML = '<p style="color: var(--text-muted); padding: 1rem;">현재 진행 중인 반의 부서 데이터를 불러오는 중입니다...</p>';
    
    const deptsRef = collection(db, `classes/${activeClass}/departments`);
    const unsub = onSnapshot(deptsRef, (snapshot) => {
        if (snapshot.empty) {
            container.innerHTML = '<p style="color: var(--text-muted); padding: 1rem;">현재 반에 생성된 부서가 없습니다. (학생이 메인 화면에서 부서를 선택하면 자동 생성됩니다)</p>';
            return;
        }

        container.innerHTML = '';
        snapshot.forEach(docSnap => {
            const deptId = docSnap.id;
            const deptData = docSnap.data();
            const deptName = deptData.name || deptId;
            
            const card = document.createElement('div');
            card.className = 'dept-card';
            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <h3 style="margin: 0;">${deptName}</h3>
                    <button class="btn-delete-dept" data-id="${deptId}" style="background: none; border: none; color: #ff4757; font-size: 1.2rem; cursor: pointer;" title="부서 삭제">✖</button>
                </div>
                <input type="text" placeholder="인턴 학번/이름 (예: 30101 홍길동)" class="member-input" data-dept="${deptId}" data-role="인턴" draggable="true">
                <input type="text" placeholder="사원 학번/이름" class="member-input" data-dept="${deptId}" data-role="사원" draggable="true">
                <input type="text" placeholder="차장 학번/이름" class="member-input" data-dept="${deptId}" data-role="차장" draggable="true">
                <input type="text" placeholder="부장 학번/이름" class="member-input" data-dept="${deptId}" data-role="부장" draggable="true">
            `;
            container.appendChild(card);
            
            // 기존 학생 매핑 데이터 불러오기
            const rolesRef = collection(db, `classes/${activeClass}/departments/${deptId}/roles`);
            getDocs(rolesRef).then(rolesSnap => {
                rolesSnap.forEach(roleDoc => {
                    const rData = roleDoc.data();
                    if (rData.studentName) {
                        const input = card.querySelector(`input[data-role="${roleDoc.id}"]`);
                        if (input) input.value = rData.studentName;
                    }
                });
            });
        });
    });
    unsubscribes.push(unsub);
}

// 명단 자동 저장 이벤트 (이벤트 위임)
document.getElementById('td-dept-list').addEventListener('change', async (e) => {
    if (e.target.classList.contains('member-input')) {
        const deptId = e.target.getAttribute('data-dept');
        const role = e.target.getAttribute('data-role');
        const val = e.target.value.trim();
        
        try {
            const roleRef = doc(db, `classes/${activeClass}/departments/${deptId}/roles`, role);
            await setDoc(roleRef, { studentName: val }, { merge: true });
            
            // 시각적 피드백
            e.target.style.borderColor = 'var(--success)';
            e.target.style.boxShadow = '0 0 5px var(--success)';
            setTimeout(() => {
                e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                e.target.style.boxShadow = 'none';
            }, 1000);
        } catch (error) {
            console.error(error);
            alert("저장 실패");
        }
    }
});

// 부서 삭제 버튼 클릭 이벤트 (이벤트 위임)
document.getElementById('td-dept-list').addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-delete-dept')) {
        const deptId = e.target.getAttribute('data-id');
        if (confirm(`정말로 [${deptId}] 부서를 완전히 삭제하시겠습니까?\\n(배치된 명단과 진행 내역이 모두 삭제됩니다)`)) {
            try {
                await deleteDoc(doc(db, `classes/${activeClass}/departments`, deptId));
                alert('부서가 삭제되었습니다.');
            } catch (error) {
                console.error(error);
                alert("부서 삭제에 실패했습니다.");
            }
        }
    }
});

// 기본 6개 부서 생성 버튼
document.getElementById('btn-init-depts')?.addEventListener('click', async () => {
    try {
        const promises = DEFAULT_DEPTS.map(dept => 
            setDoc(doc(db, `classes/${activeClass}/departments`, dept.name), {
                name: dept.name,
                currentStage: 0,
                createdAt: Date.now()
            }, { merge: true })
        );
        await Promise.all(promises);
        alert('기본 6개 부서가 생성되었습니다.');
    } catch (e) {
        console.error(e);
        alert('부서 생성 실패');
    }
});

// 새 부서 추가 버튼
document.getElementById('btn-add-team')?.addEventListener('click', async () => {
    const deptName = prompt('새로운 부서 이름을 입력하세요:');
    if (!deptName || !deptName.trim()) return;
    
    try {
        await setDoc(doc(db, `classes/${activeClass}/departments`, deptName.trim()), {
            name: deptName.trim(),
            currentStage: 1,
            createdAt: Date.now()
        }, { merge: true });
    } catch (e) {
        console.error(e);
        alert('부서 추가 실패');
    }
});

// 학생 명패(Pill) 생성 함수
function createRosterPill(line) {
    const container = document.getElementById('roster-pills');
    const pill = document.createElement('div');
    pill.className = 'roster-pill';
    pill.textContent = line;
    pill.draggable = true;
    pill.style.cssText = 'background: var(--accent-gold); color: black; padding: 0.4rem 0.8rem; border-radius: 20px; font-weight: bold; cursor: grab; user-select: none; font-size: 0.9rem; transition: transform 0.1s;';
    
    pill.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', line);
        pill.style.opacity = '0.5';
        window.draggedStudent = line;
        window.draggedStudentElement = pill;
    });
    pill.addEventListener('dragend', () => {
        pill.style.opacity = '1';
        window.draggedStudent = null;
        window.draggedStudentElement = null;
    });
    
    // 클릭 투 인풋 선택
    pill.addEventListener('click', () => {
        document.querySelectorAll('.roster-pill').forEach(p => p.style.boxShadow = 'none');
        pill.style.boxShadow = '0 0 0 3px white';
        window.selectedStudentPill = line;
        window.selectedStudentElement = pill;
    });
    
    container.appendChild(pill);
}

// 학생 명단 파싱 및 Pill 생성
document.getElementById('btn-parse-roster')?.addEventListener('click', () => {
    const text = document.getElementById('roster-input').value;
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const container = document.getElementById('roster-pills');
    container.innerHTML = '';
    
    if(lines.length === 0) {
        container.innerHTML = '<span style="color:#aaa;">입력된 명단이 없습니다.</span>';
        return;
    }
    
    lines.forEach(createRosterPill);
});

// 자동 배치 로직 공통 함수
function autoAssign(randomize) {
    const pills = Array.from(document.querySelectorAll('.roster-pill'));
    const inputs = Array.from(document.querySelectorAll('.member-input')).filter(input => !input.value); // 빈 칸만 찾기
    
    if (pills.length === 0) return alert('명단을 먼저 적용해주세요!');
    if (inputs.length === 0) return alert('배치할 빈 자리가 없습니다. 부서를 추가하거나 빈칸을 만들어주세요.');
    
    let students = pills.map(p => p.textContent);
    
    if (randomize) {
        // 배열 셔플 (Fisher-Yates)
        for (let i = students.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [students[i], students[j]] = [students[j], students[i]];
        }
    }
    
    let assignedCount = 0;
    for (let i = 0; i < Math.min(students.length, inputs.length); i++) {
        inputs[i].value = students[i];
        inputs[i].dispatchEvent(new Event('change', { bubbles: true }));
        pills[i].remove(); // 대기칸에서 제거
        assignedCount++;
    }
    
    alert(`총 ${assignedCount}명의 학생이 빈칸에 배치 완료되었습니다!`);
}

document.getElementById('btn-auto-assign-seq')?.addEventListener('click', () => autoAssign(false));
document.getElementById('btn-auto-assign-rand')?.addEventListener('click', () => autoAssign(true));

// td-dept-list 드래그 앤 드롭 및 클릭 투 인풋 지원
const deptListContainer = document.getElementById('td-dept-list');
deptListContainer.addEventListener('dragstart', (e) => {
    if (e.target.classList.contains('member-input')) {
        if (!e.target.value) {
            e.preventDefault();
            return;
        }
        e.dataTransfer.setData('text/plain', e.target.value);
        window.draggedSourceInput = e.target;
        e.dataTransfer.effectAllowed = 'move';
    }
});
deptListContainer.addEventListener('dragend', (e) => {
    if (e.target.classList.contains('member-input')) {
        window.draggedSourceInput = null;
    }
});
deptListContainer.addEventListener('dragover', (e) => {
    if (e.target.classList.contains('member-input')) {
        e.preventDefault();
        e.target.style.borderColor = 'var(--accent-gold)';
    }
});
deptListContainer.addEventListener('dragleave', (e) => {
    if (e.target.classList.contains('member-input')) {
        e.target.style.borderColor = 'rgba(255,255,255,0.1)';
    }
});
deptListContainer.addEventListener('drop', (e) => {
    if (e.target.classList.contains('member-input')) {
        e.preventDefault();
        e.target.style.borderColor = 'rgba(255,255,255,0.1)';
        const data = e.dataTransfer.getData('text/plain');
        if (data) {
            if (window.draggedSourceInput && window.draggedSourceInput !== e.target) {
                // Input -> Input
                if (e.ctrlKey) {
                    // 복사 (스왑하지 않고 덮어쓰기)
                    if (e.target.value) {
                        createRosterPill(e.target.value);
                    }
                    e.target.value = data;
                    e.target.dispatchEvent(new Event('change', { bubbles: true }));
                } else {
                    // 스왑
                    const temp = e.target.value;
                    e.target.value = data;
                    window.draggedSourceInput.value = temp;
                    e.target.dispatchEvent(new Event('change', { bubbles: true }));
                    window.draggedSourceInput.dispatchEvent(new Event('change', { bubbles: true }));
                }
                window.draggedSourceInput = null;
            } else if (window.draggedStudentElement) {
                // Roster -> Input
                if (e.target.value) {
                    createRosterPill(e.target.value);
                }
                e.target.value = data;
                e.target.dispatchEvent(new Event('change', { bubbles: true }));
                
                if (!e.ctrlKey) { // Ctrl 누르고 드래그 시 명단에서 삭제하지 않음 (복제)
                    window.draggedStudentElement.remove();
                }
                window.draggedStudentElement = null;
            }
        }
    }
});
deptListContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('member-input') && window.selectedStudentPill) {
        if (e.target.value) {
            createRosterPill(e.target.value);
        }
        e.target.value = window.selectedStudentPill;
        e.target.dispatchEvent(new Event('change', { bubbles: true }));
        
        if (window.selectedStudentElement && !e.ctrlKey) { // Ctrl 누르고 클릭 시 명단에서 삭제하지 않음 (다중 배치)
            window.selectedStudentElement.remove();
            window.selectedStudentElement = null;
            window.selectedStudentPill = null;
        }
    }
});
deptListContainer.addEventListener('dblclick', (e) => {
    if (e.target.classList.contains('member-input') && e.target.value) {
        createRosterPill(e.target.value);
        e.target.value = '';
        e.target.dispatchEvent(new Event('change', { bubbles: true }));
    }
});

// 대기칸 Drop 이벤트 (Input -> Roster)
const rosterArea = document.getElementById('roster-pills');
rosterArea.addEventListener('dragover', (e) => e.preventDefault());
rosterArea.addEventListener('drop', (e) => {
    e.preventDefault();
    if (window.draggedSourceInput) {
        const val = window.draggedSourceInput.value;
        if (val) {
            createRosterPill(val);
            window.draggedSourceInput.value = '';
            window.draggedSourceInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        window.draggedSourceInput = null;
    }
});

// 완전 삭제 쓰레기통
const trashDropzone = document.getElementById('trash-dropzone');
trashDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    trashDropzone.style.background = 'rgba(255, 71, 87, 0.3)';
});
trashDropzone.addEventListener('dragleave', (e) => {
    trashDropzone.style.background = 'rgba(255, 71, 87, 0.1)';
});
trashDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    trashDropzone.style.background = 'rgba(255, 71, 87, 0.1)';
    if (window.draggedSourceInput) {
        window.draggedSourceInput.value = '';
        window.draggedSourceInput.dispatchEvent(new Event('change', { bubbles: true }));
        window.draggedSourceInput = null;
    } else if (window.draggedStudentElement) {
        window.draggedStudentElement.remove();
        window.draggedStudentElement = null;
    }
});

// 배치 전체 초기화 버튼
document.getElementById('btn-reset-assign')?.addEventListener('click', () => {
    if (!confirm('정말로 배치된 모든 명단을 초기화하시겠습니까?\\n배치된 학생들은 모두 대기칸으로 돌아갑니다.')) return;
    const inputs = document.querySelectorAll('.member-input');
    inputs.forEach(input => {
        if (input.value) {
            createRosterPill(input.value);
            input.value = '';
            input.dispatchEvent(new Event('change', { bubbles: true }));
        }
    });
});

// 전체 명단 완전 삭제 버튼
document.getElementById('btn-clear-all-roster')?.addEventListener('click', () => {
    if (!confirm('정말로 모든 명단을 완전히 삭제하시겠습니까?\\n대기칸의 명단과 조에 배치된 명단이 모두 완전히 삭제됩니다.')) return;
    
    // 1. 대기칸 비우기
    document.getElementById('roster-pills').innerHTML = '';
    document.getElementById('roster-input').value = '';
    
    // 2. 조에 배치된 명단 비우기
    const inputs = document.querySelectorAll('.member-input');
    inputs.forEach(input => {
        if (input.value) {
            input.value = '';
            input.dispatchEvent(new Event('change', { bubbles: true }));
        }
    });
    
    alert('모든 명단이 완전히 삭제되었습니다.');
});

// 배치 확정 및 활동 시작 버튼
document.getElementById('btn-start-activity')?.addEventListener('click', async () => {
    if (!confirm('학생들의 배치를 확정하고 활동을 시작하시겠습니까?\\n(이후 학생들이 기기에서 입장할 수 있습니다)')) return;
    try {
        const ref = doc(db, `classes/${activeClass}/global`, 'state');
        await setDoc(ref, { activityStarted: true }, { merge: true });
        alert('배치 확정 및 활동이 시작되었습니다! 학생들에게 로그인을 안내해주세요.');
    } catch(e) {
        console.error(e);
        alert('활동 시작 상태 업데이트에 실패했습니다.');
    }
});

// 2. 실시간 현황판 (상태 탭)
function renderStatusTab() {
    const container = document.getElementById('td-progress-board');
    container.innerHTML = '<p>실시간 데이터를 불러오는 중...</p>';
    
    const deptsRef = collection(db, `classes/${activeClass}/departments`);
    const unsub = onSnapshot(deptsRef, (snapshot) => {
        container.innerHTML = '';
        if (snapshot.empty) {
            container.innerHTML = '<p>현재 진행 중인 부서 데이터가 없습니다.</p>';
            return;
        }

        let totalEnvScore = 0;
        let maxPossibleScore = snapshot.size * 100; // 부서당 최대 100점이라 가정

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            totalEnvScore += (data.envScore || 0);
            
            const stage = data.currentStage || 0;
            const progressPercent = Math.min((stage / 7) * 100, 100); // 7단계를 끝으로 가정 (0~7)

            const trackHtml = `
                <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 1rem; position: relative;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <h4 style="margin: 0; color: var(--accent-gold); font-size: 1.1rem;">${data.name || docSnap.id}</h4>
                        <span style="font-size: 0.85rem; background: rgba(255,255,255,0.1); padding: 2px 8px; border-radius: 10px;">Stage ${stage}</span>
                    </div>
                    
                    <!-- 트랙 배경 -->
                    <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.2); border-radius: 3px; position: relative; margin-top: 1.5rem;">
                        <!-- 진행 바 -->
                        <div style="height: 100%; width: ${progressPercent}%; background: var(--accent-gold); border-radius: 3px; transition: width 0.5s;"></div>
                        
                        <!-- 러너(아이콘) - 윈도우 기본 이모지가 왼쪽을 보므로 좌우 반전 -->
                        <div style="position: absolute; top: -15px; left: ${progressPercent}%; transform: translateX(-50%) scaleX(-1); transition: left 0.5s; font-size: 1.5rem; display: inline-block;">
                            🏃
                        </div>
                        
                        <!-- 주요 지점 마커 -->
                        <div style="position: absolute; top: -4px; left: 0%; width: 14px; height: 14px; background: #333; border: 2px solid #fff; border-radius: 50%; transform: translateX(-50%);" title="Start"></div>
                        <div style="position: absolute; top: -4px; left: 100%; width: 14px; height: 14px; background: #333; border: 2px solid var(--accent-gold); border-radius: 50%; transform: translateX(-50%);" title="Finish"></div>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', trackHtml);
        });
        
        // 환경 게이지 업데이트
        if (maxPossibleScore > 0) {
            let envPercent = Math.min(Math.round((totalEnvScore / maxPossibleScore) * 100), 100);
            document.getElementById('env-score-text').textContent = `${envPercent}%`;
            document.getElementById('env-score-bar').style.width = `${envPercent}%`;
            
            const msgEl = document.getElementById('env-score-msg');
            if (envPercent >= 70) {
                msgEl.textContent = "대성공! 우리 회사가 진정한 친환경 브랜드로 거듭나고 있습니다! 🎉";
                msgEl.style.color = "#2ecc71";
            } else if (envPercent >= 30) {
                msgEl.textContent = "런칭쇼는 무사히 진행되겠지만, 강태오 대표의 방식이 일부 남아있습니다. 분발하세요! ⚠️";
                msgEl.style.color = "#f1c40f";
            } else {
                msgEl.textContent = "위험합니다. 이대로라면 회사는 결국 강태오 대표의 비윤리적 방식으로 되돌아갑니다. 🚨";
                msgEl.style.color = "#e74c3c";
            }
        }

        updateForcePassSelect(snapshot);
    });
    unsubscribes.push(unsub);
}

function updateForcePassSelect(snapshot) {
    const select = document.getElementById('force-pass-select');
    if (!select) return;
    select.innerHTML = '<option value="">부서 선택...</option>';
    snapshot.forEach(docSnap => {
        const opt = document.createElement('option');
        opt.value = docSnap.id;
        opt.textContent = `${docSnap.id} (Stage ${docSnap.data().currentStage || 1})`;
        select.appendChild(opt);
    });
}

// 3. 학생 결과물 확인
function renderResultsTab() {
    const container = document.getElementById('td-results-gallery');
    container.innerHTML = '<p style="color: var(--text-muted); padding: 1rem;">결과물 데이터를 불러오는 중입니다...</p>';
    
    const deptsRef = collection(db, `classes/${activeClass}/departments`);
    
    const unsub = onSnapshot(deptsRef, async (snapshot) => {
        if (snapshot.empty) {
            container.innerHTML = '<p style="color: var(--text-muted); padding: 1rem;">현재 반에 데이터가 없습니다.</p>';
            return;
        }

        container.innerHTML = '';
        const grid = document.createElement('div');
        grid.className = 'grid-layout';

        for (const docSnap of snapshot.docs) {
            const deptId = docSnap.id;
            
            // 실천적 추론 데이터 가져오기
            const reasoningRef = collection(db, `classes/${activeClass}/departments/${deptId}/reasoning`);
            const reasoningSnap = await getDocs(reasoningRef);
            let reasoningHtml = '';
            if (!reasoningSnap.empty) {
                reasoningHtml = '<div style="margin-bottom: 1rem; padding: 1rem; background: rgba(0,0,0,0.3); border-radius: 8px; border: 1px dashed var(--accent-gold);">';
                reasoningHtml += '<h4 style="margin: 0 0 0.5rem 0; color: var(--accent-gold);">🗣️ 팀 실천적 추론 결과</h4>';
                reasoningSnap.forEach(rDoc => {
                    reasoningHtml += `<p style="font-size: 0.85rem; color: #ddd; margin-bottom: 0.3rem;"><strong>${rDoc.id}:</strong> ${rDoc.data().summary || '-'}</p>`;
                });
                reasoningHtml += '</div>';
            }

            // 역할별 디자인 및 소감 가져오기
            const rolesRef = collection(db, `classes/${activeClass}/departments/${deptId}/roles`);
            const rolesSnap = await getDocs(rolesRef);
            
            rolesSnap.forEach(roleDoc => {
                const roleId = roleDoc.id;
                const data = roleDoc.data();
                
                // 제출한 항목이 있는 경우만 표시 (디자인 또는 소감)
                if ((data.personalDesign && data.personalDesign.designImage) || data.reflection) {
                    const studentName = data.studentName ? data.studentName : '이름 미상';
                    const card = document.createElement('div');
                    card.className = 'dept-card';
                    
                    let innerHtml = `
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                            <h3 style="margin: 0; color: var(--accent-gold); font-size: 1.1rem;">${deptId} - ${roleId}</h3>
                            <span style="font-size: 0.8rem; background: rgba(255,255,255,0.1); padding: 2px 8px; border-radius: 10px;">${studentName}</span>
                        </div>
                    `;
                    
                    // 팀 추론 결과는 '부장' 카드에만 렌더링하거나 모든 카드 상단에 배치 (모든 카드에 넣으면 중복이므로 부장에게만)
                    if (roleId === '부장' && reasoningHtml) {
                        innerHtml += reasoningHtml;
                    }

                    if (data.personalDesign && data.personalDesign.designImage) {
                        innerHtml += `
                            <img src="${data.personalDesign.designImage}" style="width: 100%; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); margin-bottom: 1rem;">
                            <div style="font-size: 0.85rem; color: #ddd; line-height: 1.4; margin-bottom: 1rem;">
                                <p><strong style="color:var(--accent-blue)">TPO:</strong> ${data.personalDesign.tpo || '-'}</p>
                                <p><strong style="color:var(--success)">5R:</strong> ${data.personalDesign.r5 || '-'}</p>
                                <p><strong style="color:var(--accent-gold)">이유:</strong> ${data.personalDesign.reason || '-'}</p>
                            </div>
                        `;
                    }
                    
                    if (data.reflection) {
                        innerHtml += `
                            <div style="font-size: 0.85rem; padding: 0.8rem; background: rgba(255,255,255,0.05); border-left: 3px solid var(--success); border-radius: 4px;">
                                <p style="margin-bottom: 0.5rem;"><strong style="color:#aaa;">기억에 남는 순간:</strong><br>${data.reflection.q1 || '-'}</p>
                                <p><strong style="color:#aaa;">실천하고 싶은 점:</strong><br>${data.reflection.q2 || '-'}</p>
                            </div>
                        `;
                    }

                    if (data.personalDesign && data.personalDesign.designImage) {
                        innerHtml += `<button onclick="downloadImage('${data.personalDesign.designImage}', '${deptId}_${roleId}_${studentName}.png')" style="width:100%; padding: 0.5rem; margin-top: 1rem; border-radius: 8px; border: none; background: var(--accent-gold); color: black; font-weight: bold; cursor: pointer;">이미지 다운로드</button>`;
                    }
                    
                    card.innerHTML = innerHtml;
                    grid.appendChild(card);
                }
            });
        }
        
        if (grid.children.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); padding: 1rem;">아직 제출된 결과물이 없습니다.</p>';
        } else {
            container.appendChild(grid);
        }
    });
    unsubscribes.push(unsub);
}

// 글로벌 공간에 다운로드 함수 노출
window.downloadImage = function(dataUrl, filename) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};

// 4. 강력 제어 탭
function renderControlTab() {
    // 이벤트 리스너가 중복 등록되지 않도록 기존 리스너 제거 방식 대신 onclick 사용 (안전)
    const btnForcePass = document.getElementById('btn-force-pass');
    if(btnForcePass) btnForcePass.onclick = async () => {
        const select = document.getElementById('force-pass-select');
        const deptId = select.value;
        if (!deptId) return alert('부서를 선택하세요.');
        
        try {
            const ref = doc(db, `classes/${activeClass}/departments`, deptId);
            const snap = await getDoc(ref);
            if (snap.exists()) {
                const stage = snap.data().currentStage || 1;
                await updateDoc(ref, { currentStage: stage + 1 });
                alert(`${deptId} 부서를 강제로 Stage ${stage + 1}로 넘겼습니다.`);
            }
        } catch(e) {
            console.error(e);
            alert("오류 발생");
        }
    };

    const btnSendNotice = document.getElementById('btn-send-notice');
    if(btnSendNotice) btnSendNotice.onclick = async () => {
        const msg = document.getElementById('notice-input').value.trim();
        if (!msg) return;
        
        try {
            const ref = doc(db, `classes/${activeClass}/global`, 'notice');
            await setDoc(ref, { message: msg, timestamp: Date.now() });
            alert('공지가 전송되었습니다.');
            document.getElementById('notice-input').value = '';
        } catch(e) {
            console.error(e);
            alert("전송 실패");
        }
    };
    
    const btnToggleFreeze = document.getElementById('btn-toggle-freeze');
    let isFrozen = false;
    if(btnToggleFreeze) btnToggleFreeze.onclick = async () => {
        isFrozen = !isFrozen;
        try {
            const ref = doc(db, `classes/${activeClass}/global`, 'state');
            await setDoc(ref, { freeze: isFrozen }, { merge: true });
            btnToggleFreeze.textContent = isFrozen ? '얼음 해제' : '얼음 활성화';
            btnToggleFreeze.className = isFrozen ? 'btn-success' : 'btn-danger';
        } catch(e) {
            console.error(e);
        }
    };
    
    const btnResetAllRoles = document.getElementById('btn-reset-all-roles');
    if(btnResetAllRoles) btnResetAllRoles.onclick = async () => {
        if(confirm(`정말 [${activeClass}] 반의 모든 직급(역할) 선택을 초기화하시겠습니까?\n부서는 그대로 유지되며, 학생들이 다시 역할을 선택할 수 있습니다.`)) {
            try {
                const deptsRef = collection(db, `classes/${activeClass}/departments`);
                const snap = await getDocs(deptsRef);
                const roles = ['인턴', '사원', '차장', '부장'];
                
                snap.forEach(async (docSnap) => {
                    for (const role of roles) {
                        const roleRef = doc(db, `classes/${activeClass}/departments/${docSnap.id}/roles`, role);
                        await setDoc(roleRef, { 
                            taken: false,
                            stage1Confirmed: false,
                            stage4Confirmed: false,
                            stage2Ready: false
                        });
                    }
                });
                alert(`[${activeClass}] 반의 모든 직급 선택이 해제되었습니다.`);
            } catch(e) {
                console.error(e);
                alert("직급 초기화 실패");
            }
        }
    };

    const btnResetClass = document.getElementById('btn-reset-class');
    if(btnResetClass) btnResetClass.onclick = async () => {
        if(confirm(`정말 [${activeClass}] 반의 모든 데이터를 삭제하시겠습니까? 복구할 수 없습니다!`)) {
            try {
                // 부서 목록 가져오기
                const deptsRef = collection(db, `classes/${activeClass}/departments`);
                const snap = await getDocs(deptsRef);
                
                // 순회하며 삭제
                snap.forEach(async (docSnap) => {
                    await deleteDoc(doc(db, `classes/${activeClass}/departments`, docSnap.id));
                });
                
                // 전역 상태 초기화 (활동 시작, 얼음 등)
                await setDoc(doc(db, `classes/${activeClass}/global`, 'state'), { freeze: false, activityStarted: false });
                
                alert(`[${activeClass}] 반 초기화가 완료되었습니다.`);
            } catch(e) {
                console.error(e);
                alert("초기화 실패");
            }
        }
    };
}

// ==========================================
// 5. 원단 QR 관리 탭
// ==========================================
function renderFabricTab() {
    // 게임 URL 자동 감지
    const urlInput = document.getElementById('game-url-input');
    if (urlInput && !urlInput.value) {
        // dashboard.html이 있는 경로에서 index.html로 URL 자동 설정
        const baseUrl = window.location.href.replace(/dashboard\.html.*$/, 'index.html');
        urlInput.value = baseUrl + '?qr=true';
    }

    // 부서별 비번 입력칸 동적 생성 (Firebase에서 부서 목록 로드)
    loadDeptQrPasswords();
    // 원단 조각 실시간 현황 구독
    watchFabricPieces();
}

// QR 생성 버튼
document.getElementById('btn-gen-qr')?.addEventListener('click', async () => {
    const urlInput = document.getElementById('game-url-input');
    const gameUrl = urlInput?.value.trim();
    if (!gameUrl) return alert('게임 URL을 확인해주세요.');

    const grid = document.getElementById('qr-cards-grid');
    const container = document.getElementById('qr-cards-container');
    grid.innerHTML = '<p style="color:#aaa; text-align:center; padding:1rem;">⏳ 부서 목록과 QR 코드를 생성하는 중...</p>';
    container.style.display = 'block';

    try {
        const deptsRef = collection(db, `classes/${activeClass}/departments`);
        const deptSnap = await getDocs(deptsRef);

        // 현재 저장된 비번도 함께 로드
        const qrConfigSnap = await getDoc(doc(db, `classes/${activeClass}/global`, 'qrConfig'));
        const savedPws = (qrConfigSnap.exists() && qrConfigSnap.data().deptPasswords) 
            ? qrConfigSnap.data().deptPasswords : {};

        if (deptSnap.empty) {
            grid.innerHTML = '<p style="color:#e74c3c; text-align:center; padding:1rem;">⚠️ 부서가 없습니다. 먼저 부서를 생성해주세요.</p>';
            return;
        }

        grid.innerHTML = '';
        const colors = ['#d4af37', '#3498db', '#e74c3c', '#2ecc71', '#9b59b6', '#e67e22'];
        let idx = 0;

        deptSnap.forEach(docSnap => {
            const deptId = docSnap.id;
            const deptName = docSnap.data().name || deptId;
            const pw = savedPws[deptId] || '(미설정)';
            const color = colors[idx % colors.length];
            idx++;

            // QR 카드 div
            const card = document.createElement('div');
            card.style.cssText = `
                background: white;
                border-radius: 12px;
                padding: 1.2rem;
                text-align: center;
                border: 3px solid ${color};
                color: #111;
                font-family: 'Noto Sans KR', sans-serif;
            `;

            // 타이틀
            const title = document.createElement('div');
            title.style.cssText = `font-weight: bold; font-size: 1rem; color: ${color}; margin-bottom: 0.3rem;`;
            title.textContent = '🧵 ' + deptName;
            card.appendChild(title);

            const subtitle = document.createElement('div');
            subtitle.style.cssText = 'font-size: 0.75rem; color: #666; margin-bottom: 0.8rem;';
            subtitle.textContent = '원단을 찾으면 QR을 스캔하세요!';
            card.appendChild(subtitle);

            // QR 코드 div (qrcodejs가 내부에 canvas/img 생성)
            const qrDiv = document.createElement('div');
            qrDiv.style.cssText = 'display: flex; justify-content: center; margin-bottom: 0.8rem;';
            const qrInner = document.createElement('div');
            qrInner.id = `qr-${deptId}`;
            qrDiv.appendChild(qrInner);
            card.appendChild(qrDiv);

            // QR 생성 (qrcodejs)
            try {
                new QRCode(qrInner, {
                    text: gameUrl,
                    width: 160,
                    height: 160,
                    colorDark: '#000000',
                    colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.M
                });
            } catch(e) {
                qrInner.innerHTML = '<p style="color:red; font-size:0.8rem;">QR 생성 실패</p>';
            }

            // 비번 안내
            const pwBox = document.createElement('div');
            pwBox.style.cssText = `
                background: ${color}22;
                border: 1px solid ${color}88;
                border-radius: 6px;
                padding: 0.4rem 0.8rem;
                font-size: 0.8rem;
                color: #333;
                margin-bottom: 0.4rem;
            `;
            pwBox.innerHTML = `🔑 비밀번호: <strong>${pw}</strong>`;
            card.appendChild(pwBox);

            const note = document.createElement('div');
            note.style.cssText = 'font-size: 0.7rem; color: #aaa;';
            note.textContent = '원단 조각에 이 카드를 붙여주세요';
            card.appendChild(note);

            grid.appendChild(card);
        });

        // 인쇄 버튼 표시
        document.getElementById('btn-print-qr').style.display = '';

    } catch(e) {
        console.error(e);
        grid.innerHTML = `<p style="color:#e74c3c;">❌ 오류: ${e.message}</p>`;
    }
});

// QR 인쇄 버튼
document.getElementById('btn-print-qr')?.addEventListener('click', () => {
    const grid = document.getElementById('qr-cards-grid');
    if (!grid) return;

    const printWin = window.open('', '_blank', 'width=900,height=700');
    printWin.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>원단 QR 카드 인쇄</title>
            <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap" rel="stylesheet">
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { font-family: 'Noto Sans KR', sans-serif; padding: 20px; background: white; }
                h2 { text-align: center; margin-bottom: 20px; font-size: 1.2rem; color: #333; }
                .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
                .card { border: 2px solid #333; border-radius: 12px; padding: 16px; text-align: center; page-break-inside: avoid; }
                .card-title { font-weight: bold; font-size: 1rem; margin-bottom: 4px; }
                .card-sub { font-size: 0.75rem; color: #666; margin-bottom: 10px; }
                .card-qr { display: flex; justify-content: center; margin-bottom: 10px; }
                .card-qr img, .card-qr canvas { width: 140px; height: 140px; }
                .card-pw { background: #f5f5f5; border-radius: 6px; padding: 4px 10px; font-size: 0.8rem; margin-bottom: 4px; }
                .card-note { font-size: 0.7rem; color: #aaa; }
                @media print {
                    body { padding: 10px; }
                    .grid { grid-template-columns: repeat(3, 1fr); }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <h2 class="no-print">🧵 원단 QR 카드 인쇄 미리보기</h2>
            <button class="no-print" onclick="window.print()" style="display:block; margin: 0 auto 20px; padding: 10px 30px; background:#3498db; color:white; border:none; border-radius:8px; font-size:1rem; cursor:pointer; font-family:inherit;">🖨️ 인쇄 시작</button>
            <div class="grid">
                ${grid.innerHTML}
            </div>
        </body>
        </html>
    `);
    printWin.document.close();
    printWin.focus();
});



// 부서 목록 로드 + 각 부서별 비번 입력칸 생성
async function loadDeptQrPasswords() {
    const grid = document.getElementById('qr-dept-pw-grid');
    if (!grid) return;
    grid.innerHTML = '<p style="color:#aaa; grid-column:1/-1;">⏳ 부서 목록 불러오는 중...</p>';

    try {
        const deptsRef = collection(db, `classes/${activeClass}/departments`);
        const deptSnap = await getDocs(deptsRef);

        if (deptSnap.empty) {
            grid.innerHTML = '<p style="color:#aaa; grid-column:1/-1;">⚠️ 생성된 부서가 없습니다. 먼저 "조 편성" 탭에서 부서를 생성해주세요.</p>';
            return;
        }

        // 현재 저장된 부서별 비번 로드
        const qrConfigRef = doc(db, `classes/${activeClass}/global`, 'qrConfig');
        const qrConfigSnap = await getDoc(qrConfigRef);
        const savedPasswords = (qrConfigSnap.exists() && qrConfigSnap.data().deptPasswords) 
            ? qrConfigSnap.data().deptPasswords 
            : {};

        grid.innerHTML = '';

        // 부서 색상 팔레트
        const colors = ['#d4af37', '#3498db', '#e74c3c', '#2ecc71', '#9b59b6', '#e67e22'];
        let colorIdx = 0;

        deptSnap.forEach(docSnap => {
            const deptId = docSnap.id;
            const deptName = docSnap.data().name || deptId;
            const savedPw = savedPasswords[deptId] || '';
            const color = colors[colorIdx % colors.length];
            colorIdx++;

            const card = document.createElement('div');
            card.style.cssText = `
                background: rgba(0,0,0,0.4);
                border: 1px solid ${color}55;
                border-radius: 10px;
                padding: 1rem;
                position: relative;
            `;
            card.innerHTML = `
                <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.75rem;">
                    <span style="width:10px; height:10px; border-radius:50%; background:${color}; flex-shrink:0;"></span>
                    <strong style="color:${color}; font-size:0.9rem;">${deptName}</strong>
                </div>
                <input type="text" 
                    id="qr-pw-${deptId}" 
                    placeholder="비밀번호 입력" 
                    value="${savedPw}"
                    maxlength="20"
                    style="
                        width: 100%; padding: 0.6rem 0.8rem;
                        background: rgba(0,0,0,0.5);
                        color: white;
                        border: 1.5px solid ${color}88;
                        border-radius: 6px;
                        font-size: 1.1rem;
                        text-align: center;
                        letter-spacing: 3px;
                        box-sizing: border-box;
                        margin-bottom: 0.5rem;
                    "
                >
                <div style="font-size:0.75rem; color:#888; text-align:center;">
                    현재: <span id="status-${deptId}" style="color:${savedPw ? '#2ecc71' : '#aaa'};">
                        ${savedPw ? `"${savedPw}"` : '미설정'}
                    </span>
                </div>
            `;
            grid.appendChild(card);
        });

        // 전체 저장 버튼 이벤트
        const btnSaveAll = document.getElementById('btn-save-all-qr-pw');
        if (btnSaveAll) {
            btnSaveAll.onclick = async () => {
                const newPasswords = {};
                deptSnap.forEach(docSnap => {
                    const deptId = docSnap.id;
                    const input = document.getElementById(`qr-pw-${deptId}`);
                    if (input) newPasswords[deptId] = input.value.trim();
                });

                try {
                    await setDoc(doc(db, `classes/${activeClass}/global`, 'qrConfig'), {
                        deptPasswords: newPasswords
                    }, { merge: true });

                    // 상태 라벨 업데이트
                    Object.entries(newPasswords).forEach(([deptId, pw]) => {
                        const statusEl = document.getElementById(`status-${deptId}`);
                        if (statusEl) {
                            statusEl.textContent = pw ? `"${pw}"` : '미설정';
                            statusEl.style.color = pw ? '#2ecc71' : '#aaa';
                        }
                    });

                    // 버튼 피드백
                    btnSaveAll.textContent = '✅ 저장 완료!';
                    btnSaveAll.style.background = 'var(--success)';
                    setTimeout(() => {
                        btnSaveAll.textContent = '💾 전체 저장';
                        btnSaveAll.style.background = '';
                    }, 2000);
                } catch(e) {
                    console.error(e);
                    alert('저장 실패: ' + e.message);
                }
            };
        }

    } catch(e) {
        console.error('부서 목록 로드 실패:', e);
        grid.innerHTML = '<p style="color:#e74c3c; grid-column:1/-1;">❌ 부서 목록 로드 실패: ' + e.message + '</p>';
    }
}



// 비밀번호 전체 초기화 버튼
document.getElementById('btn-reset-all-qr-pw')?.addEventListener('click', async () => {
    if (!confirm('모든 부서의 QR 비밀번호를 초기화(빈칸)하시겠습니까?\n(이미 입력된 입력칸도 모두 비워집니다)')) return;
    try {
        await setDoc(doc(db, `classes/${activeClass}/global`, 'qrConfig'), {
            deptPasswords: {}
        }, { merge: true });

        // 입력칸 및 상태 라벨 초기화
        document.querySelectorAll('[id^="qr-pw-"]').forEach(input => {
            input.value = '';
        });
        document.querySelectorAll('[id^="status-"]').forEach(el => {
            el.textContent = '미설정';
            el.style.color = '#aaa';
        });

        // 버튼 피드백
        const btn = document.getElementById('btn-reset-all-qr-pw');
        if (btn) {
            btn.textContent = '✅ 초기화 완료';
            setTimeout(() => { btn.textContent = '🗑️ 비번 초기화'; }, 2000);
        }
    } catch(e) {
        console.error(e);
        alert('초기화 실패: ' + e.message);
    }
});

// 원단 조각 초기화 버튼
document.getElementById('btn-reset-fabric')?.addEventListener('click', async () => {
    if (!confirm('모든 부서의 원단 조각 수집 현황을 초기화하시겠습니까?')) return;
    const btn = document.getElementById('btn-reset-fabric');
    if (btn) { btn.textContent = '⏳ 초기화 중...'; btn.disabled = true; }
    try {
        const deptsRef = collection(db, `classes/${activeClass}/departments`);
        const snap = await getDocs(deptsRef);
        const promises = [];
        const depts = [];
        snap.forEach(docSnap => {
            depts.push({ id: docSnap.id, name: docSnap.data().name || docSnap.id });
            const pieceRef = doc(db, `classes/${activeClass}/pieces`, docSnap.id);
            promises.push(setDoc(pieceRef, { unlocked: false })); // merge 없이 완전 덮어쓰기
        });
        await Promise.all(promises);

        // ⚡ onSnapshot은 departments 변화만 감지하므로 수동으로 UI 갱신
        const pieceStates = depts.map(d => ({ ...d, unlocked: false }));
        const total = depts.length;
        document.getElementById('fabric-count-badge').textContent = `0 / ${total}`;
        const completeMsg = document.getElementById('fabric-complete-msg');
        if (completeMsg) completeMsg.classList.add('hidden');
        renderFabricPuzzle(pieceStates, total);
        renderFabricDeptList(pieceStates);

        if (btn) { btn.textContent = '✅ 초기화 완료'; }
        setTimeout(() => {
            if (btn) { btn.textContent = '🔄 조각 수집 초기화'; btn.disabled = false; }
        }, 2000);
    } catch(e) {
        console.error(e);
        alert('초기화 실패: ' + e.message);
        if (btn) { btn.textContent = '🔄 조각 수집 초기화'; btn.disabled = false; }
    }
});


// 원단 조각 실시간 구독 및 퍼즐 뷰어 렌더링
function watchFabricPieces() {
    const deptsRef = collection(db, `classes/${activeClass}/departments`);
    const unsub = onSnapshot(deptsRef, async (deptSnap) => {
        if (deptSnap.empty) return;

        const depts = [];
        deptSnap.forEach(d => depts.push({ id: d.id, name: d.data().name || d.id }));
        const total = depts.length;

        // 각 부서의 조각 상태 병렬 조회 (app.js와 동일한 경로)
        const pieceStates = await Promise.all(depts.map(async (dept) => {
            try {
                const pieceRef = doc(db, `classes/${activeClass}/pieces`, dept.id);
                const pieceSnap = await getDoc(pieceRef);
                return { ...dept, unlocked: pieceSnap.exists() && pieceSnap.data().unlocked };
            } catch(e) {
                return { ...dept, unlocked: false };
            }
        }));

        const unlockedCount = pieceStates.filter(p => p.unlocked).length;

        // 카운트 배지 업데이트
        document.getElementById('fabric-count-badge').textContent = `${unlockedCount} / ${total}`;

        // 완성 메시지
        const completeMsg = document.getElementById('fabric-complete-msg');
        if (unlockedCount === total && total > 0) {
            completeMsg.classList.remove('hidden');
        } else {
            completeMsg.classList.add('hidden');
        }

        // 원단 퍼즐 뷰어 렌더링
        renderFabricPuzzle(pieceStates, total);

        // 부서별 조각 상태 목록 렌더링
        renderFabricDeptList(pieceStates);
    });
    unsubscribes.push(unsub);
}

function renderFabricPuzzle(pieceStates, total) {
    const viewer = document.getElementById('fabric-puzzle-viewer');
    if (!viewer) return;
    viewer.innerHTML = '';

    if (total === 0) {
        viewer.innerHTML = '<p style="color:#aaa; text-align:center; padding:2rem;">부서가 생성되면 원단이 표시됩니다.</p>';
        return;
    }

    // 원단 이미지를 total등분하여 CSS로 각 슬롯 표시
    // 2행 배치: 3개이하는 1행, 4~6개는 2행
    const cols = total <= 3 ? total : Math.ceil(total / 2);
    const rows = total <= 3 ? 1 : 2;

    viewer.style.display = 'grid';
    viewer.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    viewer.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    viewer.style.gap = '2px';

    pieceStates.forEach((piece, idx) => {
        const slot = document.createElement('div');
        slot.style.cssText = `
            position: relative;
            overflow: hidden;
            transition: all 0.8s ease;
            background: ${piece.unlocked ? 'transparent' : 'rgba(30,30,50,0.9)'};
        `;

        if (piece.unlocked) {
            // 원단 이미지의 해당 영역만 표시
            const colIdx = idx % cols;
            const rowIdx = Math.floor(idx / cols);
            const bgXPercent = total <= 1 ? 0 : (colIdx / (cols - 1)) * 100;
            const bgYPercent = rows <= 1 ? 0 : (rowIdx / (rows - 1)) * 100;

            // background-size와 position으로 이미지 등분
            slot.style.backgroundImage = "url('조각 원단.png')";
            slot.style.backgroundSize = `${cols * 100}% ${rows * 100}%`;
            slot.style.backgroundPosition = `${bgXPercent}% ${bgYPercent}%`;
            slot.style.backgroundRepeat = 'no-repeat';

            // 반짝임 효과
            const shine = document.createElement('div');
            shine.style.cssText = `
                position: absolute; inset: 0;
                background: linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%);
                animation: fabricShine 2s ease-in-out infinite alternate;
                pointer-events: none;
            `;
            slot.appendChild(shine);

            // 부서명 라벨
            const label = document.createElement('div');
            label.style.cssText = `
                position: absolute; bottom: 0; left: 0; right: 0;
                background: rgba(0,0,0,0.6);
                color: #fff; font-size: 0.7rem; text-align: center;
                padding: 3px; font-weight: bold;
            `;
            label.textContent = '✅ ' + piece.name;
            slot.appendChild(label);
        } else {
            // 잠긴 슬롯 - 어둡고 물음표 표시
            slot.innerHTML = `
                <div style="
                    width: 100%; height: 100%;
                    display: flex; flex-direction: column;
                    align-items: center; justify-content: center;
                    background: repeating-linear-gradient(
                        45deg,
                        rgba(255,255,255,0.02) 0px,
                        rgba(255,255,255,0.02) 10px,
                        rgba(0,0,0,0.1) 10px,
                        rgba(0,0,0,0.1) 20px
                    );
                    border: 1px dashed rgba(255,255,255,0.1);
                ">
                    <span style="font-size: 1.5rem; opacity: 0.4;">🧵</span>
                    <span style="font-size: 0.65rem; color: rgba(255,255,255,0.4); margin-top: 4px; text-align:center; padding: 0 4px;">${piece.name}</span>
                </div>
            `;
        }

        viewer.appendChild(slot);
    });
}

function renderFabricDeptList(pieceStates) {
    const container = document.getElementById('fabric-dept-list');
    if (!container) return;
    container.innerHTML = '';

    pieceStates.forEach(piece => {
        const card = document.createElement('div');
        card.style.cssText = `
            padding: 1rem;
            border-radius: 8px;
            border: 1px solid ${piece.unlocked ? '#2ecc71' : 'rgba(255,255,255,0.1)'};
            background: ${piece.unlocked ? 'rgba(46,204,113,0.1)' : 'rgba(0,0,0,0.3)'};
            display: flex; align-items: center; gap: 0.75rem;
            transition: all 0.5s;
        `;
        card.innerHTML = `
            <span style="font-size: 1.5rem;">${piece.unlocked ? '✅' : '⏳'}</span>
            <div>
                <div style="font-weight: bold; color: ${piece.unlocked ? '#2ecc71' : 'white'}; font-size: 0.9rem;">${piece.name}</div>
                <div style="font-size: 0.75rem; color: #aaa;">${piece.unlocked ? '조각 수집 완료!' : '아직 찾는 중...'}</div>
            </div>
        `;
        container.appendChild(card);
    });
}

// initDashboard에 renderFabricTab 추가 (탭 활성화 시 호출)
const origInitDashboard = initDashboard;

// 탭 클릭 시 fabric 탭 초기화
document.querySelectorAll('.nav-item').forEach(tab => {
    tab.addEventListener('click', () => {
        if (tab.getAttribute('data-tab') === 'fabric') {
            // 약간의 딜레이 후 렌더 (DOM 준비 대기)
            setTimeout(renderFabricTab, 100);
        }
    });
});

// CSS 애니메이션 추가
const styleEl = document.createElement('style');
styleEl.textContent = `
    @keyframes fabricShine {
        0% { opacity: 0.3; }
        100% { opacity: 0.6; }
    }
    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
    }
`;
document.head.appendChild(styleEl);

// 최초 실행
loadGlobalConfig();

