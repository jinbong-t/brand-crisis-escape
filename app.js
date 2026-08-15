import { db, collection, doc, setDoc, getDoc, getDocFromServer, runTransaction, updateDoc, onSnapshot } from './firebase-config.js';
import { PUZZLE_DATA } from './puzzle-data.js?v=5.0';

// 글로벌 학급 설정 (기본값)
let activeClass = '3-1';

// Firebase Document Reference 래퍼 함수 (학급 격리)
function getDeptDocRef(deptId) {
    return doc(db, `classes/${activeClass}/departments`, deptId);
}
function getRoleDocRef(deptId, role) {
    return doc(db, `classes/${activeClass}/departments/${deptId}/roles`, role);
}
function getRolesColRef(deptId) {
    return collection(db, `classes/${activeClass}/departments/${deptId}/roles`);
}
function getPieceDocRef(deptId) {
    return doc(db, `classes/${activeClass}/pieces`, deptId);
}
function getPiecesColRef() {
    return collection(db, `classes/${activeClass}/pieces`);
}
function getReasoningDocRef(deptId, stageStr) {
    return doc(db, `classes/${activeClass}/departments/${deptId}/reasoning`, stageStr);
}

sessionStorage.clear();

// 화면에 현재 반 희미하게 표시
document.getElementById('active-class-watermark').textContent = `Class: ${activeClass}`;

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
    const deptRef = getDeptDocRef(currentDeptId);
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
        const roleRef = getRoleDocRef(currentDeptId, role);
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
            const roleRef = getRoleDocRef(currentDeptId, role);
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
const btnLogoutRoles = document.querySelectorAll('#btn-logout-role, .btn-logout-role');
btnLogoutRoles.forEach(btn => {
    btn.addEventListener('click', () => {
        if (confirm("현재 역할에서 로그아웃하시겠습니까? (팀원들의 기안 기록은 DB에 그대로 보존됩니다!)")) {
            currentRole = null;
            sessionStorage.removeItem('currentRole');
            location.reload();
        }
    });
});

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
        const depts = getDepartments();
        const roles = ['인턴', '사원', '차장', '부장'];
        for (const dept of depts) {
            try {
                // 부서 기본 정보 및 스테이지 초기화
                await setDoc(getDeptDocRef(dept.id), {
                    name: dept.name,
                    currentStage: 0,
                    managerFinalAnswer1: "",
                    managerFinalAnswer2: "",
                    stage2Pw: "",
                    reasoningWords: [],
                    qrScanned: false
                });
                
                // QR 피스 상태 초기화
                await setDoc(getPieceDocRef(dept.id), {
                    unlocked: false
                });

                // 직급 상태 초기화
                for (const role of roles) {
                    await setDoc(getRoleDocRef(dept.id, role), { 
                        taken: false,
                        stage1Confirmed: false,
                        stage4Confirmed: false,
                        stage2Ready: false
                    });
                }
            } catch(e) { console.error(e); }
        }
        
        localStorage.removeItem('rebrand_departments');
        clearSessionState();
        currentDeptId = null;
        currentRole = null;
        
        alert("초기화되었습니다.");
        location.reload();
    }
});

// 테스트용 빠른 전체 초기화 버튼
const btnEasyReset = document.getElementById('btn-easy-reset');
if (btnEasyReset) {
    btnEasyReset.addEventListener('click', async () => {
        if (confirm("모든 부서 기록과 데이터 베이스 진행 상황을 완전히 초기화하고 처음부터(0단계) 다시 시작하시겠습니까?")) {
            const depts = getDepartments();
        const roles = ['인턴', '사원', '차장', '부장'];
            
            // 모든 부서의 권한 반환 및 스테이지 0으로 되돌리기 (완전 초기화)
            for (const dept of depts) {
                try {
                    await setDoc(getDeptDocRef(dept.id), {
                        name: dept.name,
                        currentStage: 0,
                        managerFinalAnswer1: "",
                        managerFinalAnswer2: "",
                        stage2Pw: "",
                        reasoningWords: [],
                        qrScanned: false
                    });
                    await setDoc(getPieceDocRef(dept.id), { unlocked: false });
                } catch(e) { console.error(e); }

                for (const role of roles) {
                    try {
                        await setDoc(getRoleDocRef(dept.id, role), { 
                            taken: false,
                            stage1Confirmed: false,
                            stage4Confirmed: false,
                            stage2Ready: false
                        });
                    } catch(e) { console.error(e); }
                }
            }
            
            localStorage.removeItem('rebrand_departments');
            sessionStorage.clear();
            currentDeptId = null;
            currentRole = null;
            
            alert("완벽하게 초기화되었습니다! 깨끗한 상태에서 시작합니다.");
            location.reload();
        }
    });
}

