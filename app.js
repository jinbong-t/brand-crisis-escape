import { db, collection, doc, setDoc, getDoc, runTransaction, updateDoc } from './firebase-config.js';
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
            alert('정답입니다! 훌륭하게 원단을 골라냈습니다.');
            document.getElementById('btn-submit-mission-1-2').disabled = true;
            document.getElementById('btn-submit-mission-1-2').textContent = '제출 완료';
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
    } else {
        document.getElementById('manager-montage-panel').classList.add('hidden');
        document.getElementById('manager-submit-panel').classList.add('hidden');
    }
}

// 초기화 함수
async function initApp() {
    renderDeptGrid();
    
    // 세션이 남아있다면 해당 단계로 바로 복구
    if (currentDeptId && currentRole) {
        try {
            const snap = await getDoc(doc(db, 'departments', currentDeptId));
            if (snap.exists()) {
                const stage = snap.data().currentStage || 0; // 하위 호환성 (과거에 생성된 부서는 0단계로)
                
                deptSelection.classList.add('hidden');
                document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
                
                if (stage === 0) {
                    screen1.classList.remove('hidden');
                    startScreen1();
                } else if (stage === 1) {
                    const s2 = document.getElementById('screen-2');
                    if(s2) {
                        s2.classList.remove('hidden');
                        startScreen2();
                    }
                }
            } else {
                // 파이어베이스에 부서 문서가 없으면(초기화된 경우) 세션 날림
                clearSessionState();
                currentDeptId = null;
                currentRole = null;
                // 스플래시 화면 유지됨
            }
        } catch(e) { 
            console.error(e); 
            clearSessionState();
        }
    }
}

initApp();
