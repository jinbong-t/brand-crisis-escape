import { db, collection, doc, setDoc, getDoc, runTransaction, updateDoc, onSnapshot } from './firebase-config.js';
import { PUZZLE_DATA } from './puzzle-data.js';

// DOM 요소
const deptGrid = document.getElementById('dept-grid');
const deptSelection = document.getElementById('department-selection');
const roleSelection = document.getElementById('role-selection');
const selectedDeptName = document.getElementById('selected-dept-name');
const roleCards = document.querySelectorAll('.role-card');
const btnBackToDept = document.getElementById('btn-back-to-dept');
const mainHeader = document.getElementById('main-header');
const currentTeamDisplay = document.getElementById('current-team-display');

// 관리자 모드 DOM
const adminToggleBtn = document.getElementById('admin-toggle-btn');
const adminModal = document.getElementById('admin-modal');
const closeAdminModal = document.getElementById('close-admin-modal');
const adminPinInput = document.getElementById('admin-pin-input');
const btnVerifyPin = document.getElementById('btn-verify-pin');
const pinErrorMsg = document.getElementById('pin-error-msg');
const pinEntrySection = document.getElementById('pin-entry-section');
const adminDashboardSection = document.getElementById('admin-dashboard-section');
const adminDeptList = document.getElementById('admin-dept-list');
const newDeptName = document.getElementById('admin-new-dept');
const btnAddDept = document.getElementById('btn-add-dept');
const btnResetDepts = document.getElementById('btn-reset-depts');

// Splash / Screen 0 DOM
const screenSplash = document.getElementById('screen-splash');
const btnEnterGame = document.getElementById('btn-enter-game');
const geniusModal = document.getElementById('genius-modal');
const screen0 = document.getElementById('screen-0');
const screen1 = document.getElementById('screen-1');
const introModal = document.getElementById('intro-modal');
const introVideo = document.getElementById('intro-video');
const openingCardsContainer = document.getElementById('opening-cards');
const btnUnlock = document.getElementById('btn-unlock');
const diaryModal = document.getElementById('diary-modal');
const diaryText = document.getElementById('diary-text');
const btnSubmitOpening = document.getElementById('btn-submit-opening');
const openingErrorMsg = document.getElementById('opening-error-msg');

// 상태 관리
let currentDeptId = sessionStorage.getItem('currentDeptId') || null;
let currentDeptName = sessionStorage.getItem('currentDeptName') || null;
let currentRole = sessionStorage.getItem('currentRole') || null;
let adminClickCount = 0;
let adminClickTimer = null;

function saveSessionState() {
    if (currentDeptId) sessionStorage.setItem('currentDeptId', currentDeptId);
    if (currentDeptName) sessionStorage.setItem('currentDeptName', currentDeptName);
    if (currentRole) sessionStorage.setItem('currentRole', currentRole);
}

function clearSessionState() {
    sessionStorage.removeItem('currentDeptId');
    sessionStorage.removeItem('currentDeptName');
    sessionStorage.removeItem('currentRole');
}

// 기본 부서 목록
const DEFAULT_DEPTS = [
    { id: 'dept-1', name: '디자인기획부' },
    { id: 'dept-2', name: '소재개발부' },
    { id: 'dept-3', name: '스타일링부' },
    { id: 'dept-4', name: '생산전략부' },
    { id: 'dept-5', name: '마케팅부' },
    { id: 'dept-6', name: '품질관리부' }
];

// Splash Screen Logic
btnEnterGame.addEventListener('click', () => {
    // 1. 강렬한 팝업 "당신의 부서는 무엇입니까?" 띄우기
    geniusModal.classList.remove('hidden');
    
    // 2. 2.5초 후 팝업과 스플래시 화면 모두 사라지고 Screen 0 등장
    setTimeout(() => {
        geniusModal.classList.add('hidden');
        screenSplash.classList.add('hidden');
        screen0.classList.remove('hidden');
    }, 2500);
});

// 부서 관리
function getDepartments() {
    const saved = localStorage.getItem('rebrand_departments');
    if (saved) return JSON.parse(saved);
    localStorage.setItem('rebrand_departments', JSON.stringify(DEFAULT_DEPTS));
    return DEFAULT_DEPTS;
}

function saveDepartments(depts) {
    localStorage.setItem('rebrand_departments', JSON.stringify(depts));
}

// 화면 렌더링
function renderDeptGrid() {
    const depts = getDepartments();
    deptGrid.innerHTML = '';
    depts.forEach(dept => {
        const div = document.createElement('div');
        div.className = 'dept-card';
        div.innerHTML = `<h3>${dept.name}</h3>`;
        div.addEventListener('click', () => selectDepartment(dept));
        deptGrid.appendChild(div);
    });
}

function renderAdminDeptList() {
    const depts = getDepartments();
    adminDeptList.innerHTML = '';
    depts.forEach(dept => {
        const div = document.createElement('div');
        div.className = 'admin-dept-item';
        div.innerHTML = `
            <span>${dept.name}</span>
            <button class="btn-delete" data-id="${dept.id}">삭제</button>
        `;
        adminDeptList.appendChild(div);
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            const newDepts = getDepartments().filter(d => d.id !== id);
            saveDepartments(newDepts);
            renderAdminDeptList();
            renderDeptGrid();
        });
    });
}