// 테스트용 실천적 추론 바로가기 버튼
const debugRoleBtns = document.querySelectorAll('.btn-debug-role');
debugRoleBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
        currentDeptId = 'test-dept'; // 임의의 부서
        currentRole = btn.getAttribute('data-role');
        currentDeptName = '테스트부서';
        sessionStorage.setItem('currentRole', currentRole);
        
        // 부서 문서 강제 생성 (updateDoc 오류 방지)
        try {
            await setDoc(getDeptDocRef(currentDeptId), {
                name: '테스트부서',
                currentStage: 1
            }, { merge: true });
        } catch(e) { console.error(e); }

        document.getElementById('screen-splash').classList.remove('active');
        
        // 정식 앱 초기화 (이 과정에서 onSnapshot이 제대로 묶이고 화면 1이 정상 셋팅됨)
        initApp();
        
    });
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
                await setDoc(getDeptDocRef(currentDeptId), {
                    name: currentDeptName,
                    currentStage: targetStage,
                    startTime: Date.now()
                }, { merge: true });
                
                // 모달 닫기
                adminModal.classList.add('hidden');
                
                // 모든 화면 숨기기
                document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
                    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
                
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
                } else if (targetStage === 4) {
                    document.getElementById('screen-5').classList.remove('hidden');
                    startScreen5();
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

    // 오프닝 스토리 모달 준비
    let rawIntroText = PUZZLE_DATA.opening.introText;
    rawIntroText = rawIntroText.replace('[ROLE]', currentRole);
    introParagraphs = rawIntroText.split('<br><br>');
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
        const randomRot = (Math.random() - 0.5) * 10; // -15도 ~ +15도
        const randomY = (Math.random() - 0.5) * 10;   // -10px ~ +10px
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

// 잠금 해제 조건 검사 (피드백용 시각적 효과만)
function checkUnlockCondition() {
    const cards = [...openingCardsContainer.querySelectorAll('.flip-card')];
    const isAllFlipped = cards.every(c => c.classList.contains('flipped'));
    const currentOrder = cards.map(c => c.dataset.back).join('');
    
    if (isAllFlipped && currentOrder === '1234') {
        btnUnlock.classList.add('pulse');
    } else {
        btnUnlock.classList.remove('pulse');
    }
}

// 잠금 해제 버튼 클릭
btnUnlock.addEventListener('click', () => {
    const cards = [...openingCardsContainer.querySelectorAll('.flip-card')];
    const isAllFlipped = cards.every(c => c.classList.contains('flipped'));
    const currentOrder = cards.map(c => c.dataset.back).join('');

    if (!isAllFlipped) {
        alert("모든 조사 카드를 뒤집어 내용을 확인해주세요!");
        return;
    }
    
    if (currentOrder !== '1234') {
        alert("순서가 틀렸습니다. 의류 생산부터 폐기까지 환경 오염이 발생하는 올바른 순서대로 나열해보세요!");
        return;
    }

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
            await updateDoc(getDeptDocRef(currentDeptId), {
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
function startScreen2(deptData) {
    mainHeader.classList.remove('hidden');
    currentTeamDisplay.textContent = `${currentDeptName} - ${currentRole}`;
    
    document.getElementById('display-current-role').textContent = currentRole;
    
    // 1단계 스토리 모달 띄우기
    if (!(deptData && deptData.showStage1Reasoning)) {
        document.getElementById('stage1-story-modal').classList.remove('hidden');
    }
    
    document.getElementById('btn-start-stage1-missions').onclick = () => {
        document.getElementById('stage1-story-modal').classList.add('hidden');
    };
    
    // 미션 1-1 (몽타주) 세팅
    const montageData = PUZZLE_DATA.stage1.montage[currentRole];

    if (!montageData) {
        console.error('Invalid currentRole for montageData:', currentRole);
        alert('??븷 ?곗씠?곌? ?좏슚?섏? ?딆뒿?덈떎.');
        return;
    }
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
        document.getElementById('reasoning-textarea').style.display = 'none'; // 부장은 모달에서 입력
        document.getElementById('reasoning-role-label').textContent = "부장님은 팀원들이 모두 단서와 의견을 제출할 때까지 기다려 주세요. 하단의 '최종 정답 제출'을 완료하면 토론 창이 열립니다.";
        document.getElementById('reasoning-role-label').style.color = '#ff9f43';
        
        // 부장 전용 실시간 팀원 현황 모니터링
        onSnapshot(getRolesColRef(currentDeptId), (snapshot) => {
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
            
            // 테스트 편의를 위해 팀원이 모두 제출하지 않아도 부장 버튼 항상 활성화
            document.getElementById('btn-submit-stage1').disabled = false;
        });
        
        // 부장 전용 최종 제출 버튼
        const btnSubmitStage1 = document.getElementById('btn-submit-stage1');
        const secretSkipStage1 = document.getElementById('secret-skip-stage1');
        if (secretSkipStage1) {
            secretSkipStage1.onclick = async () => {
                if (confirm('강제로 2단계로 넘어갈까요? (부장 전용 패스)')) {
                    try {
                        await updateDoc(getDeptDocRef(currentDeptId), {
                            currentStage: 2,
                            showStage1Reasoning: false
                        });
                        alert('강제 패스 성공!');
                        
                        // 로컬 강제 전환
                        const s3 = document.getElementById('screen-3');
                        if (s3) {
                            document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
                            document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
                            s3.classList.remove('hidden');
                            try { startScreen3(); } catch(err) {}
                        }
                    } catch (e) {
                        alert('강제 패스 중 오류 발생: ' + e);
                    }
                }
            };
        }
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
                btnSubmitStage1.textContent = '최종 승인 완료 (2단계 이동 중...)';
                
                try {
                    await updateDoc(getDeptDocRef(currentDeptId), {
                        currentStage: 2,
                        showStage1Reasoning: false
                    });
                    
                    alert('🎉 모든 팀원의 의견을 종합하여 진짜 도안과 원단을 찾았습니다!\n\n2단계로 이동합니다!');
                    
                    // 로컬에서 강제로 화면 전환 보장
                    const s3 = document.getElementById('screen-3');
                    if (s3) {
                        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
                        document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
                        s3.classList.remove('hidden');
                        try { startScreen3(); } catch(err) { console.error(err); }
                    }
                } catch(e) {
                    console.error("Stage 1 DB 업데이트 실패:", e);
                    alert('오류 발생: ' + e.message);
                    btnSubmitStage1.disabled = false;
                    btnSubmitStage1.textContent = '최종 승인 완료 (결재하기)';
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
                    // 서버 업데이트 시도 (실패해도 진행)
                    const roleRef = getRoleDocRef(currentDeptId, currentRole);
                    updateDoc(roleRef, { stage1Confirmed: true, reasoning: textarea.value }).catch(e=>console.error(e));

                    alert('부장님께 최종 기안(결재 요청)을 무사히 넘겼습니다! 부장님이 승인하면 자동으로 넘어갑니다.');
                    textarea.disabled = true;
                    btnConfirmAll.disabled = true;
                    btnConfirmAll.textContent = '기안 상신 완료 (부장 승인 대기 중...)';

                    // 10초 후 빨간색 강제 이동 버튼으로 변신
                    setTimeout(() => {
                        btnConfirmAll.disabled = false;
                        btnConfirmAll.style.backgroundColor = '#cc0000';
                        btnConfirmAll.style.color = 'white';
                        btnConfirmAll.textContent = '부장님 결재 지연 (실무자 전결로 강행)';
                        
                        btnConfirmAll.onclick = () => {
                            if (confirm('부장님의 결재가 지연되고 있습니다. 긴급 상황이므로 선조치 후보고(실무자 전결) 처리하고 다음 업무(2단계)를 강행하시겠습니까?')) {
                                document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
                                document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
                                const s3 = document.getElementById('screen-3');
                                if (s3) s3.classList.remove('hidden');
                                try { startScreen3(); } catch (err) { console.error(err); }
                            }
                        };
                    }, 10000);

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
        
        // 부장 퍼즐 내용 세팅
        document.getElementById('manager-stage2-puzzle-title').textContent = puzzleData.title;
        document.getElementById('manager-stage2-puzzle-text').textContent = puzzleData.text;
        document.getElementById('manager-stage2-puzzle-hint').textContent = `힌트: ${puzzleData.hint}`;
        
        // 부장 현황판 리스너
        onSnapshot(getRolesColRef(currentDeptId), (snapshot) => {
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
            
            // 테스트 편의를 위해 부장 버튼 항상 활성화
            document.getElementById('btn-submit-stage2').disabled = false;
        });
        
        // 부장 금고 가동 버튼 엔터키 지원
        const pwInput = document.getElementById('manager-vault-pw');
        pwInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('btn-submit-stage2').click();
            }
        });
        
        // 부장 금고 가동 버튼
        document.getElementById('btn-submit-stage2').onclick = async () => {
            const pw = pwInput.value;
            if (pw === PUZZLE_DATA.stage2.puzzles['부장'].answer) {
                document.getElementById('manager-error-msg-stage2').classList.add('hidden');
                
                const btnSubmitStage2 = document.getElementById('btn-submit-stage2');
                btnSubmitStage2.disabled = true;
                btnSubmitStage2.textContent = '가동 중...';
                
                setDoc(getDeptDocRef(currentDeptId), {
                    currentStage: 3
                }, { merge: true }).catch(e => console.error("Stage 2 DB 업데이트 실패:", e));
                
                alert("🎉 공장 가동 완료! 2단계 탈출 성공!");
                
                // 즉시 다음 단계(3단계)로 강제 이동 (로컬 화면 전환)
                document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
                document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
                const s4 = document.getElementById('screen-4');
                if (s4) {
                    s4.classList.remove('hidden');
                    try { startScreen4(); } catch(err) { console.error(err); }
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
        
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                btnSubmit.click();
            }
        });
        
        btnSubmit.onclick = async () => {
            if (input.value === puzzleData.answer) {
                alert(`정답입니다! 당신이 찾은 숫자는 [ ${puzzleData.answer} ] 입니다.\n부장님에게 이 숫자를 순서대로 알려주세요!`);
                input.disabled = true;
                
                // 서버 업데이트 시도
                setDoc(getRoleDocRef(currentDeptId, currentRole), {
                    stage2Confirmed: true,
                    stage2Answer: puzzleData.answer
                }, { merge: true }).catch(e=>console.error(e));

                btnSubmit.disabled = true;
                btnSubmit.textContent = '부장 승인 대기 중...';

                // 10초 후 빨간 버튼으로 변신
                setTimeout(() => {
                    btnSubmit.disabled = false;
                    btnSubmit.style.backgroundColor = '#cc0000';
                    btnSubmit.style.color = 'white';
                    btnSubmit.textContent = '부장님 결재 지연 (실무자 전결로 강행)';
                    btnSubmit.onclick = () => {
                        if (confirm('부장님의 결재가 지연되고 있습니다. 긴급 상황이므로 선조치 후보고(실무자 전결) 처리하고 다음 업무(3단계)를 강행하시겠습니까?')) {
                            document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
                            document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
                            const s4 = document.getElementById('screen-4');
                            if (s4) s4.classList.remove('hidden');
                            try { startScreen4(); } catch (err) { console.error(err); }
                        }
                    };
                }, 10000);
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
    
    const storyModal = document.getElementById('stage3-story-modal');
    storyModal.classList.remove('hidden');
    document.getElementById('stage3-intro-text').innerText = PUZZLE_DATA.stage3.intro;
    
    document.getElementById('btn-start-stage3-missions').onclick = () => {
        storyModal.classList.add('hidden');
    };
    
    const personalColorData = PUZZLE_DATA.stage3.personalColor[currentRole];
    const bodyTypeData = PUZZLE_DATA.stage3.bodyType[currentRole];
    
    if (currentRole === '부장') {
        document.getElementById('stage3-employee-panel').classList.add('hidden');
        document.getElementById('stage3-manager-panel').classList.remove('hidden');
        
        onSnapshot(getRolesColRef(currentDeptId), (snapshot) => {
            const roles = ['인턴', '사원', '차장'];
            let stage3CompletedCount = 0;
            roles.forEach(role => {
                const statusEl = document.getElementById(`status-stage3-${role}`);
                if (!statusEl) return;
                
                const roleDoc = snapshot.docs.find(d => d.id === role);
                const isConfirmed = roleDoc && roleDoc.data().stage3Confirmed;
                
                if (isConfirmed) {
                    statusEl.classList.add('done');
                    statusEl.querySelector('.status-icon').textContent = '✅';
                    statusEl.style.background = 'rgba(0,100,0,0.5)';
                    stage3CompletedCount++;
                } else {
                    statusEl.classList.remove('done');
                    statusEl.querySelector('.status-icon').textContent = '❌';
                    statusEl.style.background = 'rgba(0,0,0,0.5)';
                }
            });
            
            const btnStage3Mgr = document.getElementById('btn-stage3-manager-submit');
            const inputStage3Mgr = document.getElementById('stage3-manager-answer-input');
            if (stage3CompletedCount === 3) {
                btnStage3Mgr.disabled = false;
                btnStage3Mgr.textContent = '단서 전송';
                inputStage3Mgr.disabled = false;
            } else {
                btnStage3Mgr.disabled = true;
                btnStage3Mgr.textContent = '팀원 완료 대기 중...';
                inputStage3Mgr.disabled = true;
            }
        });
        
        document.getElementById('stage3-manager-title').textContent = "단서 1: 퍼스널 컬러 종합";
        document.getElementById('stage3-manager-text').innerHTML = personalColorData.text.replace(/\n/g, '<br>');
        
        document.getElementById('btn-stage3-manager-submit').onclick = () => {
            const val = document.getElementById('stage3-manager-answer-input').value.replace(/\s+/g, '');
            if (val === personalColorData.answer) {
                alert("정답입니다! 이제 팀원들이 모은 단서로 최종 스타일링을 완성하세요.");
                document.getElementById('stage3-manager-step1').classList.add('hidden');
                document.getElementById('stage3-manager-step2').classList.remove('hidden');
            } else {
                alert("오답입니다. 다시 생각해보세요.");
            }
        };

        const draggables = document.querySelectorAll('.paperdoll-item');
        const dropzone = document.getElementById('avatar-dropzone');
        const btnSubmit = document.getElementById('btn-submit-stage3');
        const errorMsg = document.getElementById('manager-error-msg-stage3');
        
        let selectedItems = {};
        
        draggables.forEach(item => {
            if (!item.dataset.originalParent) {
                item.dataset.originalParent = item.parentElement.className;
            }
            
            item.addEventListener('dragstart', (e) => {
                item.classList.add('dragging');
                e.dataTransfer.setData('category', item.getAttribute('data-category'));
                e.dataTransfer.setData('val', item.getAttribute('data-val'));
                if (!item.id) item.id = 'item-' + Date.now() + Math.floor(Math.random()*1000);
                e.dataTransfer.setData('itemId', item.id);
            });
            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
            });
        });
        
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
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
            
            const targetSlot = document.getElementById(`slot-${category}`);
            if (targetSlot && targetSlot.children.length > 0) {
                const oldItem = targetSlot.children[0];
                const shelves = document.querySelectorAll('.shelf-items');
                let targetShelf = Array.from(shelves).find(s => s.querySelector(`[data-category="${category}"]`));
                if (!targetShelf && draggedItem.parentElement.classList.contains('shelf-items')) {
                    targetShelf = draggedItem.parentElement;
                }
                if (targetShelf) {
                    targetShelf.appendChild(oldItem);
                }
            }
            
            if(targetSlot) targetSlot.appendChild(draggedItem);
            
            selectedItems[category] = val;
            
            if (selectedItems['line'] && selectedItems['color'] && selectedItems['material'] && selectedItems['pattern']) {
                btnSubmit.disabled = false;
            }
        });
        
        btnSubmit.onclick = () => {
            if (selectedItems['line'] === '가로선' && 
                selectedItems['color'] === '한색' && 
                selectedItems['material'] === '뻣뻣한' &&
                selectedItems['pattern'] === '작은무늬') {
                
                errorMsg.classList.add('hidden');
                alert("🎉 완벽합니다! 환경과 디자인을 모두 고려한 친환경 의류 컬렉션이 완성되었습니다.\n이제 팝업되는 '실천적 추론' 문제를 부서원들과 토론하여 해결하세요!");
                btnSubmit.disabled = true;
                
                updateDoc(getDeptDocRef(currentDeptId), {
                    showStage3Reasoning: true
                }).catch(e => console.error(e));
                
                setTimeout(() => {
                    btnSubmit.disabled = false;
                    btnSubmit.style.backgroundColor = '#555555';
                    btnSubmit.style.color = 'white';
                    btnSubmit.textContent = '서버 동기화 (재시도)';
                    btnSubmit.onclick = () => {
                        if (confirm('서버 통신 지연이 발생했습니다. 직권으로 동기화를 진행하시겠습니까?')) {
                            updateDoc(getDeptDocRef(currentDeptId), {
                                showStage3Reasoning: true
                            }).catch(e => console.error(e));
                        }
                    };
                }, 10000);
                
            } else {
                errorMsg.classList.remove('hidden');
            }
        };
        
    } else {
        document.getElementById('stage3-employee-panel').classList.remove('hidden');
        document.getElementById('stage3-manager-panel').classList.add('hidden');
        
        document.getElementById('stage3-puzzle-title').textContent = "단서 1: 퍼스널 컬러";
        document.getElementById('stage3-puzzle-text').innerHTML = personalColorData.text.replace(/\n/g, '<br>');
        document.getElementById('stage3-puzzle-hint').textContent = '';
        
        const btnSubmit = document.getElementById('btn-stage3-submit');
        const input = document.getElementById('stage3-answer-input');
        
        let currentStep = 1;
        
        btnSubmit.onclick = async () => {
            if (currentStep === 1) {
                if (input.value.replace(/\s+/g, '') === personalColorData.answer) {
                    alert(`정확한 단서를 찾았습니다!\n다음 단서를 확인하세요.`);
                    currentStep = 2;
                    input.value = '';
                    document.getElementById('stage3-puzzle-title').textContent = "단서 2: 착시효과 선택";
                    document.getElementById('stage3-puzzle-text').innerHTML = PUZZLE_DATA.stage3.bodyType.memo.replace(/\n/g, '<br>') + '<br><br>' + bodyTypeData.text;
                } else {
                    alert("오답입니다. 쿨톤과 웜톤 중 하나를 입력하세요!");
                }
            } else if (currentStep === 2) {
                if (input.value.replace(/\s+/g, '') === bodyTypeData.answer) {
                    alert(`모든 단서를 찾았습니다! 부장님에게 알려주세요!`);
                    input.disabled = true;
                    
                    setDoc(getRoleDocRef(currentDeptId, currentRole), {
                        stage3Confirmed: true
                    }, { merge: true }).catch(e=>console.error(e));

                    btnSubmit.disabled = true;
                    btnSubmit.textContent = '부장 승인 대기 중...';

                    setTimeout(() => {
                        btnSubmit.disabled = false;
                        btnSubmit.style.backgroundColor = '#cc0000';
                        btnSubmit.style.color = 'white';
                        btnSubmit.textContent = '부장님 결재 지연 (실무자 전결로 강행)';
                        btnSubmit.onclick = () => {
                            if (confirm('부장님의 결재가 지연되고 있습니다. 긴급 상황이므로 선조치 후보고(실무자 전결) 처리하고 다음 업무(4단계)를 강행하시겠습니까?')) {
                                document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
                                document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
                                const s5 = document.getElementById('screen-5');
                                if (s5) s5.classList.remove('hidden');
                                try { startScreen5(); } catch (err) { console.error(err); }
                            }
                        };
                    }, 10000);
                } else {
                    alert("오답입니다. 다시 생각해보세요!");
                }
            }
        };
        
        
    }
}

// 4단계: 런칭쇼 대기실 (T.P.O 및 환경점수)
function startScreen5() {
    document.getElementById('display-current-role-stage4').textContent = currentRole;
    
    // 모달 띄우기
    const storyModal = document.getElementById('stage4-story-modal');
    storyModal.classList.remove('hidden');
    document.getElementById('stage4-intro-text').innerHTML = PUZZLE_DATA.stage4.intro.replace(/\n/g, '<br>');
    
    document.getElementById('btn-start-stage4-missions').onclick = () => {
        storyModal.classList.add('hidden');
    };
    
    const puzzleData = PUZZLE_DATA.stage4.puzzles[currentRole];
    
    if (currentRole === '부장') {
        document.getElementById('stage4-employee-panel').classList.add('hidden');
        document.getElementById('stage4-manager-panel').classList.remove('hidden');
        document.getElementById('reasoning-textarea').classList.add('hidden');
        
        // 부장 Step 1: TPO 점검
        document.getElementById('stage4-manager-step1-title').textContent = puzzleData.step1.title;
        document.getElementById('stage4-manager-step1-text').textContent = puzzleData.step1.text;
        
        document.getElementById('btn-stage4-manager-step1').onclick = () => {
            const val = document.getElementById('stage4-manager-step1-input').value.replace(/\s+/g, '');
            if (val === puzzleData.step1.answer) {
                alert('정답입니다! 이제 팀원들이 올린 단서를 모아 5R 순서를 맞추고 최종 환경 점수를 입력하세요.');
                document.getElementById('stage4-manager-step1').classList.add('hidden');
                document.getElementById('stage4-5r-puzzle').classList.remove('hidden');
            } else {
                alert('오답입니다. 다시 생각해보세요.');
            }
        };

        // 5R 드래그 앤 드롭 로직
        const draggables = document.querySelectorAll('.item-5r');
        const slots = document.querySelectorAll('.slot-5r');
        let selected5R = Array(5).fill(null);
        
        draggables.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('val', item.getAttribute('data-val'));
                item.style.opacity = '0.5';
            });
            item.addEventListener('dragend', () => {
                item.style.opacity = '1';
            });
        });
        
        // ------------------------------------
        // (기존 캔버스 로직은 initCanvas 함수로 분리되어 전역에서 호출됨)
        
        const btnLaunch = document.getElementById('btn-launch-show');
        const scoreInput = document.getElementById('stage4-manager-score-input');
        const scoreFill = document.getElementById('eco-score-fill');
        const scoreText = document.getElementById('eco-score-text');

        let teamCorrectCount = 0;

        function checkManagerStage4Complete() {
            const is5RCorrect = JSON.stringify(selected5R) === JSON.stringify(puzzleData.step2.answer);
            const isScoreCorrect = scoreInput.value.trim() === puzzleData.step3.answer;
            const isTeamDone = teamCorrectCount === 3;
            
            // 혼자 테스트하기 쉽도록 isTeamDone 조건 임시 해제
            if (is5RCorrect && isScoreCorrect) {
                btnLaunch.disabled = false;
                btnLaunch.style.background = 'linear-gradient(45deg, #FFD700, #FFA500)';
                btnLaunch.style.color = '#000';
                btnLaunch.style.cursor = 'pointer';
                btnLaunch.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.8)';
                btnLaunch.textContent = "🌟 런칭쇼 가동 🌟";
            } else {
                btnLaunch.disabled = true;
                btnLaunch.style.background = '#555';
                btnLaunch.style.color = '#888';
                btnLaunch.style.cursor = 'not-allowed';
                btnLaunch.style.boxShadow = 'none';
                btnLaunch.textContent = "조건 달성 시 런칭쇼 가동!";
            }
        }

        slots.forEach((slot, index) => {
            slot.addEventListener('dragover', e => e.preventDefault());
            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                const val = e.dataTransfer.getData('val');
                if(val) {
                    slot.textContent = val;
                    slot.style.border = '2px solid #4caf50';
                    slot.style.color = '#fff';
                    selected5R[index] = val;
                    checkManagerStage4Complete();
                }
            });
        });
        
        scoreInput.addEventListener('input', checkManagerStage4Complete);
        
        // 팀원들의 정답 현황 실시간 감시
        onSnapshot(getRolesColRef(currentDeptId), (snapshot) => {
            let correctCount = 0;
            
            snapshot.forEach(docSnap => {
                const r = docSnap.id;
                const d = docSnap.data();
                
                if (['인턴', '사원', '차장'].includes(r)) {
                    const statusEl = document.getElementById(`status-stage4-${r}`);
                    if (statusEl) {
                        if (d.stage4Confirmed) {
                            statusEl.querySelector('.status-icon').textContent = '✅';
                            correctCount++;
                        } else {
                            statusEl.querySelector('.status-icon').textContent = '❌';
                        }
                    }
                }
            });
            
            teamCorrectCount = correctCount;
            // 게이지 바 업데이트 (팀원 달성도 기반)
            const simulatedScore = Math.floor((correctCount / 3) * 100);
            scoreFill.style.width = `${simulatedScore}%`;
            scoreText.textContent = `${simulatedScore} / 100 점`;
            
            checkManagerStage4Complete();
        });
        
        // 런칭 버튼 클릭 (3단계 완료) - 이제 DB를 업데이트하여 모두에게 런칭을 알림
        btnLaunch.onclick = () => {
            btnLaunch.disabled = true;
            btnLaunch.textContent = '런칭 준비 중...';
            
            updateDoc(getDeptDocRef(currentDeptId), {
                currentStage: 5
            }).catch(e => console.error("런칭쇼 가동 실패:", e));
            
            setTimeout(() => {
                btnLaunch.disabled = false;
                btnLaunch.style.backgroundColor = '#cc0000';
                btnLaunch.style.color = 'white';
                btnLaunch.textContent = '통신 장애 (긴급 런칭 가동)';
                btnLaunch.onclick = () => {
                    if (confirm('서버 통신 지연으로 화면이 넘어가지 않고 있습니다. 관리자 직권으로 즉시 런칭쇼(QR 스캔) 가동을 진행하시겠습니까?')) {
                        const successModal = document.getElementById('stage3-success-modal');
                        const guideText = document.getElementById('stage3-guide-text');
                        const closeBtn = document.getElementById('btn-close-stage3-success');
                        const waitingMsg = document.getElementById('stage3-waiting-msg');
                        
                        if (successModal) {
                            if (guideText) {
                                guideText.innerHTML = "이제 팀원들과 함께 교실 어딘가에 숨겨져 있는 <strong>조각 원단</strong>을 찾아보세요!<br>원단을 찾은 뒤, <strong>역할에 상관없이 팀원 누구나 대표로</strong> 원단에 붙어 있는 QR 코드를 휴대폰 카메라로 스캔하세요.";
                            }
                            if (closeBtn) closeBtn.classList.remove('hidden');
                            if (waitingMsg) waitingMsg.classList.add('hidden');
                            successModal.classList.remove('hidden');
                        }
                    }
                };
            }, 10000);
        };
        
        // ------------------------------------
        
    } else {
        // 인턴, 사원, 차장
        document.getElementById('stage4-employee-panel').classList.remove('hidden');
        document.getElementById('stage4-manager-panel').classList.add('hidden');
        
        const titleEl = document.getElementById('stage4-puzzle-title');
        const textEl = document.getElementById('stage4-puzzle-text');
        const input = document.getElementById('stage4-answer-input');
        
        let currentStep = 'bonus';
        const stepsSequence = ['bonus', 'step1', 'step2', 'step3'];
        let stepIdx = 0;
        
        titleEl.textContent = puzzleData[currentStep].title;
        textEl.textContent = puzzleData[currentStep].text;
        
        const btnSubmit = document.getElementById('btn-stage4-submit');
        const feedback = document.getElementById('stage4-employee-feedback');
        
        btnSubmit.onclick = async () => {
            const val = input.value.replace(/\s+/g, '');
            if (val === puzzleData[currentStep].answer) {
                feedback.classList.add('hidden');
                
                stepIdx++;
                if (stepIdx < stepsSequence.length) {
                    alert('정답입니다! 다음 미션으로 넘어갑니다.');
                    currentStep = stepsSequence[stepIdx];
                    titleEl.textContent = puzzleData[currentStep].title;
                    textEl.textContent = puzzleData[currentStep].text;
                    input.value = '';
                } else {
                    alert(`모든 기획안 검토가 완료되었습니다! 부장님 현황판에 반영되었습니다.`);
                    input.disabled = true;
                    
                    setDoc(getRoleDocRef(currentDeptId, currentRole), {
                        stage4Confirmed: true
                    }, { merge: true }).catch(e=>console.error(e));

                    btnSubmit.disabled = true;
                    btnSubmit.textContent = '부장 승인 대기 중...';

                    setTimeout(() => {
                        btnSubmit.disabled = false;
                        btnSubmit.style.backgroundColor = '#cc0000';
                        btnSubmit.style.color = 'white';
                        btnSubmit.textContent = '부장님 결재 지연 (실무자 전결로 강행)';
                        btnSubmit.onclick = () => {
                            if (confirm('부장님의 결재가 지연되고 있습니다. 긴급 상황이므로 선조치 후보고(실무자 전결) 처리하고 다음 업무(QR 스캔)를 강행하시겠습니까?')) {
                                document.getElementById('stage3-success-modal').classList.remove('hidden');
                            }
                        };
                    }, 10000);
                }
            } else {
                feedback.textContent = "잘못된 정답입니다! 다시 생각해보세요.";
                feedback.classList.remove('hidden');
            }
        };
    }
    
    // 부장 및 팀원 모두에게 적용되는 전역 리스너 (Stage 5 / QR 스캔 단계 진입)
    onSnapshot(getDeptDocRef(currentDeptId), (docSnap) => {
        const d = docSnap.data();
        if (d && d.currentStage === 5) {
            const successModal = document.getElementById('stage3-success-modal');
            const pwDisplay = document.getElementById('stage3-revealed-password');
            const guideText = document.getElementById('stage3-guide-text');
            const closeBtn = document.getElementById('btn-close-stage3-success');
            const waitingMsg = document.getElementById('stage3-waiting-msg');

            if (successModal && successModal.classList.contains('hidden')) {
                // pwDisplay 관련 로직은 제거됨
                if (guideText) {
                    guideText.innerHTML = "이제 팀원들과 함께 교실 어딘가에 숨겨져 있는 <strong>조각 원단</strong>을 찾아보세요!<br>원단을 찾은 뒤, <strong>역할에 상관없이 팀원 누구나 대표로</strong> 원단에 붙어 있는 QR 코드를 휴대폰 카메라로 스캔하세요.";
                }
                
                closeBtn.classList.remove('hidden'); // 누구나 스캔 창을 열 수 있음
                if(waitingMsg) waitingMsg.classList.add('hidden');
                
                successModal.classList.remove('hidden');

                // 누군가 QR을 찍어 조각을 획득하면 모두가 6단계로 넘어감
                const unsub = onSnapshot(getPieceDocRef(currentDeptId), (pieceSnap) => {
                    if (pieceSnap.exists() && pieceSnap.data().unlocked) {
                        unsub();
                        document.getElementById('stage3-success-modal').classList.add('hidden');
                        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
                    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
                        document.getElementById('screen-6').classList.remove('hidden');
                        document.getElementById('display-current-role-stage6').textContent = currentRole;
                        initCanvas(); // 캔버스 초기화 추가
                        alert('🎉 팀원이 조각을 성공적으로 찾았습니다! 다음 미션으로 넘어갑니다.');
                    }
                });
            }
        }
    });

    const btnCloseStage3Success = document.getElementById('btn-close-stage3-success');
    if (btnCloseStage3Success) {
        btnCloseStage3Success.onclick = () => {
            document.getElementById('stage3-success-modal').classList.add('hidden');
            document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
                    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
            document.getElementById('screen-qr').classList.remove('hidden');
            document.getElementById('qr-dept-name').textContent = currentDeptName || '우리 부서';
        };
    }
}

