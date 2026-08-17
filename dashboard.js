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
                <h3>${deptName}</h3>
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
                        <h4 style="margin: 0; color: var(--accent-gold); font-size: 1.1rem;">${docSnap.id}</h4>
                        <span style="font-size: 0.85rem; background: rgba(255,255,255,0.1); padding: 2px 8px; border-radius: 10px;">Stage ${stage}</span>
                    </div>
                    
                    <!-- 트랙 배경 -->
                    <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.2); border-radius: 3px; position: relative; margin-top: 1.5rem;">
                        <!-- 진행 바 -->
                        <div style="height: 100%; width: ${progressPercent}%; background: var(--accent-gold); border-radius: 3px; transition: width 0.5s;"></div>
                        
                        <!-- 러너(아이콘) -->
                        <div style="position: absolute; top: -15px; left: ${progressPercent}%; transform: translateX(-50%); transition: left 0.5s; font-size: 1.5rem;">
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

// 최초 실행
loadGlobalConfig();