// 부서 선택
async function selectDepartment(dept) {
    currentDeptId = dept.id;
    currentDeptName = dept.name;
    
    selectedDeptName.textContent = dept.name;
    deptSelection.classList.add('hidden');
    roleSelection.classList.remove('hidden');

    // Firestore에서 부서 문서가 없으면 생성
    const deptRef = doc(db, 'departments', currentDeptId);
    const snap = await getDoc(deptRef);
    if (!snap.exists()) {
        await setDoc(deptRef, {
            name: currentDeptName,
            currentStage: 0,
            startTime: Date.now()
        }, { merge: true });
    }

    saveSessionState();
    checkRoleAvailability();
}

// 직급 활성화 상태 확인
async function checkRoleAvailability() {
    roleCards.forEach(async (card) => {
        const role = card.getAttribute('data-role');
        const roleRef = doc(db, `departments/${currentDeptId}/roles`, role);
        const snap = await getDoc(roleRef);
        
        if (snap.exists() && snap.data().taken) {
            card.disabled = true;
            card.innerHTML = `<h3>${role}</h3><p>(선택 완료)</p>`;
        } else {
            card.disabled = false;
            card.innerHTML = `<h3>${role}</h3><p>${getRoleDesc(role)}</p>`;
        }
    });
}

function getRoleDesc(role) {
    switch(role) {
        case '인턴': return '직접적인 단서 탐색';
        case '사원': return '자료 해석 및 분석';
        case '차장': return '핵심 개념 도출';
        case '부장': return '종합 판단 및 제출';
    }
}

// 직급 선택 (트랜잭션)
roleCards.forEach(card => {
    card.addEventListener('click', async () => {
        if (card.disabled) return;
        const role = card.getAttribute('data-role');
        
        try {
            const roleRef = doc(db, `departments/${currentDeptId}/roles`, role);
            await runTransaction(db, async (transaction) => {
                const docSnap = await transaction.get(roleRef);
                if (docSnap.exists() && docSnap.data().taken) {
                    throw "이미 선택된 직급입니다.";
                }
                transaction.set(roleRef, { taken: true, timestamp: Date.now() });
            });
            
            // 성공
            currentRole = role;
            saveSessionState();
            alert(`${role} 직급으로 시작합니다!`);
            
            // 다이어리 넘기는(페이지 턴) 애니메이션으로 화면 전환
            screen0.classList.add('page-turn-out');
            setTimeout(() => {
                screen0.classList.add('hidden');
                screen0.classList.remove('page-turn-out');
                
                screen1.classList.remove('hidden');
                screen1.classList.add('page-turn-in');
                setTimeout(() => screen1.classList.remove('page-turn-in'), 800);
                
                startScreen1(); // 화면 1(오프닝) 셋팅
            }, 800);
            
        } catch (e) {
            alert(e);
            checkRoleAvailability(); // 상태 갱신
        }
    });
});

// 뒤로가기
btnBackToDept.addEventListener('click', () => {
    currentDeptId = null;
    currentDeptName = null;
    currentRole = null;
    clearSessionState();
    roleSelection.classList.add('hidden');
    deptSelection.classList.remove('hidden');
});

// 역할 변경 (로그아웃 - 데이터 유지)
const btnLogoutRole = document.getElementById('btn-logout-role');
if (btnLogoutRole) {
    btnLogoutRole.addEventListener('click', () => {
        if (confirm("현재 역할에서 로그아웃하시겠습니까? (팀원들의 기안 기록은 DB에 그대로 보존됩니다!)")) {
            currentRole = null;
            sessionStorage.removeItem('currentRole');
            location.reload();
        }
    });
}

// 관리자 모드 로직 (5번 클릭 시 활성화)
adminToggleBtn.addEventListener('click', () => {
    adminClickCount++;
    if (adminClickCount >= 5) {
        adminModal.classList.remove('hidden');
        pinEntrySection.classList.remove('hidden');
        adminDashboardSection.classList.add('hidden');
        adminPinInput.value = '';
        pinErrorMsg.classList.add('hidden');
        adminClickCount = 0;
    }
    clearTimeout(adminClickTimer);
    adminClickTimer = setTimeout(() => { adminClickCount = 0; }, 2000);
});

closeAdminModal.addEventListener('click', () => {
    adminModal.classList.add('hidden');
});

btnVerifyPin.addEventListener('click', () => {
    if (adminPinInput.value === '1234') {
        pinEntrySection.classList.add('hidden');
        adminDashboardSection.classList.remove('hidden');
        renderAdminDeptList();
    } else {
        pinErrorMsg.classList.remove('hidden');
    }
});

btnAddDept.addEventListener('click', () => {
    const name = newDeptName.value.trim();
    if (name) {
        const depts = getDepartments();
        const newId = 'dept-' + Date.now();
        depts.push({ id: newId, name: name });
        saveDepartments(depts);
        newDeptName.value = '';
        renderAdminDeptList();
        renderDeptGrid();
    }
});