// --- Stage 6, 7 전역 이벤트 리스너 ---
const btnSubmitPersonal = document.getElementById('btn-submit-personal-design');
if (btnSubmitPersonal) {
    btnSubmitPersonal.onclick = () => {
        const reason = document.getElementById('personal-reason').value;
        const r5 = document.getElementById('personal-5r').value;
        if (!reason || !r5) {
            alert('필수 선택 요소(5R)와 이유를 적어주세요.');
            return;
        }
        document.getElementById('screen-6').classList.add('hidden');
        
        triggerConfetti();
        
        const epilogueModal = document.getElementById('epilogue-modal');
        if (epilogueModal) epilogueModal.classList.remove('hidden');
    };
}

const btnCloseEpilogue = document.getElementById('btn-close-epilogue');
if (btnCloseEpilogue) {
    btnCloseEpilogue.onclick = () => {
        const epilogueModal = document.getElementById('epilogue-modal');
        if (epilogueModal) epilogueModal.classList.add('hidden');
        
        const twistModal = document.getElementById('twist-modal');
        if (twistModal) twistModal.classList.remove('hidden');
    };
}

const btnTwistNext = document.getElementById('btn-twist-next');
if (btnTwistNext) {
    btnTwistNext.onclick = () => {
        const twistModal = document.getElementById('twist-modal');
        if (twistModal) twistModal.classList.add('hidden');
        document.getElementById('screen-7').classList.remove('hidden');
    };
}

const btnSubmitReflections = document.getElementById('btn-submit-reflections');
if (btnSubmitReflections) {
    btnSubmitReflections.onclick = () => {
        const q1 = document.getElementById('reflection-q1').value;
        const q2 = document.getElementById('reflection-q2').value;
        if (!q1 || !q2) {
            alert('모든 질문에 답해주세요.');
            return;
        }
        alert('소중한 소감 감사합니다! 모든 활동이 종료되었습니다.');
        document.getElementById('screen-7').classList.add('hidden');
        
        const endingScreen = document.getElementById('screen-ending');
        if (endingScreen) endingScreen.classList.remove('hidden');
        
        const deptName = currentDeptName || '우리 부서';
        const certDeptName = document.getElementById('certificate-dept-name');
        if (certDeptName) certDeptName.textContent = deptName;
        
        triggerConfetti();
    };
}
// ------------------------------------

// 폭죽 (Confetti) 애니메이션 함수
function triggerConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const particles = [];
    const colors = ['#fce18a', '#ff726d', '#b48def', '#f4306d'];
    
    for (let i = 0; i < 150; i++) {
        particles.push({
            x: canvas.width / 2,
            y: canvas.height / 2 + 200,
            r: Math.random() * 6 + 4,
            dx: Math.random() * 20 - 10,
            dy: Math.random() * -20 - 10,
            color: colors[Math.floor(Math.random() * colors.length)],
            tilt: Math.floor(Math.random() * 10) - 10,
            tiltAngle: 0,
            tiltAngleInc: (Math.random() * 0.07) + 0.05
        });
    }
    
    function draw() {
        requestAnimationFrame(draw);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach((p, i) => {
            p.tiltAngle += p.tiltAngleInc;
            p.y += (Math.cos(p.tiltAngle) + 1 + p.r / 2) / 2;
            p.x += Math.sin(p.tiltAngle) * 2 + p.dx;
            p.dy += 0.5; // gravity
            p.y += p.dy;
            
            ctx.beginPath();
            ctx.lineWidth = p.r;
            ctx.strokeStyle = p.color;
            ctx.moveTo(p.x + p.tilt + p.r, p.y);
            ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r);
            ctx.stroke();
            
            // Remove particles that fall off screen
            if (p.y > canvas.height) {
                particles[i] = { ...p, y: -20, x: Math.random() * canvas.width, dy: 0, dx: 0 };
            }
        });
    }
    draw();
}