btnResetDepts.addEventListener('click', async () => {
    if (confirm("정말 모든 부서 데이터와 직급 선택 기록을 초기화하시겠습니까? (되돌릴 수 없습니다!)")) {
        // Firebase 직급 선택 상태 초기화
        const depts = getDepartments();
        const roles = ['인턴', '사원', '차장', '부장'];
        for (const dept of depts) {
            for (const role of roles) {
                try {
                    await setDoc(doc(db, `departments/${dept.id}/roles`, role), { taken: false });
                } catch(e) { console.error(e); }
            }
        }
        
        localStorage.removeItem('rebrand_departments');
        clearSessionState();
        currentDeptId = null;
        currentRole = null;
        
        alert("초기화되었습니다.");
        location.reload();
    }
});

// 페이지 스킵 로직
const skipButtons = document.querySelectorAll('.btn-skip');
skipButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
        const targetStage = parseInt(btn.getAttribute('data-target'));
        
        if (!currentDeptId || !currentRole) {
            const forceTest = confirm("현재 선택된 부서나 직급이 없습니다! 테스트용 '테스트부서-부장' 권한으로 강제 입장하시겠습니까?");
            if (forceTest) {
                currentDeptId = 'test-dept-' + Date.now(); // 임시 부서 생성
                currentDeptName = '테스트부서';
                currentRole = '부장';
                saveSessionState();
            } else {
                return;
            }
        }
        
        if (confirm(`${targetStage}단계로 강제 이동하시겠습니까?`)) {
            try {
                // 부서 문서가 없으면 임시 생성
                await setDoc(doc(db, 'departments', currentDeptId), {
                    name: currentDeptName,
                    currentStage: targetStage,
                    startTime: Date.now()
                }, { merge: true });
                
                // 모달 닫기
                adminModal.classList.add('hidden');
                
                // 모든 화면 숨기기
                document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
                
                if (targetStage === 0) {
                    screen1.classList.remove('hidden');
                    startScreen1();
                } else if (targetStage === 1) {
                    document.getElementById('screen-2').classList.remove('hidden');
                    startScreen2();
                } else if (targetStage === 2) {
                    document.getElementById('screen-3').classList.remove('hidden');
                    startScreen3();
                } else if (targetStage === 3) {
                    document.getElementById('screen-4').classList.remove('hidden');
                    startScreen4();
                } else {
                    alert(`${targetStage}단계 화면은 아직 공사 중입니다! 뚝딱뚝딱 🛠️`);
                }
                
            } catch(e) {
                console.error(e);
            }
        }
    });
});

// ==========================================
// Screen 1: 오프닝 로직
// ==========================================
let introParagraphs = [];
let currentIntroIndex = 0;

function startScreen1() {
    mainHeader.classList.remove('hidden');
    currentTeamDisplay.textContent = `${currentDeptName} - ${currentRole}`;

    // 인트로 스토리 문단별 렌더링
    introParagraphs = PUZZLE_DATA.opening.introText.split('<br><br>');
    currentIntroIndex = 0;
    const container = document.getElementById('intro-text-container');
    container.innerHTML = `<p style="margin-bottom: 1rem; animation: fadeIn 0.5s;">${introParagraphs[0]}</p>`;
    
    const btnNext = document.getElementById('btn-intro-next');
    const btnClose = document.getElementById('close-intro-modal');
    
    btnNext.classList.remove('hidden');
    btnClose.classList.add('hidden');
    
    btnNext.onclick = () => {
        currentIntroIndex++;
        if (currentIntroIndex < introParagraphs.length) {
            const p = document.createElement('p');
            p.style.marginBottom = '1rem';
            p.style.animation = 'fadeIn 0.5s';
            p.innerHTML = introParagraphs[currentIntroIndex];
            container.appendChild(p);
            
            // 컨테이너 스크롤 맨 아래로
            container.parentElement.scrollTop = container.parentElement.scrollHeight;
            
            if (currentIntroIndex === introParagraphs.length - 1) {
                btnNext.classList.add('hidden');
                btnClose.classList.remove('hidden');
            }
        }
    };

    introModal.classList.remove('hidden');
    
    // 영상 자동 재생 시도
    if (introVideo) {
        introVideo.play().catch(e => console.log("자동 재생 방지됨", e));
    }

    renderOpeningCards();
}

document.getElementById('close-intro-modal').addEventListener('click', () => {
    introModal.classList.add('hidden');
    if (introVideo) {
        introVideo.pause();
    }
});