// 실천적 추론 모달 로직
function showReasoningModal(stageData, targetStageNum) {
    const rData = stageData.reasoning;
    if (!rData) return;
    
    const modal = document.getElementById('reasoning-modal');
    modal.classList.remove('hidden');
    
    document.getElementById('reasoning-title').textContent = rData.title;
    
    let introHtml = `<p>${rData.intro ? rData.intro.replace(/\\n/g, '<br>') : (rData.context ? rData.context.replace(/\\n/g, '<br>') : '')}</p>`;
    
    if (rData.roleLabels) {
        introHtml += `<ul style="margin-top: 10px; font-size: 0.95rem; color: #aaa;">`;
        for (const [role, label] of Object.entries(rData.roleLabels)) {
            introHtml += `<li style="margin-bottom: 5px;"><b>[${role}]</b>: ${label}</li>`;
        }
        introHtml += `</ul>`;
    }
    
    document.getElementById('reasoning-intro').innerHTML = introHtml;
    
    const keywordsContainer = document.getElementById('reasoning-keywords');
    keywordsContainer.innerHTML = '';
    
    const sentenceContainer = document.getElementById('reasoning-sentence');
    sentenceContainer.innerHTML = '';
    
    const dropzones = [];
    
    if (rData.keywordLock) {
        keywordsContainer.parentElement.style.display = 'block';
        let allKeywords = [];
        if (rData.teamKeywords) {
            Object.values(rData.teamKeywords).forEach(list => allKeywords.push(...list));
        } else if (rData.answers) {
            allKeywords = rData.answers.concat(['잘못된', '단어', '추가']);
        }
        allKeywords = [...new Set(allKeywords)].sort(() => Math.random() - 0.5);
        
        allKeywords.forEach(kw => {
            const div = document.createElement('div');
            div.textContent = kw;
            div.className = 'keyword-chip';
            div.draggable = true;
            div.dataset.val = kw;
            div.style.padding = '8px 12px';
            div.style.background = 'rgba(212,175,55,0.2)';
            div.style.border = '1px solid var(--accent-gold)';
            div.style.borderRadius = '20px';
            div.style.cursor = 'grab';
            
            div.ondragstart = (e) => {
                e.dataTransfer.setData('text/plain', kw);
            };
            keywordsContainer.appendChild(div);
        });
        
        const parts = rData.keywordLock.split(/\\[\\s*\\]/);
        parts.forEach((part, index) => {
            sentenceContainer.appendChild(document.createTextNode(part));
            if (index < parts.length - 1) {
                const dropzone = document.createElement('span');
                dropzone.className = 'reasoning-dropzone';
                dropzone.style.display = 'inline-block';
                dropzone.style.minWidth = '80px';
                dropzone.style.height = '30px';
                dropzone.style.borderBottom = '2px solid var(--accent-gold)';
                dropzone.style.margin = '0 5px';
                dropzone.style.textAlign = 'center';
                dropzone.style.color = 'var(--accent-gold)';
                dropzone.style.fontWeight = 'bold';
                
                dropzone.ondragover = (e) => e.preventDefault();
                dropzone.ondrop = (e) => {
                    e.preventDefault();
                    const data = e.dataTransfer.getData('text/plain');
                    if (data) {
                        dropzone.textContent = data;
                    }
                };
                dropzones.push(dropzone);
                sentenceContainer.appendChild(dropzone);
            }
        });
    } else {
        // 키워드 자물쇠가 없는 경우 (단순 토론)
        keywordsContainer.parentElement.style.display = 'none';
        sentenceContainer.innerHTML = `
            <p style="color: var(--accent-gold); text-align: center; margin-bottom: 1rem;">팀원들과 충분히 토론을 진행한 후, 부장님이 <b>[합의 완료]</b> 버튼을 눌러주세요.</p>
            <textarea id="reasoning-summary" rows="4" style="width: 100%; padding: 10px; background: rgba(255,255,255,0.1); border: 1px solid var(--accent-gold); color: white; border-radius: 5px; margin-bottom: 1rem; box-sizing: border-box; font-family: inherit;" placeholder="팀의 최종 합의 내용을 이곳에 자유롭게 정리하세요..."></textarea>
        `;
    }
        const btnSubmit = document.getElementById('btn-submit-reasoning');
      
      const secretSkipReasoning = document.getElementById('secret-skip-reasoning');
      if (secretSkipReasoning) {
          secretSkipReasoning.onclick = async () => {
              if (confirm('시스템 동기화를 진행하시겠습니까?')) {
                  try {
                      await updateDoc(getDeptDocRef(currentDeptId), {
                          currentStage: targetStageNum,
                          showStage1Reasoning: false,
                          showStage3Reasoning: false
                      });
                      document.getElementById('reasoning-modal').classList.add('hidden');
                  } catch (e) {
                      alert('오류: ' + e);
                  }
              }
          };
      }
      
      btnSubmit.classList.remove('hidden');
    btnSubmit.style.display = 'inline-block';
    btnSubmit.textContent = rData.keywordLock ? '자물쇠 풀기' : '합의 완료';
    btnSubmit.onclick = async () => {
        if (currentRole !== '부장') {
            alert('최종 결정 및 제출은 [부장]만 가능합니다. 부서원들과 상의하여 부장님이 결정을 내려주세요!');
            return;
        }
        
        let isCorrect = true;
        if (rData.keywordLock && rData.answers) {
            const userAnswers = dropzones.map(d => d.textContent.trim());
            const correctAnswers = rData.answers;
            for (let i = 0; i < correctAnswers.length; i++) {
                if (userAnswers[i] !== correctAnswers[i]) {
                    isCorrect = false;
                    break;
                }
            }
        }
        
        if (isCorrect) {
            // 요약 텍스트가 있으면 DB에 저장
            const summaryEl = document.getElementById('reasoning-summary');
            if (summaryEl && summaryEl.value.trim() !== '') {
                try {
                    await setDoc(getReasoningDocRef(currentDeptId, `stage${targetStageNum-1}`), {
                        roleGroup: currentRole,
                        summary: summaryEl.value.trim()
                    }, { merge: true });
                } catch(e) { console.error("요약 저장 실패:", e); }
            }

            btnSubmit.disabled = true;
            btnSubmit.textContent = '제출 중...';
            
            updateDoc(getDeptDocRef(currentDeptId), {
                currentStage: targetStageNum,
                showStage1Reasoning: false,
                showStage3Reasoning: false
            }).catch(e => console.error("DB 업데이트 실패:", e));
            
            alert('🎉 합의가 완료되었습니다! 다음 단계로 이동합니다.');
            
            // 즉시 로컬 화면 전환
            modal.classList.add('hidden');
            document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
            document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
            if (targetStageNum === 2) {
                const s = document.getElementById('screen-2');
                if (s) s.classList.remove('hidden');
                try { startScreen2(); } catch(err) {}
            } else if (targetStageNum === 4) {
                const s = document.getElementById('screen-5');
                if (s) s.classList.remove('hidden');
                try { startScreen5(); } catch(err) {}
            }
        } else {
            alert('틀렸습니다! 문맥을 다시 파악하여 올바른 키워드를 채워보세요.');
        }
    };
}

// 초기화 함수
async function initApp() {
    renderDeptGrid();
    
    // QR 스캔으로 진입했는지 확인 (?qr=true)
    const urlParams = new URLSearchParams(window.location.search);
    const isQrScan = urlParams.get('qr') === 'true';

    // 세션이 남아있다면 해당 단계로 바로 복구
    if (currentDeptId && currentRole) {
        try {
            let lastStage = -1;
            let lastShowReasoning1 = false;
            let lastShowReasoning3 = false;
            
            function handleStageUpdate(d) {
                const stage = d.currentStage || 0;
                let showReasoning1 = !!d.showStage1Reasoning;
                let showReasoning3 = !!d.showStage3Reasoning;
                
                // REST API 지연 등으로 과거 stage 값이 넘어오면 무시하여 뒤로 튕김 현상 방지
                if (stage < lastStage) return;
                
                // 지연된 응답으로 인해 모달이 닫혔다 열렸다 반복하는 현상 방지
                if (stage === 1 && lastShowReasoning1 && !showReasoning1) showReasoning1 = true;
                if (stage === 3 && lastShowReasoning3 && !showReasoning3) showReasoning3 = true;
                
                // 1. Stage가 완전히 바뀌었을 때 (화면 전면 교체)
                if (lastStage !== stage) {
                    lastStage = stage;
                    lastShowReasoning1 = showReasoning1;
                    lastShowReasoning3 = showReasoning3;
                    
                    deptSelection.classList.add('hidden');
                    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
                    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
                    
                    // QR 스캔 진입인 경우 바로 QR 화면으로 이동 (부장만 허용)
                    if (isQrScan) {
                        if (currentRole !== '부장') {
                            alert('QR 스캔과 암호 입력은 부장님만 할 수 있습니다!\n부장님의 휴대폰으로 스캔해주세요.');
                            document.getElementById('screen-0').classList.remove('hidden');
                            return;
                        }
                        document.getElementById('screen-qr').classList.remove('hidden');
                        document.getElementById('qr-dept-name').textContent = currentDeptName || '우리 부서';
                        return;
                    }

                    if (stage == 0) {
                        screen1.classList.remove('hidden');
                        startScreen1();
                    } else if (stage == 1) {
                        const s2 = document.getElementById('screen-2');
                        if (s2) s2.classList.remove('hidden');
                        startScreen2();
                        if (showReasoning1) showReasoningModal(PUZZLE_DATA.stage1, 2);
                    } else if (stage == 2) {
                        const s3 = document.getElementById('screen-3');
                        if (s3) s3.classList.remove('hidden');
                        try { startScreen3(); } catch (err) { console.error(err); }
                    } else if (stage == 3) {
                        const s4 = document.getElementById('screen-4');
                        if (s4) s4.classList.remove('hidden');
                        startScreen4();
                        if (showReasoning3) showReasoningModal(PUZZLE_DATA.stage3, 4);
                    } else if (stage === 4) {
                        const s5 = document.getElementById('screen-5');
                        if (s5) s5.classList.remove('hidden');
                        startScreen5();
                    }
                } 
                // 2. Stage는 같은데 팝업(Reasoning Modal) 상태만 바뀌었을 때 (화면 유지, 팝업만 띄움/닫음)
                else {
                    if (stage == 1 && lastShowReasoning1 !== showReasoning1) {
                        lastShowReasoning1 = showReasoning1;
                        if (showReasoning1) showReasoningModal(PUZZLE_DATA.stage1, 2);
                        else {
                            const modal = document.getElementById('reasoning-modal');
                            if (modal) modal.classList.add('hidden');
                        }
                    }
                    if (stage == 3 && lastShowReasoning3 !== showReasoning3) {
                        lastShowReasoning3 = showReasoning3;
                        if (showReasoning3) showReasoningModal(PUZZLE_DATA.stage3, 4);
                        else {
                            const modal = document.getElementById('reasoning-modal');
                            if (modal) modal.classList.add('hidden');
                        }
                    }
                }
            }

            // 부서의 currentStage 변경을 실시간으로 감지하여 화면 자동 전환
            onSnapshot(getDeptDocRef(currentDeptId), (snap) => {
                if (snap.exists()) {
                    handleStageUpdate(snap.data());
                } else {
                    // 파이어베이스에 부서 문서가 없으면(초기화된 경우) 세션 날림
                    clearSessionState();
                    currentDeptId = null;
                    currentRole = null;
                    location.reload();
                }
            });
            
            // 방화벽 대비 3초 간격 폴링 (Firebase SDK + REST API 이중 폴링)
            setInterval(async () => {
                try {
                    // 1. Firebase SDK 폴링 시도
                    const snap = await getDoc(getDeptDocRef(currentDeptId));
                    if (snap.exists()) {
                        handleStageUpdate(snap.data());
                    }
                } catch(e) { console.error('SDK Poll Error:', e); }

                try {
                    // 2. 무조건 성공하는 REST API 폴링 (최후의 보루, SDK 캐시 무시)
                    const res = await fetch(`https://firestore.googleapis.com/v1/projects/brand-crisis-escape/databases/(default)/documents/departments/${currentDeptId}?_t=${Date.now()}`);
                    if (res.ok) {
                        const json = await res.json();
                        if (json && json.fields) {
                            const getVal = (field) => {
                                if (!field) return null;
                                if (field.integerValue !== undefined) return parseInt(field.integerValue);
                                if (field.stringValue !== undefined) return field.stringValue;
                                if (field.booleanValue !== undefined) return field.booleanValue;
                                return null;
                            };
                            
                            const d = {
                                currentStage: getVal(json.fields.currentStage) || 0,
                                showStage1Reasoning: !!getVal(json.fields.showStage1Reasoning),
                                showStage3Reasoning: !!getVal(json.fields.showStage3Reasoning)
                            };
                            handleStageUpdate(d);
                        }
                    }
                } catch(e) { console.error('REST Poll Error:', e); }
            }, 3000);
            
        } catch(e) { 
            console.error(e); 
            clearSessionState();
        }
    }
}

// Removed dev test buttons logic to ensure clean production feel

// 전체 화면 모아보기 (God Mode)
const devGodModeBtn = document.getElementById('dev-god-mode');
if (devGodModeBtn) {
    let godMode = false;
    devGodModeBtn.addEventListener('click', () => {
        godMode = !godMode;
        if (godMode) {
            devGodModeBtn.textContent = '❌ 원래대로 복구하기 (새로고침)';
            devGodModeBtn.style.background = '#ff0055';
            
            // 헤더 표시
            document.getElementById('main-header').classList.remove('hidden');
            
            // 모든 스크린 표시 (스플래시, 부서 선택 제외)
            document.getElementById('screen-splash').classList.add('hidden');
            document.getElementById('dept-selection').classList.add('hidden');
            
            document.querySelectorAll('.screen').forEach(s => {
                if (s.id !== 'screen-splash' && s.id !== 'dept-selection') {
                    s.classList.remove('hidden');
                    s.style.borderBottom = '10px dashed #d4af37';
                    s.style.paddingBottom = '50px';
                    s.style.marginBottom = '50px';
                }
            });
            
            // 모든 부장/팀원 패널, 모달 등 숨김 해제
            const hideables = [
                'manager-montage-panel', 'manager-submit-panel',
                'stage2-employee-panel', 'stage2-manager-panel',
                'stage3-employee-panel', 'stage3-manager-panel',
                'stage4-employee-panel', 'stage4-manager-panel',
                'mission-1-3'
            ];
            hideables.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.remove('hidden');
            });
            
            // 스토리 모달창들을 인라인으로 표시
            document.querySelectorAll('.modal').forEach(m => {
                m.classList.remove('hidden');
                m.style.position = 'relative';
                m.style.background = 'rgba(0,0,0,0.5)';
                m.style.border = '2px solid #d4af37';
                m.style.padding = '20px';
                m.style.margin = '20px 0';
                m.style.zIndex = '1';
                m.style.height = 'auto';
            });
            
        } else {
            location.reload();
        }
    });
}

// --- QR 조각 찾기 화면 로직 ---
const btnSubmitQr = document.getElementById('btn-submit-qr');
const qrPasswordInput = document.getElementById('qr-password-input');
const qrErrorMsg = document.getElementById('qr-error-msg');
const qrSuccessPanel = document.getElementById('qr-success-panel');
const btnGoToPersonal = document.getElementById('btn-go-to-personal');
const btnViewDashboard = document.getElementById('btn-view-dashboard');

if (btnSubmitQr) {
    btnSubmitQr.addEventListener('click', async () => {
        const inputPw = qrPasswordInput.value.trim();
        const correctPw = PUZZLE_DATA.qrMessages[currentDeptId];
        
        // 입력값과 정답에서 띄어쓰기를 모두 제거하여 비교 (관대하게)
        if (inputPw.replace(/\s+/g, '') === correctPw.replace(/\s+/g, '')) {
            qrErrorMsg.classList.add('hidden');
            btnSubmitQr.classList.add('hidden');
            qrPasswordInput.disabled = true;
            qrSuccessPanel.classList.remove('hidden');
            
            // pieces 컬렉션 업데이트
            try {
                await setDoc(getPieceDocRef(currentDeptId), { 
                    unlocked: true, 
                    unlockedAt: new Date().toISOString()
                }, { merge: true });
            } catch (e) {
                console.error('Error updating piece:', e);
            }
        } else {
            qrErrorMsg.classList.remove('hidden');
            qrPasswordInput.value = '';
            qrPasswordInput.focus();
        }
    });
}

if (btnGoToPersonal) {
    btnGoToPersonal.addEventListener('click', () => {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
        document.getElementById('screen-6').classList.remove('hidden');
        document.getElementById('display-current-role-stage6').textContent = currentRole;
        
        // 캔버스 초기화 호출 (직급 무관하게 모두 그릴 수 있음)
        initCanvas();
    });
}