function renderOpeningCards() {
    openingCardsContainer.innerHTML = '';
    // 초기에는 무작위로 섞어서 배치
    const shuffledCards = [...PUZZLE_DATA.opening.cards].sort(() => Math.random() - 0.5);
    
    shuffledCards.forEach(cardData => {
        const card = document.createElement('div');
        card.className = 'flip-card';
        card.setAttribute('draggable', 'true');
        card.dataset.id = cardData.id;
        card.dataset.back = cardData.back;

        // 어질러진 느낌을 위해 약간의 랜덤 회전과 오프셋 부여
        const randomRot = (Math.random() - 0.5) * 30; // -15도 ~ +15도
        const randomY = (Math.random() - 0.5) * 20;   // -10px ~ +10px
        card.style.transform = `rotate(${randomRot}deg) translateY(${randomY}px)`;
        
        card.innerHTML = `
            <div class="flip-card-inner">
                <div class="flip-card-front" style="background-image: url('splash_bg.png'); background-size: cover; background-position: center; border: 2px solid var(--accent-gold);">
                    <!-- 앞면은 숨겨진 상태 -->
                    <span style="background: rgba(0,0,0,0.7); padding: 5px; border-radius: 4px; font-weight: bold; color: white;">조사 카드</span>
                </div>
                <div class="flip-card-back" style="display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 1rem;">
                    <span style="font-size: 0.85rem; font-family: 'Noto Sans KR'; font-weight: 500; word-break: keep-all; line-height: 1.5; color: var(--text-main);">${cardData.text}</span>
                    <!-- 숫자는 화면에 보여주지 않고 오직 정렬 순서 체크용으로만 사용합니다 -->
                </div>
            </div>
        `;

        // 뒤집기 이벤트
        card.addEventListener('click', () => {
            card.classList.toggle('flipped');
            checkUnlockCondition();
        });

        // 드래그 앤 드롭 이벤트
        card.addEventListener('dragstart', (e) => {
            card.classList.add('dragging');
        });
        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
            checkUnlockCondition();
        });

        openingCardsContainer.appendChild(card);
    });

    // 컨테이너 드래그 정렬 로직
    openingCardsContainer.addEventListener('dragover', e => {
        e.preventDefault();
        const afterElement = getDragAfterElement(openingCardsContainer, e.clientX);
        const dragging = document.querySelector('.dragging');
        if (afterElement == null) {
            openingCardsContainer.appendChild(dragging);
        } else {
            openingCardsContainer.insertBefore(dragging, afterElement);
        }
    });

    // 모바일 터치(드래그) 지원
    let touchDragging = null;
    openingCardsContainer.addEventListener('touchstart', e => {
        if (e.target.closest('.flip-card')) {
            touchDragging = e.target.closest('.flip-card');
            // 터치 시작 시 바로 뒤집히지 않도록 약간의 딜레이
            setTimeout(() => { if (touchDragging) touchDragging.classList.add('dragging'); }, 100);
        }
    });
    openingCardsContainer.addEventListener('touchmove', e => {
        if (!touchDragging) return;
        e.preventDefault();
        const touch = e.touches[0];
        const afterElement = getDragAfterElement(openingCardsContainer, touch.clientX);
        if (afterElement == null) {
            openingCardsContainer.appendChild(touchDragging);
        } else {
            openingCardsContainer.insertBefore(touchDragging, afterElement);
        }
    });
    openingCardsContainer.addEventListener('touchend', e => {
        if (touchDragging) {
            touchDragging.classList.remove('dragging');
            touchDragging = null;
            checkUnlockCondition();
        }
    });
}

// 드래그 위치 계산 함수
function getDragAfterElement(container, x) {
    const draggableElements = [...container.querySelectorAll('.flip-card:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = x - box.left - box.width / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// 잠금 해제 조건 검사 (모두 뒤집힘 + 순서 1,2,3,4)
function checkUnlockCondition() {
    const cards = [...openingCardsContainer.querySelectorAll('.flip-card')];
    const isAllFlipped = cards.every(c => c.classList.contains('flipped'));
    
    // 현재 순서 가져오기
    const currentOrder = cards.map(c => c.dataset.back).join('');
    
    if (isAllFlipped && currentOrder === '1234') {
        btnUnlock.disabled = false;
        btnUnlock.classList.add('pulse'); // 나중에 CSS 추가 가능
    } else {
        btnUnlock.disabled = true;
        btnUnlock.classList.remove('pulse');
    }
}

// 잠금 해제 버튼 클릭
btnUnlock.addEventListener('click', () => {
    diaryText.textContent = PUZZLE_DATA.opening.diaryText;
    diaryModal.classList.remove('hidden');
});

// 다이어리 답 제출
btnSubmitOpening.addEventListener('click', async () => {
    const selected = document.querySelector('input[name="flow-type"]:checked');
    if (!selected) {
        alert('답을 선택해주세요.');
        return;
    }

    if (selected.value === PUZZLE_DATA.opening.answer) {
        // 정답 시
        openingErrorMsg.classList.add('hidden');
        diaryModal.classList.add('hidden');
        alert('정답입니다! 1단계로 이동합니다.');
        
        // 상태 업데이트
        try {
            await updateDoc(doc(db, 'departments', currentDeptId), {
                currentStage: 1
            });
        } catch(e) { console.error(e); }

        // 1단계 화면으로 전환
        document.getElementById('screen-1').classList.add('hidden');
        document.getElementById('screen-2').classList.remove('hidden');
        startScreen2();
    } else {
        openingErrorMsg.classList.remove('hidden');
    }
});

// ==========================================
// Screen 2: 1단계 (디자인요소실) 로직
// ==========================================
function startScreen2() {
    mainHeader.classList.remove('hidden');
    currentTeamDisplay.textContent = `${currentDeptName} - ${currentRole}`;
    
    document.getElementById('display-current-role').textContent = currentRole;
    
    // 1단계 스토리 모달 띄우기
    document.getElementById('stage1-story-modal').classList.remove('hidden');
    
    document.getElementById('btn-start-stage1-missions').onclick = () => {
        document.getElementById('stage1-story-modal').classList.add('hidden');
    };
    
    // 미션 1-1 (몽타주) 세팅
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
                alert('정답입니다! 다음 미션이 열렸습니다.');
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

    // 미션 1-2 (원단 교집합) 세팅
    const fabricData = PUZZLE_DATA.stage1.fabricStandards[currentRole];
    document.getElementById('fabric-clue-title').textContent = fabricData.title;
    document.getElementById('fabric-clue-text').textContent = fabricData.text;
    
    const btnSubmitM2 = document.getElementById('btn-submit-mission-1-2');
    if (btnSubmitM2) {
        btnSubmitM2.textContent = currentRole === '부장' ? '최종 승인하기' : '부장님께 결재 올리기';
    }
    
    document.querySelectorAll('.fabric-btn').forEach(btn => {
        // 복수 선택 가능하도록 토글
        btn.onclick = () => btn.classList.toggle('selected');
    });

    document.getElementById('btn-submit-mission-1-2').onclick = () => {
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
            alert(currentRole === '부장' ? '정답입니다! 완벽한 원단을 골라 최종 승인하셨습니다!' : '정답입니다! 부장님께 기안을 무사히 상신했습니다!');
            document.getElementById('btn-submit-mission-1-2').disabled = true;
            document.getElementById('btn-submit-mission-1-2').textContent = currentRole === '부장' ? '최종 승인 완료' : '결재 요청 완료 (기안 상신)';
            document.querySelectorAll('.fabric-btn').forEach(b => b.disabled = true);
            
            const m3 = document.getElementById('mission-1-3');
            if (m3) {
                m3.classList.remove('hidden');
                m3.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        } else {
            alert('틀렸습니다. 성분표와 조건을 다시 한번 꼼꼼히 확인하세요.');
        }
    };

    // 미션 1-3 (실천적 추론) 세팅
    const reasoningData = PUZZLE_DATA.stage1.reasoning;
    document.getElementById('reasoning-context').innerHTML = reasoningData.context.replace(/\n/g, '<br>');
    document.getElementById('reasoning-role-label').textContent = reasoningData.roleLabels[currentRole];

    if (currentRole === '부장') {
        document.getElementById('manager-montage-panel').classList.remove('hidden');
        document.getElementById('manager-submit-panel').classList.remove('hidden');
        document.getElementById('btn-stage1-confirm-all').style.display = 'none'; // 부장은 전체 제출 창 이용
        
        // 부장 전용 실시간 팀원 현황 모니터링
        onSnapshot(collection(db, `departments/${currentDeptId}/roles`), (snapshot) => {
            let allConfirmed = true;
            const requiredRoles = ['인턴', '사원', '차장'];
            
            requiredRoles.forEach(role => {
                const statusEl = document.getElementById(`status-${role}`);
                if (!statusEl) return;
                
                const roleDoc = snapshot.docs.find(d => d.id === role);
                const isConfirmed = roleDoc && roleDoc.data().stage1Confirmed;
                const reasoningText = roleDoc ? roleDoc.data().reasoning : "";
                
                const reasoningDisplay = statusEl.querySelector('.reasoning-display');
                if (isConfirmed) {
                    statusEl.classList.add('done');
                    statusEl.querySelector('.status-icon').textContent = '✅';
                    if (reasoningDisplay && reasoningText) {
                        reasoningDisplay.textContent = `"${reasoningText}"`;
                        reasoningDisplay.style.display = 'block';
                    }
                } else {
                    statusEl.classList.remove('done');
                    statusEl.querySelector('.status-icon').textContent = '❌';
                    if (reasoningDisplay) reasoningDisplay.style.display = 'none';
                    allConfirmed = false;
                }
            });
            
            document.getElementById('btn-submit-stage1').disabled = !allConfirmed;
        });
        
        // 부장 전용 최종 제출 버튼
        const btnSubmitStage1 = document.getElementById('btn-submit-stage1');
        btnSubmitStage1.onclick = async () => {
            const finalAnswer1 = document.getElementById('manager-final-answer-1').value;
            const finalAnswer2 = document.getElementById('manager-final-answer-2').value;
            const errorMsg = document.getElementById('manager-error-msg');
            
            if (!finalAnswer1 || !finalAnswer2) {
                alert('미션 1(몽타주)과 미션 2(친환경)의 최종 정답을 모두 선택해주세요.');
                return;
            }
            
            if (finalAnswer1 === 'B' && finalAnswer2 === 'H') {
                errorMsg.classList.add('hidden');
                btnSubmitStage1.disabled = true;
                btnSubmitStage1.textContent = '최종 승인 완료 (1단계 클리어)';
                
                // Firestore를 먼저 업데이트하여 팀원들의 화면이 넘어가게 함
                try {
                    await updateDoc(doc(db, 'departments', currentDeptId), {
                        currentStage: 2
                    });
                    
                    alert('🎉 축하합니다! 모든 팀원의 의견을 종합하여 진짜 도안과 원단을 완벽하게 찾아냈습니다! (1단계 클리어)\n\n2단계 방(패턴/봉제실)으로 자동 이동합니다!');
                } catch(e) {
                    console.error(e);
                }
                
            } else {
                errorMsg.classList.remove('hidden');
                errorMsg.textContent = '오답입니다! 팀원들이 모아온 단서(교집합)를 다시 한번 분석해보세요.';
            }
        };
    } else {
        document.getElementById('manager-montage-panel').classList.add('hidden');
        document.getElementById('manager-submit-panel').classList.add('hidden');
        
        const btnConfirmAll = document.getElementById('btn-stage1-confirm-all');
        if (btnConfirmAll) {
            btnConfirmAll.onclick = async () => {
                const textarea = document.getElementById('reasoning-textarea');
                if (textarea.value.trim().length < 5) {
                    alert('의견을 조금 더 상세히 적어서 기안해주세요.');
                    return;
                }
                
                try {
                    const roleRef = doc(db, `departments/${currentDeptId}/roles`, currentRole);
                    await updateDoc(roleRef, { stage1Confirmed: true, reasoning: textarea.value });
                    
                    alert('부장님께 최종 기안(결재 요청)을 무사히 넘겼습니다! 부장님이 모두의 의견을 취합해 최종 승인할 때까지 대기해주세요.');
                    btnConfirmAll.disabled = true;
                    btnConfirmAll.textContent = '기안 상신 완료 (부장 승인 대기 중...)';
                    textarea.disabled = true;
                } catch(e) {
                    console.error(e);
                    alert('기안 상신 중 오류가 발생했습니다.');
                }
            };
        }
    }
}

// ==========================================
// Screen 3: 2단계 (패턴/봉제실) 로직
// ==========================================
function startScreen3() {
    mainHeader.classList.remove('hidden');
    currentTeamDisplay.textContent = `${currentDeptName} - ${currentRole}`;
    
    document.getElementById('display-current-role-stage2').textContent = currentRole;
    
    // 2단계 스토리 모달 띄우기
    const storyModal = document.getElementById('stage2-story-modal');
    storyModal.classList.remove('hidden');
    
    document.getElementById('stage2-intro-text').innerText = PUZZLE_DATA.stage2.intro;
    
    document.getElementById('btn-start-stage2-missions').onclick = () => {
        storyModal.classList.add('hidden');
    };
    
    const puzzleData = PUZZLE_DATA.stage2.puzzles[currentRole];
    
    if (currentRole === '부장') {
        document.getElementById('stage2-employee-panel').classList.add('hidden');
        document.getElementById('stage2-manager-panel').classList.remove('hidden');
        
        // 부장 현황판 리스너
        onSnapshot(collection(db, `departments/${currentDeptId}/roles`), (snapshot) => {
            const roles = ['인턴', '사원', '차장'];
            let allConfirmed = true;
            
            roles.forEach(role => {
                const statusEl = document.getElementById(`status-stage2-${role}`);
                if (!statusEl) return;
                
                const roleDoc = snapshot.docs.find(d => d.id === role);
                const isConfirmed = roleDoc && roleDoc.data().stage2Confirmed;
                
                if (isConfirmed) {
                    statusEl.classList.add('done');
                    statusEl.querySelector('.status-icon').textContent = '✅';
                    statusEl.style.background = 'rgba(0,100,0,0.5)';
                } else {
                    statusEl.classList.remove('done');
                    statusEl.querySelector('.status-icon').textContent = '❌';
                    statusEl.style.background = 'rgba(0,0,0,0.5)';
                    allConfirmed = false;
                }
            });
            
            document.getElementById('btn-submit-stage2').disabled = !allConfirmed;
        });
        
        // 부장 금고 가동 버튼
        document.getElementById('btn-submit-stage2').onclick = async () => {
            const pw = document.getElementById('manager-vault-pw').value;
            if (pw === PUZZLE_DATA.stage2.puzzles['부장'].answer) {
                document.getElementById('manager-error-msg-stage2').classList.add('hidden');
                
                // Firestore를 먼저 업데이트하여 다른 팀원들의 화면이 넘어가게 함
                try {
                    await updateDoc(doc(db, 'departments', currentDeptId), {
                        currentStage: 3
                    });
                    
                    alert("🎉 공장 가동 완료! 2단계 탈출 성공!\n\n(3단계 스타일링실로 이동합니다.)");
                } catch(e) {
                    console.error(e);
                }
            } else {
                document.getElementById('manager-error-msg-stage2').classList.remove('hidden');
            }
        };
        
    } else {
        // 사원/인턴/차장
        document.getElementById('stage2-employee-panel').classList.remove('hidden');
        document.getElementById('stage2-manager-panel').classList.add('hidden');
        
        document.getElementById('stage2-puzzle-title').textContent = puzzleData.title;
        document.getElementById('stage2-puzzle-text').textContent = puzzleData.text;
        document.getElementById('stage2-puzzle-hint').textContent = `힌트: ${puzzleData.hint}`;
        
        const btnSubmit = document.getElementById('btn-stage2-submit');
        const input = document.getElementById('stage2-answer-input');
        
        btnSubmit.onclick = async () => {
            if (input.value === puzzleData.answer) {
                alert(`정답입니다! 당신이 찾은 숫자는 [ ${puzzleData.answer} ] 입니다.\n부장님에게 이 숫자를 순서대로 알려주세요!`);
                btnSubmit.disabled = true;
                btnSubmit.textContent = "해독 완료 (대기 중)";
                input.disabled = true;
                
                // Firebase 업데이트
                try {
                    await setDoc(doc(db, `departments/${currentDeptId}/roles`, currentRole), {
                        stage2Confirmed: true,
                        stage2Answer: puzzleData.answer
                    }, { merge: true });
                } catch(e) {
                    console.error(e);
                }
                
            } else {
                alert("비밀번호가 틀렸습니다. 힌트를 다시 읽어보세요!");
            }
        };
    }
}

// ==========================================
// Screen 4: 3단계 (스타일링실) 로직
// ==========================================
function startScreen4() {
    mainHeader.classList.remove('hidden');
    currentTeamDisplay.textContent = `${currentDeptName} - ${currentRole}`;
    document.getElementById('display-current-role-stage3').textContent = currentRole;
    
    // 모달 띄우기
    const storyModal = document.getElementById('stage3-story-modal');
    storyModal.classList.remove('hidden');
    document.getElementById('stage3-intro-text').innerText = PUZZLE_DATA.stage3.intro;
    
    document.getElementById('btn-start-stage3-missions').onclick = () => {
        storyModal.classList.add('hidden');
    };
    
    const puzzleData = PUZZLE_DATA.stage3.puzzles[currentRole];
    
    if (currentRole === '부장') {
        document.getElementById('stage3-employee-panel').classList.add('hidden');
        document.getElementById('stage3-manager-panel').classList.remove('hidden');
        
        // 부장 현황판 리스너
        onSnapshot(collection(db, `departments/${currentDeptId}/roles`), (snapshot) => {
            const roles = ['인턴', '사원', '차장'];
            roles.forEach(role => {
                const statusEl = document.getElementById(`status-stage3-${role}`);
                if (!statusEl) return;
                
                const roleDoc = snapshot.docs.find(d => d.id === role);
                const isConfirmed = roleDoc && roleDoc.data().stage3Confirmed;
                
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
        });
        
        // 종이인형 드래그 앤 드롭 로직
        const draggables = document.querySelectorAll('.paperdoll-item');
        const dropzone = document.getElementById('avatar-dropzone');
        const btnSubmit = document.getElementById('btn-submit-stage3');
        const errorMsg = document.getElementById('manager-error-msg-stage3');
        
        let selectedItems = {}; // { color: '쿨톤', line: '세로선', ... }
        
        draggables.forEach(item => {
            // 원본 부모 요소 저장 (다시 돌려놓기 위해)
            if (!item.dataset.originalParent) {
                item.dataset.originalParent = item.parentElement.className; // 'shelf-items'
            }
            
            item.addEventListener('dragstart', (e) => {
                item.classList.add('dragging');
                e.dataTransfer.setData('category', item.getAttribute('data-category'));
                e.dataTransfer.setData('val', item.getAttribute('data-val'));
                // 아이템의 DOM ID나 참조를 전달하기 위해 고유 ID 부여
                if (!item.id) item.id = 'item-' + Date.now() + Math.floor(Math.random()*1000);
                e.dataTransfer.setData('itemId', item.id);
            });
            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
            });
        });
        
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault(); // 드롭 허용
            dropzone.classList.add('dragover');
        });
        
        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('dragover');
        });
        
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            
            const category = e.dataTransfer.getData('category');
            const val = e.dataTransfer.getData('val');
            const itemId = e.dataTransfer.getData('itemId');
            
            if (!category || !val || !itemId) return;
            
            const draggedItem = document.getElementById(itemId);
            if (!draggedItem) return;
            
            // 기존에 해당 슬롯에 있던 아이템은 다시 옷장으로 돌려보냄
            const targetSlot = document.getElementById(`slot-${category}`);
            if (targetSlot.children.length > 0) {
                const oldItem = targetSlot.children[0];
                // 옷장의 원래 카테고리 선반 찾기
                const shelves = document.querySelectorAll('.shelf-items');
                // 같은 카테고리를 가진 첫번째 아이템이 있는 선반에 넣거나, 그냥 부모를 찾아 넣어야 하는데 
                // 안전하게 카테고리 라벨로 찾기
                let targetShelf = Array.from(shelves).find(s => s.querySelector(`[data-category="${category}"]`));
                if (!targetShelf && draggedItem.parentElement.classList.contains('shelf-items')) {
                    targetShelf = draggedItem.parentElement; // 방금 드래그해온 곳
                }
                if (targetShelf) {
                    targetShelf.appendChild(oldItem);
                }
            }
            
            // 새 아이템을 슬롯에 부착 (물리적 이동)
            targetSlot.appendChild(draggedItem);
            
            // 기존 오버레이 클래스 제거
            const overlayDiv = document.getElementById(`overlay-${category}`);
            if (selectedItems[category]) {
                overlayDiv.classList.remove(`overlay-${category}-${selectedItems[category]}`);
            }
            
            // 새 오버레이 클래스 추가 (옷 갈아입기 마법 효과)
            overlayDiv.classList.add(`overlay-${category}-${val}`);
            
            // 상태 저장
            selectedItems[category] = val;
            
            // 4개 카테고리가 모두 장착되었는지 확인
            if (Object.keys(selectedItems).length === 4) {
                btnSubmit.disabled = false;
            }
        });
        
        btnSubmit.onclick = () => {
            // 정답 확인: 쿨톤, 세로선, 한색, 작은무늬
            if (selectedItems['color'] === '쿨톤' && 
                selectedItems['line'] === '세로선' && 
                selectedItems['temp'] === '한색' && 
                selectedItems['pattern'] === '작은무늬') {
                
                errorMsg.classList.add('hidden');
                alert("🎉 완벽합니다! 오지수 모델의 체형과 톤을 완벽하게 보완한 스타일링이 완성되었습니다!\n\n(4단계 런칭쇼 대기실로 이동합니다.)");
                btnSubmit.disabled = true;
                
                updateDoc(doc(db, 'departments', currentDeptId), {
                    currentStage: 4
                }).catch(e => console.error(e));
                
            } else {
                errorMsg.classList.remove('hidden');
            }
        };
        
    } else {
        // 사원/인턴/차장
        document.getElementById('stage3-employee-panel').classList.remove('hidden');
        document.getElementById('stage3-manager-panel').classList.add('hidden');
        
        document.getElementById('stage3-puzzle-title').textContent = puzzleData.title;
        document.getElementById('stage3-puzzle-text').textContent = puzzleData.text;
        document.getElementById('stage3-puzzle-hint').textContent = `힌트: ${puzzleData.hint}`;
        
        const btnSubmit = document.getElementById('btn-stage3-submit');
        const input = document.getElementById('stage3-answer-input');
        
        btnSubmit.onclick = async () => {
            if (input.value.replace(/\s+/g, '') === puzzleData.answer) {
                alert(`정확한 단서를 찾았습니다! 당신이 찾은 단서 [ ${puzzleData.answer} ] 를 부장님에게 알려주세요!`);
                btnSubmit.disabled = true;
                btnSubmit.textContent = "전송 완료 (대기 중)";
                input.disabled = true;
                
                // Firebase 업데이트
                try {
                    await setDoc(doc(db, `departments/${currentDeptId}/roles`, currentRole), {
                        stage3Confirmed: true,
                        stage3Answer: puzzleData.answer
                    }, { merge: true });
                } catch(e) {
                    console.error(e);
                }
                
            } else {
                alert("오답입니다. 힌트를 다시 확인해보세요!");
            }
        };
    }
}