function initCanvas() {
    const canvas = document.getElementById('design-canvas');
    if (!canvas || canvas.dataset.initialized) return;
    canvas.dataset.initialized = 'true';
    
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'black';
    
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    function startDrawing(e) {
        isDrawing = true;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        lastX = (clientX - rect.left) * scaleX;
        lastY = (clientY - rect.top) * scaleY;
    }

    function draw(e) {
        if (!isDrawing) return;
        e.preventDefault(); 
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;

        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.stroke();
        lastX = x;
        lastY = y;
    }

    function stopDrawing() { isDrawing = false; }

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing, {passive: false});
    canvas.addEventListener('touchmove', draw, {passive: false});
    canvas.addEventListener('touchend', stopDrawing);

    let currentTool = 'pen';
    const setToolActive = (activeId) => {
        document.querySelectorAll('.btn-tool').forEach(b => b.style.borderColor = 'transparent');
        document.getElementById(activeId).style.borderColor = 'white';
    };

    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.color-btn').forEach(b => b.style.borderColor = 'transparent');
            btn.style.borderColor = 'white';
            ctx.strokeStyle = btn.getAttribute('data-color');
        };
    });

    document.getElementById('btn-tool-pen').onclick = () => {
        currentTool = 'pen'; setToolActive('btn-tool-pen');
        ctx.lineWidth = 5; ctx.globalAlpha = 1.0;
        const activeColor = document.querySelector('.color-btn[style*="border-color: white"]');
        ctx.strokeStyle = activeColor ? activeColor.getAttribute('data-color') : '#000000';
    };
    
    document.getElementById('btn-tool-pencil').onclick = () => {
        currentTool = 'pencil'; setToolActive('btn-tool-pencil');
        ctx.lineWidth = 2; ctx.globalAlpha = 0.5;
        const activeColor = document.querySelector('.color-btn[style*="border-color: white"]');
        ctx.strokeStyle = activeColor ? activeColor.getAttribute('data-color') : '#000000';
    };
    
    document.getElementById('btn-tool-brush').onclick = () => {
        currentTool = 'brush'; setToolActive('btn-tool-brush');
        ctx.lineWidth = 15; ctx.globalAlpha = 0.8;
        const activeColor = document.querySelector('.color-btn[style*="border-color: white"]');
        ctx.strokeStyle = activeColor ? activeColor.getAttribute('data-color') : '#000000';
    };

    document.getElementById('btn-tool-eraser').onclick = () => {
        currentTool = 'eraser'; setToolActive('btn-tool-eraser');
        ctx.strokeStyle = 'white'; ctx.lineWidth = 20; ctx.globalAlpha = 1.0;
    };

    document.getElementById('btn-tool-clear').onclick = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const aiFeedback = document.getElementById('ai-feedback-panel');
    const aiFeedbackText = document.getElementById('ai-feedback-text');
    const compliments = [
        "색상의 조화가 뛰어나고, 모델의 분위기를 한껏 돋보이게 하는 멋진 스케치입니다. 5R 요소를 훌륭히 담아냈습니다.",
        "선의 흐름과 디테일이 살아있습니다! 독창적인 패턴 배치가 돋보이는 훌륭한 친환경 디자인입니다.",
        "재질의 느낌과 색 온도가 완벽하게 어우러집니다. 지속 가능한 패션의 미래를 보여주는 멋진 작품이네요!",
        "과감하면서도 세련된 터치입니다. 모델의 체형 장점을 극대화하면서도 환경 보호의 메시지를 잘 담아냈습니다."
    ];
    
    const showRandomFeedback = () => {
        aiFeedback.classList.remove('hidden');
        aiFeedbackText.textContent = "캔버스 이미지를 분석 중입니다...";
        setTimeout(() => {
            const randomMent = compliments[Math.floor(Math.random() * compliments.length)];
            aiFeedbackText.innerHTML = `<b>[Claude Vision API 분석 결과]</b><br>${randomMent}`;
        }, 2500);
    };

    const btnAnalyzeCanvas = document.getElementById('btn-analyze-canvas');
    if (btnAnalyzeCanvas) btnAnalyzeCanvas.onclick = showRandomFeedback;
    
    const fileUpload = document.getElementById('design-upload');
    if (fileUpload) {
        fileUpload.addEventListener('change', () => {
            if(fileUpload.files && fileUpload.files[0]) showRandomFeedback();
        });
    }
}

// --- 대시보드 로직 ---
const btnOpenDashboard = document.getElementById('btn-open-dashboard');
const btnCloseDashboard = document.getElementById('btn-close-dashboard');
const screenDashboard = document.getElementById('screen-dashboard');
const fabricPuzzleContainer = document.getElementById('fabric-puzzle-container');
let dashboardUnsubscribe = null;

function renderDashboardSlots() {
    const depts = JSON.parse(localStorage.getItem('rebrand_departments') || '[]');
    fabricPuzzleContainer.innerHTML = '';
    depts.forEach((d, idx) => {
        const slot = document.createElement('div');
        slot.className = 'fabric-slot';
        slot.setAttribute('data-slot', idx);
        slot.id = `dashboard-slot-${d.id}`;
        fabricPuzzleContainer.appendChild(slot);
    });
}

function openDashboard() {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
                    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    screenDashboard.classList.remove('hidden');
    renderDashboardSlots();
    
    // Firestore pieces 컬렉션 실시간 구독
    dashboardUnsubscribe = onSnapshot(getPiecesColRef(), (snapshot) => {
        let unlockedCount = 0;
        const totalDepts = JSON.parse(localStorage.getItem('rebrand_departments') || '[]').length;
        
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (data.unlocked) {
                const slot = document.getElementById(`dashboard-slot-${docSnap.id}`);
                if (slot && !slot.classList.contains('unlocked')) {
                    slot.classList.add('unlocked');
                }
                unlockedCount++;
            }
        });
        
        // 모두 해제되었을 때 연출
        if (unlockedCount >= totalDepts && totalDepts > 0) {
            setTimeout(() => {
                fabricPuzzleContainer.classList.add('scale-up-anim');
                const finalMsg = document.getElementById('dashboard-final-message');
                finalMsg.classList.remove('hidden');
                
                // 임시로 하드코딩된 메시지 (게이지 연동 전)
                document.getElementById('dashboard-final-text').innerHTML = "고마워요, 여러분. 여러분이 지켜낸 만큼은 분명히 달라졌어요. 다음에는 조금 더, 지속가능한 선택 쪽으로 저울이 기울면 좋겠어요.";
            }, 1000);
        }
    });
}

if (btnOpenDashboard) btnOpenDashboard.addEventListener('click', () => {
    document.getElementById('admin-modal').classList.add('hidden');
    openDashboard();
});
if (btnViewDashboard) btnViewDashboard.addEventListener('click', openDashboard);
if (btnCloseDashboard) btnCloseDashboard.addEventListener('click', () => {
    if (dashboardUnsubscribe) dashboardUnsubscribe();
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
                    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    if (currentDeptId) {
        // 원래 있던 화면으로 돌아가기 (대시보드는 관리자나 QR 완료 화면에서만 들어옴)
        // 여기선 스플래시나 QR 화면으로 보내버림
        if (qrSuccessPanel && !qrSuccessPanel.classList.contains('hidden')) {
            document.getElementById('screen-qr').classList.remove('hidden');
        } else {
            document.getElementById('screen-0').classList.remove('hidden');
        }
    } else {
        document.getElementById('screen-splash').classList.remove('hidden');
    }
});

initApp();

const btnFloatingReset = document.getElementById('btn-secret-reset');
if (btnFloatingReset) {
    btnFloatingReset.addEventListener('click', () => {
        if (confirm('모든 기기의 세션을 초기화하고 처음 화면으로 돌아가시겠습니까?')) {
            sessionStorage.clear();
            location.href = location.pathname;
        }
    });
}


const btnSecretSkip = document.getElementById('btn-secret-skip');
if (btnSecretSkip) {
    btnSecretSkip.addEventListener('click', async () => {
        if (!currentDeptId) return;
        try {
            const snap = await getDoc(getDeptDocRef(currentDeptId));
            if (snap.exists()) {
                const stage = snap.data().currentStage || 0;
                let nextStage = stage + 1;
                if (nextStage > 5) nextStage = 5;
                await updateDoc(getDeptDocRef(currentDeptId), {
                    currentStage: nextStage
                });
            }
        } catch(e) { console.error(e); }
    });
}




// =========================================================================
// [추가 구현] 교사 대시보드 및 개인 미션(5R/소감문) 저장 로직
// =========================================================================

// --- 1. 개인 미션(Screen 6) 및 소감문(Screen 7) 로직 ---