// 초기화 함수
async function initApp() {
    renderDeptGrid();
    
    // 세션이 남아있다면 해당 단계로 바로 복구
    if (currentDeptId && currentRole) {
        try {
            // 부서의 currentStage 변경을 실시간으로 감지하여 화면 자동 전환
            onSnapshot(doc(db, 'departments', currentDeptId), (snap) => {
                if (snap.exists()) {
                    const stage = snap.data().currentStage || 0;
                    
                    deptSelection.classList.add('hidden');
                    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
                    
                    if (stage === 0) {
                        screen1.classList.remove('hidden');
                        startScreen1();
                    } else if (stage === 1) {
                        const s2 = document.getElementById('screen-2');
                        if (s2) {
                            s2.classList.remove('hidden');
                            startScreen2();
                        }
                    } else if (stage === 2) {
                        const s3 = document.getElementById('screen-3');
                        if (s3) {
                            s3.classList.remove('hidden');
                            startScreen3();
                        }
                    } else if (stage === 3) {
                        const s4 = document.getElementById('screen-4');
                        if (s4) {
                            s4.classList.remove('hidden');
                            startScreen4();
                        }
                    } else {
                        // 4단계 이상
                        alert(`축하합니다! ${stage}단계에 진입하셨습니다. (화면 준비 중)`);
                    }
                } else {
                    // 파이어베이스에 부서 문서가 없으면(초기화된 경우) 세션 날림
                    clearSessionState();
                    currentDeptId = null;
                    currentRole = null;
                    location.reload();
                }
            });
            
        } catch(e) { 
            console.error(e); 
            clearSessionState();
        }
    }
}

// DEV 테스트용 강제 3단계 버튼 로직
document.getElementById('dev-jump-stage3').onclick = async () => {
    currentDeptId = 'test-dept-' + Date.now();
    currentDeptName = '테스트부서';
    currentRole = '부장';
    saveSessionState();
    
    try {
        await setDoc(doc(db, 'departments', currentDeptId), {
            name: currentDeptName,
            currentStage: 3,
            startTime: Date.now()
        }, { merge: true });
        
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        document.getElementById('screen-4').classList.remove('hidden');
        startScreen4();
    } catch(e) {
        console.error(e);
    }
};

initApp();