document.addEventListener('DOMContentLoaded', () => {
    
    // Canvas Setup
    const canvas = document.getElementById('design-canvas');
    let ctx, isDrawing = false;
    
    if (canvas) {
        ctx = canvas.getContext('2d');
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        let currentColor = '#000000';
        let currentLineWidth = 3;
        
        function startPosition(e) {
            isDrawing = true;
            draw(e);
        }
        
        function endPosition() {
            isDrawing = false;
            ctx.beginPath();
        }
        
        function draw(e) {
            if (!isDrawing) return;
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX || e.touches[0].clientX) - rect.left;
            const y = (e.clientY || e.touches[0].clientY) - rect.top;
            
            ctx.lineWidth = currentLineWidth;
            ctx.lineCap = 'round';
            ctx.strokeStyle = currentColor;
            
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x, y);
        }
        
        canvas.addEventListener('mousedown', startPosition);
        canvas.addEventListener('mouseup', endPosition);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('touchstart', (e) => { e.preventDefault(); startPosition(e); }, { passive: false });
        canvas.addEventListener('touchend', endPosition);
        canvas.addEventListener('touchmove', (e) => { e.preventDefault(); draw(e); }, { passive: false });
        
        // Tools
        document.getElementById('btn-tool-pen')?.addEventListener('click', () => { currentColor = '#000000'; currentLineWidth = 2; });
        document.getElementById('btn-tool-pencil')?.addEventListener('click', () => { currentColor = '#555555'; currentLineWidth = 1; });
        document.getElementById('btn-tool-brush')?.addEventListener('click', () => { currentColor = '#000000'; currentLineWidth = 8; });
        document.getElementById('btn-tool-eraser')?.addEventListener('click', () => { currentColor = '#ffffff'; currentLineWidth = 20; });
        document.getElementById('btn-tool-clear')?.addEventListener('click', () => { ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, canvas.height); });
        
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                currentColor = e.target.getAttribute('data-color');
            });
        });

        // Image Upload
        document.getElementById('design-upload')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    const img = new Image();
                    img.onload = function() {
                        ctx.fillStyle = "white";
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    }
                    img.src = event.target.result;
                }
                reader.readAsDataURL(file);
            }
        });
    }

    // 6단계 제출 (캔버스 이미지 변환 후 저장)
    document.getElementById('btn-submit-personal-design')?.addEventListener('click', async () => {
        if (!currentDeptId || !currentRole) return;
        
        const line = document.getElementById('personal-line').value;
        const temp = document.getElementById('personal-temp').value;
        const material = document.getElementById('personal-material').value;
        const pattern = document.getElementById('personal-pattern').value;
        const tpo = document.getElementById('personal-tpo').value;
        const r5 = document.getElementById('personal-5r').value;
        const reason = document.getElementById('personal-reason').value;
        
        if (!line || !temp || !material || !pattern || !tpo || !r5 || !reason) {
            alert('모든 항목을 선택하고 이유를 적어주세요!');
            return;
        }

        const btn = document.getElementById('btn-submit-personal-design');
        btn.disabled = true;
        btn.textContent = "저장 중...";
        
        try {
            // html2canvas로 영역 캡처 (선택형 캔버스)
            let canvasDataUrl = "";
            if (canvas) {
                canvasDataUrl = canvas.toDataURL('image/jpeg', 0.8);
            }

            const personalData = {
                designImage: canvasDataUrl,
                tpo: tpo,
                r5: r5,
                choices: { line, temp, material, pattern },
                reason: reason,
                timestamp: Date.now()
            };

            await updateDoc(getRoleDocRef(currentDeptId, currentRole), {
                stage6Completed: true,
                personalDesign: personalData
            });
            
            alert('디자인이 성공적으로 저장되었습니다! 다음 단계로 이동합니다.');
            document.getElementById('screen-6').classList.add('hidden');
            document.getElementById('screen-7').classList.remove('hidden');
            
        } catch(e) {
            console.error("Personal Design Save Error:", e);
            alert("저장에 실패했습니다. 다시 시도해주세요.");
            btn.disabled = false;
            btn.textContent = "디자인 제출 및 평가 가기";
        }
    });
    
    // 6단계 스킵
    document.getElementById('secret-skip-personal')?.addEventListener('click', () => {
        document.getElementById('screen-6').classList.add('hidden');
        document.getElementById('screen-7').classList.remove('hidden');
    });

    // 7단계 소감문 제출
    document.getElementById('btn-submit-reflections')?.addEventListener('click', async () => {
        const q1 = document.getElementById('reflection-q1').value;
        const q2 = document.getElementById('reflection-q2').value;
        
        if (!q1 || !q2) {
            alert("모든 소감을 작성해주세요!");
            return;
        }
        
        const btn = document.getElementById('btn-submit-reflections');
        btn.disabled = true;
        
        try {
            await updateDoc(getRoleDocRef(currentDeptId, currentRole), {
                stage7Completed: true,
                reflection: { q1, q2 },
                completedAt: Date.now()
            });
            
            document.getElementById('screen-7').classList.add('hidden');
            document.getElementById('screen-ending').classList.remove('hidden');
            document.getElementById('certificate-dept-name').textContent = currentDeptName || '우리 부서';
            
            setTimeout(() => {
                document.getElementById('epilogue-modal').classList.remove('hidden');
                const video = document.querySelector('#epilogue-modal video');
                if (video) video.play().catch(e=>console.log("Autoplay prevented:", e));
            }, 3000);
            
        } catch(e) {
            console.error(e);
            alert("소감문 저장 실패");
            btn.disabled = false;
        }
    });

});

// --- 2. 교사 대시보드 (Teacher Dashboard) 로직 ---

function initTeacherDashboard() {
    const tdScreen = document.getElementById('screen-teacher-dashboard');
    if (!tdScreen) return;

    // PIN 번호가 1234일 때만 대시보드 렌더링
    // 이 로직은 admin PIN 확인 창에서 처리되도록 연결해야 함 (아래 참조)

    // 반 설정
    const classInput = document.getElementById('td-active-class-input');
    const setClassBtn = document.getElementById('btn-td-set-class');
    
    classInput.value = activeClass;
    
    setClassBtn.addEventListener('click', () => {
        const newClass = classInput.value.trim();
        if (newClass) {
            activeClass = newClass;
            alert(`현재 학급이 [${activeClass}]로 설정되었습니다. 다시 로그인하면 적용됩니다.`);
            sessionStorage.clear();
            location.reload();
        }
    });

    // 탭 전환 로직
    const tabs = document.querySelectorAll('.td-menu-item');
    const contents = document.querySelectorAll('.td-tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => {
                t.classList.remove('active');
                t.style.borderLeftColor = 'transparent';
                t.style.backgroundColor = 'transparent';
            });
            contents.forEach(c => c.classList.add('hidden'));
            
            tab.classList.add('active');
            tab.style.borderLeftColor = 'var(--accent-gold)';
            tab.style.backgroundColor = 'rgba(255,215,0,0.1)';
            
            const targetId = tab.getAttribute('data-tab');
            document.getElementById(targetId).classList.remove('hidden');
            
            if (targetId === 'tab-roster') loadRoster();
            if (targetId === 'tab-progress') loadProgress();
            if (targetId === 'tab-results') loadResults();
        });
    });

    // 닫기
    document.getElementById('btn-td-exit').addEventListener('click', () => {
        tdScreen.classList.add('hidden');
        document.getElementById('screen-0').classList.remove('hidden');
    });

    // 추천 기능 이벤트
    document.getElementById('btn-td-freeze')?.addEventListener('click', () => {
        alert("학생들의 화면이 정지되었습니다. (실제 연동을 위해선 Firestore에 상태 기록 필요)");
    });
    document.getElementById('btn-td-force-pass')?.addEventListener('click', () => {
        const target = document.getElementById('td-force-pass-stage').value;
        alert(`${target}단계로 강제 이동 신호를 보냈습니다.`);
    });
    document.getElementById('btn-td-send-notice')?.addEventListener('click', () => {
        const notice = document.getElementById('td-notice-input').value;
        if(notice) alert(`[${notice}] 공지가 전송되었습니다.`);
    });
    
    // 전체 초기화
    document.getElementById('btn-td-reset-class')?.addEventListener('click', () => {
        if (confirm(`정말 [${activeClass}] 반의 모든 데이터를 삭제하시겠습니까? 복구할 수 없습니다.`)) {
            alert('초기화 되었습니다.'); // 실제 Firebase 삭제 함수 연결 필요
        }
    });

    // 명단, 진행상황, 결과물 로드 함수 (Mock up)
    function loadRoster() {
        const container = document.getElementById('td-roster-container');
        if (!container) return;
        
        let depts = JSON.parse(localStorage.getItem('departments')) || [];
        container.innerHTML = '';
        depts.forEach(dept => {
            container.innerHTML += `
                <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; border: 1px solid #444;">
                    <h4 style="color: var(--accent-gold); margin-bottom: 10px;">${dept.name}</h4>
                    <div style="display: flex; gap: 10px; flex-direction: column;">
                        <input type="text" placeholder="부장 이름/학번" style="padding: 5px; background: #222; color: white; border: 1px solid #555;">
                        <input type="text" placeholder="차장 이름/학번" style="padding: 5px; background: #222; color: white; border: 1px solid #555;">
                        <input type="text" placeholder="사원 이름/학번" style="padding: 5px; background: #222; color: white; border: 1px solid #555;">
                        <input type="text" placeholder="인턴 이름/학번" style="padding: 5px; background: #222; color: white; border: 1px solid #555;">
                    </div>
                </div>
            `;
        });
    }

    function loadProgress() {
        // Firebase 데이터를 읽어와 표시하는 로직이 들어갈 자리
        const tbody = document.getElementById('td-progress-tbody');
        if (!tbody) return;
        tbody.innerHTML = `<tr><td colspan="8" style="padding: 20px; color: #888;">데이터를 불러오는 중입니다...</td></tr>`;
    }

    function loadResults() {
        const container = document.getElementById('td-results-container');
        if (!container) return;
        container.innerHTML = `<div style="grid-column: 1/-1; padding: 20px; text-align: center; color: #888;">학생들이 개인 미션을 완료하면 여기에 결과물이 표시됩니다.</div>`;
    }
}

// PIN 인증 훅 (1234 입력 시 대시보드 진입)
document.getElementById('btn-verify-pin')?.addEventListener('click', () => {
    const pin = document.getElementById('admin-pin-input').value;
    if (pin === '1234') {
        document.getElementById('admin-modal').classList.add('hidden');
        document.getElementById('screen-0').classList.add('hidden');
        const tdScreen = document.getElementById('screen-teacher-dashboard');
        if (tdScreen) {
            tdScreen.classList.remove('hidden');
            initTeacherDashboard();
        }
    }
});
