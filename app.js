import { db, collection, doc, setDoc, getDoc, runTransaction, updateDoc, onSnapshot } from './firebase-config.js';
import { PUZZLE_DATA } from './puzzle-data.js';

sessionStorage.clear();

// DOM ?붿냼
const deptGrid = document.getElementById('dept-grid');
const deptSelection = document.getElementById('department-selection');
const roleSelection = document.getElementById('role-selection');
const selectedDeptName = document.getElementById('selected-dept-name');
const roleCards = document.querySelectorAll('.role-card');
const btnBackToDept = document.getElementById('btn-back-to-dept');
const mainHeader = document.getElementById('main-header');
const currentTeamDisplay = document.getElementById('current-team-display');

// 愿由ъ옄 紐⑤뱶 DOM
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

// ?곹깭 愿由?
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

// 湲곕낯 遺??紐⑸줉
const DEFAULT_DEPTS = [
    { id: 'dept-1', name: '?붿옄?멸린?띾?' },
    { id: 'dept-2', name: '?뚯옱媛쒕컻遺' },
    { id: 'dept-3', name: '?ㅽ??쇰쭅遺' },
    { id: 'dept-4', name: '?앹궛?꾨왂遺' },
    { id: 'dept-5', name: '留덉??낅?' },
    { id: 'dept-6', name: '?덉쭏愿由щ?' }
];

// Splash Screen Logic
btnEnterGame.addEventListener('click', () => {
    // 1. 媛뺣젹???앹뾽 "?뱀떊??遺?쒕뒗 臾댁뾿?낅땲源?" ?꾩슦湲?
    geniusModal.classList.remove('hidden');
    
    // 2. 2.5珥????앹뾽怨??ㅽ뵆?섏떆 ?붾㈃ 紐⑤몢 ?щ씪吏怨?Screen 0 ?깆옣
    setTimeout(() => {
        geniusModal.classList.add('hidden');
        screenSplash.classList.add('hidden');
        screen0.classList.remove('hidden');
    }, 2500);
});

// 遺??愿由?
function getDepartments() {
    const saved = localStorage.getItem('rebrand_departments');
    if (saved) return JSON.parse(saved);
    localStorage.setItem('rebrand_departments', JSON.stringify(DEFAULT_DEPTS));
    return DEFAULT_DEPTS;
}

function saveDepartments(depts) {
    localStorage.setItem('rebrand_departments', JSON.stringify(depts));
}

// ?붾㈃ ?뚮뜑留?
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
            <button class="btn-delete" data-id="${dept.id}">??젣</button>
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

// 遺???좏깮
async function selectDepartment(dept) {
    currentDeptId = dept.id;
    currentDeptName = dept.name;
    
    selectedDeptName.textContent = dept.name;
    deptSelection.classList.add('hidden');
    roleSelection.classList.remove('hidden');

    // Firestore?먯꽌 遺??臾몄꽌媛 ?놁쑝硫??앹꽦
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

// 吏곴툒 ?쒖꽦???곹깭 ?뺤씤
async function checkRoleAvailability() {
    roleCards.forEach(async (card) => {
        const role = card.getAttribute('data-role');
        const roleRef = doc(db, `departments/${currentDeptId}/roles`, role);
        const snap = await getDoc(roleRef);
        
        if (snap.exists() && snap.data().taken) {
            card.disabled = true;
            card.innerHTML = `<h3>${role}</h3><p>(?좏깮 ?꾨즺)</p>`;
        } else {
            card.disabled = false;
            card.innerHTML = `<h3>${role}</h3><p>${getRoleDesc(role)}</p>`;
        }
    });
}

function getRoleDesc(role) {
    switch(role) {
        case '?명꽩': return '吏곸젒?곸씤 ?⑥꽌 ?먯깋';
        case '?ъ썝': return '?먮즺 ?댁꽍 諛?遺꾩꽍';
        case '李⑥옣': return '?듭떖 媛쒕뀗 ?꾩텧';
        case '遺??: return '醫낇빀 ?먮떒 諛??쒖텧';
    }
}

// 吏곴툒 ?좏깮 (?몃옖??뀡)
roleCards.forEach(card => {
    card.addEventListener('click', async () => {
        if (card.disabled) return;
        const role = card.getAttribute('data-role');
        
        try {
            const roleRef = doc(db, `departments/${currentDeptId}/roles`, role);
            await runTransaction(db, async (transaction) => {
                const docSnap = await transaction.get(roleRef);
                if (docSnap.exists() && docSnap.data().taken) {
                    throw "?대? ?좏깮??吏곴툒?낅땲??";
                }
                transaction.set(roleRef, { taken: true, timestamp: Date.now() });
            });
            
            // ?깃났
            currentRole = role;
            saveSessionState();
            alert(`${role} 吏곴툒?쇰줈 ?쒖옉?⑸땲??`);
            
            // ?ㅼ씠?대━ ?섍린???섏씠吏 ?? ?좊땲硫붿씠?섏쑝濡??붾㈃ ?꾪솚
            screen0.classList.add('page-turn-out');
            setTimeout(() => {
                screen0.classList.add('hidden');
                screen0.classList.remove('page-turn-out');
                
                screen1.classList.remove('hidden');
                screen1.classList.add('page-turn-in');
                setTimeout(() => screen1.classList.remove('page-turn-in'), 800);
                
                startScreen1(); // ?붾㈃ 1(?ㅽ봽?? ?뗮똿
            }, 800);
            
        } catch (e) {
            alert(e);
            checkRoleAvailability(); // ?곹깭 媛깆떊
        }
    });
});

// ?ㅻ줈媛湲?
btnBackToDept.addEventListener('click', () => {
    currentDeptId = null;
    currentDeptName = null;
    currentRole = null;
    clearSessionState();
    roleSelection.classList.add('hidden');
    deptSelection.classList.remove('hidden');
});

// ??븷 蹂寃?(濡쒓렇?꾩썐 - ?곗씠???좎?)
const btnLogoutRoles = document.querySelectorAll('#btn-logout-role, .btn-logout-role');
btnLogoutRoles.forEach(btn => {
    btn.addEventListener('click', () => {
        if (confirm("?꾩옱 ??븷?먯꽌 濡쒓렇?꾩썐?섏떆寃좎뒿?덇퉴? (??먮뱾??湲곗븞 湲곕줉? DB??洹몃?濡?蹂댁〈?⑸땲??)")) {
            currentRole = null;
            sessionStorage.removeItem('currentRole');
            location.reload();
        }
    });
});

// 愿由ъ옄 紐⑤뱶 濡쒖쭅 (5踰??대┃ ???쒖꽦??
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
    if (confirm("?뺣쭚 紐⑤뱺 遺???곗씠?곗? 吏곴툒 ?좏깮 湲곕줉??珥덇린?뷀븯?쒓쿋?듬땲源? (?섎룎由????놁뒿?덈떎!)")) {
        const depts = getDepartments();
        const roles = ['?명꽩', '?ъ썝', '李⑥옣', '遺??];
        for (const dept of depts) {
            try {
                // 遺??湲곕낯 ?뺣낫 諛??ㅽ뀒?댁? 珥덇린??
                await setDoc(doc(db, 'departments', dept.id), {
                    name: dept.name,
                    currentStage: 0,
                    managerFinalAnswer1: "",
                    managerFinalAnswer2: "",
                    stage2Pw: "",
                    reasoningWords: [],
                    qrScanned: false
                });
                
                // QR ?쇱뒪 ?곹깭 珥덇린??
                await setDoc(doc(db, 'pieces', dept.id), {
                    unlocked: false
                });

                // 吏곴툒 ?곹깭 珥덇린??
                for (const role of roles) {
                    await setDoc(doc(db, `departments/${dept.id}/roles`, role), { 
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
        
        alert("珥덇린?붾릺?덉뒿?덈떎.");
        location.reload();
    }
});

// ?뚯뒪?몄슜 鍮좊Ⅸ ?꾩껜 珥덇린??踰꾪듉
const btnEasyReset = document.getElementById('btn-easy-reset');
if (btnEasyReset) {
    btnEasyReset.addEventListener('click', async () => {
        if (confirm("紐⑤뱺 遺??湲곕줉怨??곗씠??踰좎씠??吏꾪뻾 ?곹솴???꾩쟾??珥덇린?뷀븯怨?泥섏쓬遺??0?④퀎) ?ㅼ떆 ?쒖옉?섏떆寃좎뒿?덇퉴?")) {
            const depts = getDepartments();
        const roles = ['?명꽩', '?ъ썝', '李⑥옣', '遺??];
            
            // 紐⑤뱺 遺?쒖쓽 沅뚰븳 諛섑솚 諛??ㅽ뀒?댁? 0?쇰줈 ?섎룎由ш린 (?꾩쟾 珥덇린??
            for (const dept of depts) {
                try {
                    await setDoc(doc(db, 'departments', dept.id), {
                        name: dept.name,
                        currentStage: 0,
                        managerFinalAnswer1: "",
                        managerFinalAnswer2: "",
                        stage2Pw: "",
                        reasoningWords: [],
                        qrScanned: false
                    });
                    await setDoc(doc(db, 'pieces', dept.id), { unlocked: false });
                } catch(e) { console.error(e); }

                for (const role of roles) {
                    try {
                        await setDoc(doc(db, `departments/${dept.id}/roles`, role), { 
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
            
            alert("?꾨꼍?섍쾶 珥덇린?붾릺?덉뒿?덈떎! 源⑤걮???곹깭?먯꽌 ?쒖옉?⑸땲??");
            location.reload();
        }
    });
}

// ?뚯뒪?몄슜 ?ㅼ쿇??異붾줎 諛붾줈媛湲?踰꾪듉
const debugRoleBtns = document.querySelectorAll('.btn-debug-role');
debugRoleBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
        currentDeptId = 'test-dept'; // ?꾩쓽??遺??
        currentRole = btn.getAttribute('data-role');
        currentDeptName = '?뚯뒪?몃???;
        sessionStorage.setItem('currentRole', currentRole);
        
        // 遺??臾몄꽌 媛뺤젣 ?앹꽦 (updateDoc ?ㅻ쪟 諛⑹?)
        try {
            await setDoc(doc(db, 'departments', currentDeptId), {
                name: '?뚯뒪?몃???,
                currentStage: 1
            }, { merge: true });
        } catch(e) { console.error(e); }

        document.getElementById('screen-splash').classList.remove('active');
        
        // ?뺤떇 ??珥덇린??(??怨쇱젙?먯꽌 onSnapshot???쒕?濡?臾띠씠怨??붾㈃ 1???뺤긽 ?뗮똿??
        initApp();
        
        setTimeout(() => showReasoningModal(PUZZLE_DATA.stage1, 2), 800);
    });
});

// ?섏씠吏 ?ㅽ궢 濡쒖쭅
const skipButtons = document.querySelectorAll('.btn-skip');
skipButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
        const targetStage = parseInt(btn.getAttribute('data-target'));
        
        if (!currentDeptId || !currentRole) {
            const forceTest = confirm("?꾩옱 ?좏깮??遺?쒕굹 吏곴툒???놁뒿?덈떎! ?뚯뒪?몄슜 '?뚯뒪?몃???遺?? 沅뚰븳?쇰줈 媛뺤젣 ?낆옣?섏떆寃좎뒿?덇퉴?");
            if (forceTest) {
                currentDeptId = 'test-dept-' + Date.now(); // ?꾩떆 遺???앹꽦
                currentDeptName = '?뚯뒪?몃???;
                currentRole = '遺??;
                saveSessionState();
            } else {
                return;
            }
        }
        
        if (confirm(`${targetStage}?④퀎濡?媛뺤젣 ?대룞?섏떆寃좎뒿?덇퉴?`)) {
            try {
                // 遺??臾몄꽌媛 ?놁쑝硫??꾩떆 ?앹꽦
                await setDoc(doc(db, 'departments', currentDeptId), {
                    name: currentDeptName,
                    currentStage: targetStage,
                    startTime: Date.now()
                }, { merge: true });
                
                // 紐⑤떖 ?リ린
                adminModal.classList.add('hidden');
                
                // 紐⑤뱺 ?붾㈃ ?④린湲?
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
                    alert(`${targetStage}?④퀎 ?붾㈃? ?꾩쭅 怨듭궗 以묒엯?덈떎! ?앸뵳?앸뵳 ?썱截?);
                }
                
            } catch(e) {
                console.error(e);
            }
        }
    });
});

// ==========================================
// Screen 1: ?ㅽ봽??濡쒖쭅
// ==========================================
let introParagraphs = [];
let currentIntroIndex = 0;

function startScreen1() {
    mainHeader.classList.remove('hidden');
    currentTeamDisplay.textContent = `${currentDeptName} - ${currentRole}`;

    // ?ㅽ봽???ㅽ넗由?紐⑤떖 以鍮?
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
            
            // 而⑦뀒?대꼫 ?ㅽ겕濡?留??꾨옒濡?
            container.parentElement.scrollTop = container.parentElement.scrollHeight;
            
            if (currentIntroIndex === introParagraphs.length - 1) {
                btnNext.classList.add('hidden');
                btnClose.classList.remove('hidden');
            }
        }
    };

    introModal.classList.remove('hidden');
    
    // ?곸긽 ?먮룞 ?ъ깮 ?쒕룄
    if (introVideo) {
        introVideo.play().catch(e => console.log("?먮룞 ?ъ깮 諛⑹???, e));
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
    // 珥덇린?먮뒗 臾댁옉?꾨줈 ?욎뼱??諛곗튂
    const shuffledCards = [...PUZZLE_DATA.opening.cards].sort(() => Math.random() - 0.5);
    
    shuffledCards.forEach(cardData => {
        const card = document.createElement('div');
        card.className = 'flip-card';
        card.setAttribute('draggable', 'true');
        card.dataset.id = cardData.id;
        card.dataset.back = cardData.back;

        // ?댁쭏?ъ쭊 ?먮굦???꾪빐 ?쎄컙???쒕뜡 ?뚯쟾怨??ㅽ봽??遺??
        const randomRot = (Math.random() - 0.5) * 10; // -15??~ +15??
        const randomY = (Math.random() - 0.5) * 10;   // -10px ~ +10px
        card.style.transform = `rotate(${randomRot}deg) translateY(${randomY}px)`;
        
        card.innerHTML = `
            <div class="flip-card-inner">
                <div class="flip-card-front" style="background-image: url('splash_bg.png'); background-size: cover; background-position: center; border: 2px solid var(--accent-gold);">
                    <!-- ?욌㈃? ?④꺼吏??곹깭 -->
                    <span style="background: rgba(0,0,0,0.7); padding: 5px; border-radius: 4px; font-weight: bold; color: white;">議곗궗 移대뱶</span>
                </div>
                <div class="flip-card-back" style="display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 1rem;">
                    <span style="font-size: 0.85rem; font-family: 'Noto Sans KR'; font-weight: 500; word-break: keep-all; line-height: 1.5; color: var(--text-main);">${cardData.text}</span>
                    <!-- ?レ옄???붾㈃??蹂댁뿬二쇱? ?딄퀬 ?ㅼ쭅 ?뺣젹 ?쒖꽌 泥댄겕?⑹쑝濡쒕쭔 ?ъ슜?⑸땲??-->
                </div>
            </div>
        `;

        // ?ㅼ쭛湲??대깽??
        card.addEventListener('click', () => {
            card.classList.toggle('flipped');
            checkUnlockCondition();
        });

        // ?쒕옒洹????쒕∼ ?대깽??
        card.addEventListener('dragstart', (e) => {
            card.classList.add('dragging');
        });
        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
            checkUnlockCondition();
        });

        openingCardsContainer.appendChild(card);
    });

    // 而⑦뀒?대꼫 ?쒕옒洹??뺣젹 濡쒖쭅
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

    // 紐⑤컮???곗튂(?쒕옒洹? 吏??
    let touchDragging = null;
    openingCardsContainer.addEventListener('touchstart', e => {
        if (e.target.closest('.flip-card')) {
            touchDragging = e.target.closest('.flip-card');
            // ?곗튂 ?쒖옉 ??諛붾줈 ?ㅼ쭛?덉? ?딅룄濡??쎄컙???쒕젅??
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

// ?쒕옒洹??꾩튂 怨꾩궛 ?⑥닔
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

// ?좉툑 ?댁젣 議곌굔 寃??(?쇰뱶諛깆슜 ?쒓컖???④낵留?
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

// ?좉툑 ?댁젣 踰꾪듉 ?대┃
btnUnlock.addEventListener('click', () => {
    const cards = [...openingCardsContainer.querySelectorAll('.flip-card')];
    const isAllFlipped = cards.every(c => c.classList.contains('flipped'));
    const currentOrder = cards.map(c => c.dataset.back).join('');

    if (!isAllFlipped) {
        alert("紐⑤뱺 議곗궗 移대뱶瑜??ㅼ쭛???댁슜???뺤씤?댁＜?몄슂!");
        return;
    }
    
    if (currentOrder !== '1234') {
        alert("?쒖꽌媛 ??몄뒿?덈떎. ?섎쪟 ?앹궛遺???먭린源뚯? ?섍꼍 ?ㅼ뿼??諛쒖깮?섎뒗 ?щ컮瑜??쒖꽌?濡??섏뿴?대낫?몄슂!");
        return;
    }

    diaryText.textContent = PUZZLE_DATA.opening.diaryText;
    diaryModal.classList.remove('hidden');
});

// ?ㅼ씠?대━ ???쒖텧
btnSubmitOpening.addEventListener('click', async () => {
    const selected = document.querySelector('input[name="flow-type"]:checked');
    if (!selected) {
        alert('?듭쓣 ?좏깮?댁＜?몄슂.');
        return;
    }

    if (selected.value === PUZZLE_DATA.opening.answer) {
        // ?뺣떟 ??
        openingErrorMsg.classList.add('hidden');
        diaryModal.classList.add('hidden');
        alert('?뺣떟?낅땲?? 1?④퀎濡??대룞?⑸땲??');
        
        // ?곹깭 ?낅뜲?댄듃
        try {
            await updateDoc(doc(db, 'departments', currentDeptId), {
                currentStage: 1
            });
        } catch(e) { console.error(e); }

        // 1?④퀎 ?붾㈃?쇰줈 ?꾪솚
        document.getElementById('screen-1').classList.add('hidden');
        document.getElementById('screen-2').classList.remove('hidden');
        startScreen2();
    } else {
        openingErrorMsg.classList.remove('hidden');
    }
});

// ==========================================
// Screen 2: 1?④퀎 (?붿옄?몄슂?뚯떎) 濡쒖쭅
// ==========================================
function startScreen2(deptData) {
    mainHeader.classList.remove('hidden');
    currentTeamDisplay.textContent = `${currentDeptName} - ${currentRole}`;
    
    document.getElementById('display-current-role').textContent = currentRole;
    
    // 1?④퀎 ?ㅽ넗由?紐⑤떖 ?꾩슦湲?
    if (!(deptData && deptData.showStage1Reasoning)) {
        document.getElementById('stage1-story-modal').classList.remove('hidden');
    }
    
    document.getElementById('btn-start-stage1-missions').onclick = () => {
        document.getElementById('stage1-story-modal').classList.add('hidden');
    };
    
    // 誘몄뀡 1-1 (紐쏀?二? ?명똿
    const montageData = PUZZLE_DATA.stage1.montage[currentRole];

    if (!montageData) {
        console.error('Invalid currentRole for montageData:', currentRole);
        alert('??釉??怨쀬뵠?怨? ?醫륁뒞??? ??녿뮸??덈뼄.');
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
                alert('?뺣떟?낅땲?? ?ㅼ쓬 誘몄뀡???대졇?듬땲??');
                optionsContainer.querySelectorAll('button').forEach(b => b.disabled = true);
                const m2 = document.getElementById('mission-1-2');
                if (m2) {
                    m2.classList.remove('hidden');
                    m2.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            } else {
                alert('??몄뒿?덈떎. ?⑥꽌瑜??ㅼ떆 ?뺤씤?대낫?몄슂.');
                btn.classList.remove('selected');
            }
        });
        optionsContainer.appendChild(btn);
    });

    // 誘몄뀡 1-2 (?먮떒 援먯쭛?? ?명똿
    const fabricData = PUZZLE_DATA.stage1.fabricStandards[currentRole];
    document.getElementById('fabric-clue-title').textContent = fabricData.title;
    document.getElementById('fabric-clue-text').textContent = fabricData.text;
    
    const btnSubmitM2 = document.getElementById('btn-submit-mission-1-2');
    if (btnSubmitM2) {
        btnSubmitM2.textContent = currentRole === '遺?? ? '理쒖쥌 ?뱀씤?섍린' : '遺?λ떂猿?寃곗옱 ?щ━湲?;
    }
    
    document.querySelectorAll('.fabric-btn').forEach(btn => {
        // 蹂듭닔 ?좏깮 媛?ν븯?꾨줉 ?좉?
        btn.onclick = () => btn.classList.toggle('selected');
    });

    document.getElementById('btn-submit-mission-1-2').onclick = () => {
        const selectedButtons = Array.from(document.querySelectorAll('.fabric-btn.selected'));
        if (selectedButtons.length === 0) {
            alert('?먮떒???섎굹 ?댁긽 ?좏깮?댁＜?몄슂.');
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
            alert(currentRole === '遺?? ? '?뺣떟?낅땲?? ?꾨꼍???먮떒??怨⑤씪 理쒖쥌 ?뱀씤?섏뀲?듬땲??' : '?뺣떟?낅땲?? 遺?λ떂猿?湲곗븞??臾댁궗???곸떊?덉뒿?덈떎!');
            document.getElementById('btn-submit-mission-1-2').disabled = true;
            document.getElementById('btn-submit-mission-1-2').textContent = currentRole === '遺?? ? '理쒖쥌 ?뱀씤 ?꾨즺' : '寃곗옱 ?붿껌 ?꾨즺 (湲곗븞 ?곸떊)';
            document.querySelectorAll('.fabric-btn').forEach(b => b.disabled = true);
            
            const m3 = document.getElementById('mission-1-3');
            if (m3) {
                m3.classList.remove('hidden');
                m3.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        } else {
            alert('??몄뒿?덈떎. ?깅텇?쒖? 議곌굔???ㅼ떆 ?쒕쾲 瑗쇨세???뺤씤?섏꽭??');
        }
    };

    // 誘몄뀡 1-3 (?ㅼ쿇??異붾줎) ?명똿
    const reasoningData = PUZZLE_DATA.stage1.reasoning;
    document.getElementById('reasoning-context').innerHTML = reasoningData.context.replace(/\n/g, '<br>');
    document.getElementById('reasoning-role-label').textContent = reasoningData.roleLabels[currentRole];

    if (currentRole === '遺??) {
        document.getElementById('manager-montage-panel').classList.remove('hidden');
        document.getElementById('manager-submit-panel').classList.remove('hidden');
        document.getElementById('btn-stage1-confirm-all').style.display = 'none'; // 遺?μ? ?꾩껜 ?쒖텧 李??댁슜
        document.getElementById('reasoning-textarea').style.display = 'none'; // 遺?μ? 紐⑤떖?먯꽌 ?낅젰
        document.getElementById('reasoning-role-label').textContent = "遺?λ떂? ??먮뱾??紐⑤몢 ?⑥꽌? ?섍껄???쒖텧???뚭퉴吏 湲곕떎??二쇱꽭?? ?섎떒??'理쒖쥌 ?뺣떟 ?쒖텧'???꾨즺?섎㈃ ?좊줎 李쎌씠 ?대┰?덈떎.";
        document.getElementById('reasoning-role-label').style.color = '#ff9f43';
        
        // 遺???꾩슜 ?ㅼ떆媛?????꾪솴 紐⑤땲?곕쭅
        onSnapshot(collection(db, `departments/${currentDeptId}/roles`), (snapshot) => {
            let allConfirmed = true;
            const requiredRoles = ['?명꽩', '?ъ썝', '李⑥옣'];
            
            requiredRoles.forEach(role => {
                const statusEl = document.getElementById(`status-${role}`);
                if (!statusEl) return;
                
                const roleDoc = snapshot.docs.find(d => d.id === role);
                const isConfirmed = roleDoc && roleDoc.data().stage1Confirmed;
                const reasoningText = roleDoc ? roleDoc.data().reasoning : "";
                
                const reasoningDisplay = statusEl.querySelector('.reasoning-display');
                if (isConfirmed) {
                    statusEl.classList.add('done');
                    statusEl.querySelector('.status-icon').textContent = '??;
                    if (reasoningDisplay && reasoningText) {
                        reasoningDisplay.textContent = `"${reasoningText}"`;
                        reasoningDisplay.style.display = 'block';
                    }
                } else {
                    statusEl.classList.remove('done');
                    statusEl.querySelector('.status-icon').textContent = '??;
                    if (reasoningDisplay) reasoningDisplay.style.display = 'none';
                    allConfirmed = false;
                }
            });
            
            // ?뚯뒪???몄쓽瑜??꾪빐 ??먯씠 紐⑤몢 ?쒖텧?섏? ?딆븘??遺??踰꾪듉 ??긽 ?쒖꽦??
            document.getElementById('btn-submit-stage1').disabled = false;
        });
        
        // 遺???꾩슜 理쒖쥌 ?쒖텧 踰꾪듉
        const btnSubmitStage1 = document.getElementById('btn-submit-stage1');
        btnSubmitStage1.onclick = async () => {
            const finalAnswer1 = document.getElementById('manager-final-answer-1').value;
            const finalAnswer2 = document.getElementById('manager-final-answer-2').value;
            const errorMsg = document.getElementById('manager-error-msg');
            
            if (!finalAnswer1 || !finalAnswer2) {
                alert('誘몄뀡 1(紐쏀?二?怨?誘몄뀡 2(移쒗솚寃???理쒖쥌 ?뺣떟??紐⑤몢 ?좏깮?댁＜?몄슂.');
                return;
            }
            
            if (finalAnswer1 === 'B' && finalAnswer2 === 'H') {
                errorMsg.classList.add('hidden');
                btnSubmitStage1.disabled = true;
                btnSubmitStage1.textContent = '理쒖쥌 ?뱀씤 ?꾨즺 (?ㅼ쿇??異붾줎 吏꾪뻾以?';
                
                try {
                    await updateDoc(doc(db, 'departments', currentDeptId), {
                        showStage1Reasoning: true
                    });
                    alert('?럦 紐⑤뱺 ??먯쓽 ?섍껄??醫낇빀?섏뿬 吏꾩쭨 ?꾩븞怨??먮떒??李얠븯?듬땲??\n\n?댁젣 ?앹뾽?섎뒗 \'?ㅼ쿇??異붾줎\' 臾몄젣瑜?遺?쒖썝?ㅺ낵 ?좊줎?섏뿬 ?닿껐?섏꽭??');
                    showReasoningModal(PUZZLE_DATA.stage1, 2);
                } catch(e) {
                    console.error(e);
                }
                
            } else {
                errorMsg.classList.remove('hidden');
                errorMsg.textContent = '?ㅻ떟?낅땲?? ??먮뱾??紐⑥븘???⑥꽌(援먯쭛??瑜??ㅼ떆 ?쒕쾲 遺꾩꽍?대낫?몄슂.';
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
                    alert('?섍껄??議곌툑 ???곸꽭???곸뼱??湲곗븞?댁＜?몄슂.');
                    return;
                }
                
                try {
                    const roleRef = doc(db, `departments/${currentDeptId}/roles`, currentRole);
                    await updateDoc(roleRef, { stage1Confirmed: true, reasoning: textarea.value });
                    
                    alert('遺?λ떂猿?理쒖쥌 湲곗븞(寃곗옱 ?붿껌)??臾댁궗???섍꼈?듬땲?? 遺?λ떂??紐⑤몢???섍껄??痍⑦빀??理쒖쥌 ?뱀씤???뚭퉴吏 ?湲고빐二쇱꽭??');
                    btnConfirmAll.disabled = true;
                    btnConfirmAll.textContent = '湲곗븞 ?곸떊 ?꾨즺 (遺???뱀씤 ?湲?以?..)';
                    textarea.disabled = true;
                } catch(e) {
                    console.error(e);
                    alert('湲곗븞 ?곸떊 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.');
                }
            };
        }
        
        
    }
}

// ==========================================
// Screen 3: 2?④퀎 (?⑦꽩/遊됱젣?? 濡쒖쭅
// ==========================================
function startScreen3() {
    mainHeader.classList.remove('hidden');
    currentTeamDisplay.textContent = `${currentDeptName} - ${currentRole}`;
    
    document.getElementById('display-current-role-stage2').textContent = currentRole;
    
    // 2?④퀎 ?ㅽ넗由?紐⑤떖 ?꾩슦湲?
    const storyModal = document.getElementById('stage2-story-modal');
    storyModal.classList.remove('hidden');
    
    document.getElementById('stage2-intro-text').innerText = PUZZLE_DATA.stage2.intro;
    
    document.getElementById('btn-start-stage2-missions').onclick = () => {
        storyModal.classList.add('hidden');
    };
    
    const puzzleData = PUZZLE_DATA.stage2.puzzles[currentRole];
    
    if (currentRole === '遺??) {
        document.getElementById('stage2-employee-panel').classList.add('hidden');
        document.getElementById('stage2-manager-panel').classList.remove('hidden');
        
        // 遺???꾪솴??由ъ뒪??
        onSnapshot(collection(db, `departments/${currentDeptId}/roles`), (snapshot) => {
            const roles = ['?명꽩', '?ъ썝', '李⑥옣'];
            let allConfirmed = true;
            
            roles.forEach(role => {
                const statusEl = document.getElementById(`status-stage2-${role}`);
                if (!statusEl) return;
                
                const roleDoc = snapshot.docs.find(d => d.id === role);
                const isConfirmed = roleDoc && roleDoc.data().stage2Confirmed;
                
                if (isConfirmed) {
                    statusEl.classList.add('done');
                    statusEl.querySelector('.status-icon').textContent = '??;
                    statusEl.style.background = 'rgba(0,100,0,0.5)';
                } else {
                    statusEl.classList.remove('done');
                    statusEl.querySelector('.status-icon').textContent = '??;
                    statusEl.style.background = 'rgba(0,0,0,0.5)';
                    allConfirmed = false;
                }
            });
            
            // ?뚯뒪???몄쓽瑜??꾪빐 遺??踰꾪듉 ??긽 ?쒖꽦??
            document.getElementById('btn-submit-stage2').disabled = false;
        });
        
        // 遺??湲덇퀬 媛??踰꾪듉
        document.getElementById('btn-submit-stage2').onclick = async () => {
            const pw = document.getElementById('manager-vault-pw').value;
            if (pw === PUZZLE_DATA.stage2.puzzles['遺??].answer) {
                document.getElementById('manager-error-msg-stage2').classList.add('hidden');
                
                // Firestore瑜?癒쇱? ?낅뜲?댄듃?섏뿬 ?ㅻⅨ ??먮뱾???붾㈃???섏뼱媛寃???
                try {
                    await updateDoc(doc(db, 'departments', currentDeptId), {
                        currentStage: 3
                    });
                    
                    alert("?럦 怨듭옣 媛???꾨즺! 2?④퀎 ?덉텧 ?깃났!\n\n(3?④퀎 ?ㅽ??쇰쭅?ㅻ줈 ?대룞?⑸땲??)");
                } catch(e) {
                    console.error(e);
                }
            } else {
                document.getElementById('manager-error-msg-stage2').classList.remove('hidden');
            }
        };
        
    } else {
        // ?ъ썝/?명꽩/李⑥옣
        document.getElementById('stage2-employee-panel').classList.remove('hidden');
        document.getElementById('stage2-manager-panel').classList.add('hidden');
        
        document.getElementById('stage2-puzzle-title').textContent = puzzleData.title;
        document.getElementById('stage2-puzzle-text').textContent = puzzleData.text;
        document.getElementById('stage2-puzzle-hint').textContent = `?뚰듃: ${puzzleData.hint}`;
        
        const btnSubmit = document.getElementById('btn-stage2-submit');
        const input = document.getElementById('stage2-answer-input');
        
        btnSubmit.onclick = async () => {
            if (input.value === puzzleData.answer) {
                alert(`?뺣떟?낅땲?? ?뱀떊??李얠? ?レ옄??[ ${puzzleData.answer} ] ?낅땲??\n遺?λ떂?먭쾶 ???レ옄瑜??쒖꽌?濡??뚮젮二쇱꽭??`);
                btnSubmit.disabled = true;
                btnSubmit.textContent = "?대룆 ?꾨즺 (?湲?以?";
                input.disabled = true;
                
                // Firebase ?낅뜲?댄듃
                try {
                    await setDoc(doc(db, `departments/${currentDeptId}/roles`, currentRole), {
                        stage2Confirmed: true,
                        stage2Answer: puzzleData.answer
                    }, { merge: true });
                } catch(e) {
                    console.error(e);
                }
                
            } else {
                alert("鍮꾨?踰덊샇媛 ??몄뒿?덈떎. ?뚰듃瑜??ㅼ떆 ?쎌뼱蹂댁꽭??");
            }
        };
    }
}

// ==========================================
// Screen 4: 3?④퀎 (?ㅽ??쇰쭅?? 濡쒖쭅
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
    
    if (currentRole === '遺??) {
        document.getElementById('stage3-employee-panel').classList.add('hidden');
        document.getElementById('stage3-manager-panel').classList.remove('hidden');
        
        onSnapshot(collection(db, `departments/${currentDeptId}/roles`), (snapshot) => {
            const roles = ['?명꽩', '?ъ썝', '李⑥옣'];
            roles.forEach(role => {
                const statusEl = document.getElementById(`status-stage3-${role}`);
                if (!statusEl) return;
                
                const roleDoc = snapshot.docs.find(d => d.id === role);
                const isConfirmed = roleDoc && roleDoc.data().stage3Confirmed;
                
                if (isConfirmed) {
                    statusEl.classList.add('done');
                    statusEl.querySelector('.status-icon').textContent = '??;
                    statusEl.style.background = 'rgba(0,100,0,0.5)';
                } else {
                    statusEl.classList.remove('done');
                    statusEl.querySelector('.status-icon').textContent = '??;
                    statusEl.style.background = 'rgba(0,0,0,0.5)';
                }
            });
        });
        
        document.getElementById('stage3-manager-title').textContent = "?⑥꽌 1: ?쇱뒪??而щ윭 醫낇빀";
        document.getElementById('stage3-manager-text').innerHTML = personalColorData.text.replace(/\n/g, '<br>');
        
        document.getElementById('btn-stage3-manager-submit').onclick = () => {
            const val = document.getElementById('stage3-manager-answer-input').value.replace(/\s+/g, '');
            if (val === personalColorData.answer) {
                alert("?뺣떟?낅땲?? ?댁젣 ??먮뱾??紐⑥? ?⑥꽌濡?理쒖쥌 ?ㅽ??쇰쭅???꾩꽦?섏꽭??");
                document.getElementById('stage3-manager-step1').classList.add('hidden');
                document.getElementById('stage3-manager-step2').classList.remove('hidden');
            } else {
                alert("?ㅻ떟?낅땲?? ?ㅼ떆 ?앷컖?대낫?몄슂.");
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
        
        btnSubmit.onclick = async () => {
            if (selectedItems['line'] === '媛濡쒖꽑' && 
                selectedItems['color'] === '?쒖깋' && 
                selectedItems['material'] === '六ｋ빰?? &&
                selectedItems['pattern'] === '?묒?臾대뒳') {
                
                errorMsg.classList.add('hidden');
                alert("?럦 ?꾨꼍?⑸땲?? ?섍꼍怨??붿옄?몄쓣 紐⑤몢 怨좊젮??移쒗솚寃??섎쪟 而щ젆?섏씠 ?꾩꽦?섏뿀?듬땲??\n?댁젣 ?앹뾽?섎뒗 '?ㅼ쿇??異붾줎' 臾몄젣瑜?遺?쒖썝?ㅺ낵 ?좊줎?섏뿬 ?닿껐?섏꽭??");
                btnSubmit.disabled = true;
                
                try {
                    await updateDoc(doc(db, 'departments', currentDeptId), {
                        showStage3Reasoning: true
                    });
                    showReasoningModal(PUZZLE_DATA.stage3, 4);
                } catch(e) {
                    console.error(e);
                }
                
            } else {
                errorMsg.classList.remove('hidden');
            }
        };
        
    } else {
        document.getElementById('stage3-employee-panel').classList.remove('hidden');
        document.getElementById('stage3-manager-panel').classList.add('hidden');
        
        document.getElementById('stage3-puzzle-title').textContent = "?⑥꽌 1: ?쇱뒪??而щ윭";
        document.getElementById('stage3-puzzle-text').innerHTML = personalColorData.text.replace(/\n/g, '<br>');
        document.getElementById('stage3-puzzle-hint').textContent = '';
        
        const btnSubmit = document.getElementById('btn-stage3-submit');
        const input = document.getElementById('stage3-answer-input');
        
        let currentStep = 1;
        
        btnSubmit.onclick = async () => {
            if (currentStep === 1) {
                if (input.value.replace(/\s+/g, '') === personalColorData.answer) {
                    alert(`?뺥솗???⑥꽌瑜?李얠븯?듬땲??\n?ㅼ쓬 ?⑥꽌瑜??뺤씤?섏꽭??`);
                    currentStep = 2;
                    input.value = '';
                    document.getElementById('stage3-puzzle-title').textContent = "?⑥꽌 2: 李⑹떆?④낵 ?좏깮";
                    document.getElementById('stage3-puzzle-text').innerHTML = PUZZLE_DATA.stage3.bodyType.memo.replace(/\n/g, '<br>') + '<br><br>' + bodyTypeData.text;
                } else {
                    alert("?ㅻ떟?낅땲?? 荑⑦넠怨??쒗넠 以??섎굹瑜??낅젰?섏꽭??");
                }
            } else if (currentStep === 2) {
                if (input.value.replace(/\s+/g, '') === bodyTypeData.answer) {
                    alert(`紐⑤뱺 ?⑥꽌瑜?李얠븯?듬땲?? 遺?λ떂?먭쾶 ?뚮젮二쇱꽭??`);
                    btnSubmit.disabled = true;
                    btnSubmit.textContent = "?꾩넚 ?꾨즺 (?湲?以?";
                    input.disabled = true;
                    
                    try {
                        await setDoc(doc(db, `departments/${currentDeptId}/roles`, currentRole), {
                            stage3Confirmed: true
                        }, { merge: true });
                    } catch(e) {
                        console.error(e);
                    }
                } else {
                    alert("?ㅻ떟?낅땲?? ?ㅼ떆 ?앷컖?대낫?몄슂!");
                }
            }
        };
        
        
    }
}

// 4?④퀎: ?곗묶???湲곗떎 (T.P.O 諛??섍꼍?먯닔)
function startScreen5() {
    document.getElementById('display-current-role-stage4').textContent = currentRole;
    
    // 紐⑤떖 ?꾩슦湲?
    const storyModal = document.getElementById('stage4-story-modal');
    storyModal.classList.remove('hidden');
    document.getElementById('stage4-intro-text').innerHTML = PUZZLE_DATA.stage4.intro.replace(/\n/g, '<br>');
    
    document.getElementById('btn-start-stage4-missions').onclick = () => {
        storyModal.classList.add('hidden');
    };
    
    const puzzleData = PUZZLE_DATA.stage4.puzzles[currentRole];
    
    if (currentRole === '遺??) {
        document.getElementById('stage4-employee-panel').classList.add('hidden');
        document.getElementById('stage4-manager-panel').classList.remove('hidden');
        document.getElementById('reasoning-textarea').classList.add('hidden');
        
        // 遺??Step 1: TPO ?먭?
        document.getElementById('stage4-manager-step1-title').textContent = puzzleData.step1.title;
        document.getElementById('stage4-manager-step1-text').textContent = puzzleData.step1.text;
        
        document.getElementById('btn-stage4-manager-step1').onclick = () => {
            const val = document.getElementById('stage4-manager-step1-input').value.replace(/\s+/g, '');
            if (val === puzzleData.step1.answer) {
                alert('?뺣떟?낅땲?? ?댁젣 ??먮뱾???щ┛ ?⑥꽌瑜?紐⑥븘 5R ?쒖꽌瑜?留욎텛怨?理쒖쥌 ?섍꼍 ?먯닔瑜??낅젰?섏꽭??');
                document.getElementById('stage4-manager-step1').classList.add('hidden');
                document.getElementById('stage4-5r-puzzle').classList.remove('hidden');
            } else {
                alert('?ㅻ떟?낅땲?? ?ㅼ떆 ?앷컖?대낫?몄슂.');
            }
        };

        // 5R ?쒕옒洹????쒕∼ 濡쒖쭅
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
        // --- 罹붾쾭???ㅼ?移섎턿 濡쒖쭅 ---
        const canvas = document.getElementById('design-canvas');
        if (canvas) {
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
                lastX = (e.clientX || e.touches[0].clientX) - rect.left;
                lastY = (e.clientY || e.touches[0].clientY) - rect.top;
            }

            function draw(e) {
                if (!isDrawing) return;
                e.preventDefault(); // ?ㅽ겕濡?諛⑹?
                const rect = canvas.getBoundingClientRect();
                const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
                const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;

                ctx.beginPath();
                ctx.moveTo(lastX, lastY);
                ctx.lineTo(x, y);
                ctx.stroke();
                lastX = x;
                lastY = y;
            }

            function stopDrawing() {
                isDrawing = false;
            }

            canvas.addEventListener('mousedown', startDrawing);
            canvas.addEventListener('mousemove', draw);
            canvas.addEventListener('mouseup', stopDrawing);
            canvas.addEventListener('mouseout', stopDrawing);

            canvas.addEventListener('touchstart', startDrawing, {passive: false});
            canvas.addEventListener('touchmove', draw, {passive: false});
            canvas.addEventListener('touchend', stopDrawing);

            let currentTool = 'pen'; // 'pen', 'pencil', 'brush', 'eraser'
            
            // ?됱긽 踰꾪듉 ?대깽??
            document.querySelectorAll('.color-btn').forEach(btn => {
                btn.onclick = () => {
                    document.querySelectorAll('.color-btn').forEach(b => b.style.borderColor = 'transparent');
                    btn.style.borderColor = 'white';
                    ctx.strokeStyle = btn.getAttribute('data-color');
                };
            });
            
            // ?꾧뎄 踰꾪듉 怨듯넻 泥섎━ ?⑥닔
            const setToolActive = (activeId) => {
                document.querySelectorAll('.btn-tool').forEach(b => b.style.borderColor = 'transparent');
                document.getElementById(activeId).style.borderColor = 'white';
            };

            // ?꾧뎄 踰꾪듉 ?대깽??
            document.getElementById('btn-tool-pen').onclick = () => {
                currentTool = 'pen';
                setToolActive('btn-tool-pen');
                ctx.lineWidth = 5;
                ctx.globalAlpha = 1.0;
                // ?꾩옱 ?좏깮???됱긽 ?좎?
                const activeColor = document.querySelector('.color-btn[style*="border-color: white"]');
                if (activeColor) ctx.strokeStyle = activeColor.getAttribute('data-color');
                else ctx.strokeStyle = '#000000';
            };
            
            document.getElementById('btn-tool-pencil').onclick = () => {
                currentTool = 'pencil';
                setToolActive('btn-tool-pencil');
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.5;
                const activeColor = document.querySelector('.color-btn[style*="border-color: white"]');
                if (activeColor) ctx.strokeStyle = activeColor.getAttribute('data-color');
                else ctx.strokeStyle = '#000000';
            };
            
            document.getElementById('btn-tool-brush').onclick = () => {
                currentTool = 'brush';
                setToolActive('btn-tool-brush');
                ctx.lineWidth = 15;
                ctx.globalAlpha = 0.8;
                const activeColor = document.querySelector('.color-btn[style*="border-color: white"]');
                if (activeColor) ctx.strokeStyle = activeColor.getAttribute('data-color');
                else ctx.strokeStyle = '#000000';
            };

            document.getElementById('btn-tool-eraser').onclick = () => {
                currentTool = 'eraser';
                setToolActive('btn-tool-eraser');
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 20;
                ctx.globalAlpha = 1.0;
            };

            document.getElementById('btn-tool-clear').onclick = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            };
        }
        
        // 罹붾쾭??AI 遺꾩꽍 踰꾪듉
        const btnAnalyzeCanvas = document.getElementById('btn-analyze-canvas');
        if (btnAnalyzeCanvas) {
            btnAnalyzeCanvas.onclick = () => {
                aiFeedback.classList.remove('hidden');
                aiFeedbackText.textContent = "罹붾쾭???대?吏瑜?遺꾩꽍 以묒엯?덈떎...";
                setTimeout(() => {
                    aiFeedbackText.innerHTML = "<b>[Claude Vision API 遺꾩꽍 寃곌낵]</b><br>?섎쪟??吏덇컧?????쒗쁽?섏뿀?쇰ŉ, ?좎쓽 ?먮쫫??紐⑤뜽??泥댄삎??蹂댁셿?????덈룄濡??ㅼ?移섎릺?덉뒿?덈떎. 5R 以?'?ъ궗?? ?붿냼瑜??곸슜?섍린 醫뗭? ?붿옄???뺥깭?낅땲??";
                }, 2500);
            };
        }
        
        // ?뚯씪 ?낅줈????AI 遺꾩꽍 ?몄텧 ?꾩떆 濡쒖쭅
        const fileUpload = document.getElementById('design-upload');
        const aiFeedback = document.getElementById('ai-feedback-panel');
        const aiFeedbackText = document.getElementById('ai-feedback-text');
        
        if (fileUpload) {
            fileUpload.addEventListener('change', () => {
                if(fileUpload.files && fileUpload.files[0]) {
                    aiFeedback.classList.remove('hidden');
                    aiFeedbackText.textContent = "?대?吏瑜?遺꾩꽍 以묒엯?덈떎...";
                    // ?꾩떆 遺꾩꽍 吏???쒓컙
                    setTimeout(() => {
                        aiFeedbackText.innerHTML = "<b>[Claude Vision API 遺꾩꽍 寃곌낵]</b><br>?섎쪟??吏덇컧?????쒗쁽?섏뿀?쇰ŉ, ?좎쓽 ?먮쫫??紐⑤뜽??泥댄삎??蹂댁셿?????덈룄濡??ㅼ?移섎릺?덉뒿?덈떎. 5R 以?'?ъ궗?? ?붿냼瑜??곸슜?섍린 醫뗭? ?붿옄???뺥깭?낅땲??";
                    }, 2500);
                }
            });
        }
        
        const btnLaunch = document.getElementById('btn-launch-show');
        const scoreInput = document.getElementById('stage4-manager-score-input');
        const scoreFill = document.getElementById('eco-score-fill');
        const scoreText = document.getElementById('eco-score-text');

        let teamCorrectCount = 0;

        function checkManagerStage4Complete() {
            const is5RCorrect = JSON.stringify(selected5R) === JSON.stringify(puzzleData.step2.answer);
            const isScoreCorrect = scoreInput.value.trim() === puzzleData.step3.answer;
            const isTeamDone = teamCorrectCount === 3;
            
            // ?쇱옄 ?뚯뒪?명븯湲??쎈룄濡?isTeamDone 議곌굔 ?꾩떆 ?댁젣
            if (is5RCorrect && isScoreCorrect) {
                btnLaunch.disabled = false;
                btnLaunch.style.background = 'linear-gradient(45deg, #FFD700, #FFA500)';
                btnLaunch.style.color = '#000';
                btnLaunch.style.cursor = 'pointer';
                btnLaunch.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.8)';
                btnLaunch.textContent = "?뙚 ?곗묶??媛???뙚";
            } else {
                btnLaunch.disabled = true;
                btnLaunch.style.background = '#555';
                btnLaunch.style.color = '#888';
                btnLaunch.style.cursor = 'not-allowed';
                btnLaunch.style.boxShadow = 'none';
                btnLaunch.textContent = "議곌굔 ?ъ꽦 ???곗묶??媛??";
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
        
        // ??먮뱾???뺣떟 ?꾪솴 ?ㅼ떆媛?媛먯떆
        onSnapshot(collection(db, `departments/${currentDeptId}/roles`), (snapshot) => {
            let correctCount = 0;
            
            snapshot.forEach(docSnap => {
                const r = docSnap.id;
                const d = docSnap.data();
                
                if (['?명꽩', '?ъ썝', '李⑥옣'].includes(r)) {
                    const statusEl = document.getElementById(`status-stage4-${r}`);
                    if (statusEl) {
                        if (d.stage4Confirmed) {
                            statusEl.querySelector('.status-icon').textContent = '??;
                            correctCount++;
                        } else {
                            statusEl.querySelector('.status-icon').textContent = '??;
                        }
                    }
                }
            });
            
            teamCorrectCount = correctCount;
            // 寃뚯씠吏 諛??낅뜲?댄듃 (????ъ꽦??湲곕컲)
            const simulatedScore = Math.floor((correctCount / 3) * 100);
            scoreFill.style.width = `${simulatedScore}%`;
            scoreText.textContent = `${simulatedScore} / 100 ??;
            
            checkManagerStage4Complete();
        });
        
        // ?곗묶 踰꾪듉 ?대┃ (3?④퀎 ?꾨즺) - ?댁젣 DB瑜??낅뜲?댄듃?섏뿬 紐⑤몢?먭쾶 ?곗묶???뚮┝
        btnLaunch.onclick = async () => {
            try {
                await updateDoc(doc(db, 'departments', currentDeptId), {
                    currentStage: 5
                });
            } catch(e) {
                console.error("?곗묶??媛???ㅽ뙣:", e);
                alert("?쒕쾭 ?ㅻ쪟媛 諛쒖깮?덉뒿?덈떎. ?ㅼ떆 ?쒕룄?댁＜?몄슂.");
            }
        };
        
        const btnSubmitPersonal = document.getElementById('btn-submit-personal-design');
        if (btnSubmitPersonal) {
            btnSubmitPersonal.onclick = () => {
                const reason = document.getElementById('personal-reason').value;
                const r5 = document.getElementById('personal-5r').value;
                if (!reason || !r5) {
                    alert('?꾩닔 ?좏깮 ?붿냼(5R)? ?댁쑀瑜??곸뼱二쇱꽭??');
                    return;
                }
                alert('媛쒖씤 ?붿옄???쒖텧???꾨즺?섏뿀?듬땲?? ?쒕룞 ?뚭컧 ?섏씠吏濡??섏뼱媛묐땲??');
                document.getElementById('screen-6').classList.add('hidden');
                document.getElementById('screen-7').classList.remove('hidden');
            };
        }
        
        const btnSubmitReflections = document.getElementById('btn-submit-reflections');
        if (btnSubmitReflections) {
            btnSubmitReflections.onclick = () => {
                const q1 = document.getElementById('reflection-q1').value;
                const q2 = document.getElementById('reflection-q2').value;
                if (!q1 || !q2) {
                    alert('紐⑤뱺 吏덈Ц???듯빐二쇱꽭??');
                    return;
                }
                alert('?뚯쨷???뚭컧 媛먯궗?⑸땲?? 紐⑤뱺 ?쒕룞??醫낅즺?섏뿀?듬땲??');
                document.getElementById('screen-7').classList.add('hidden');
                
                // ?먰븘濡쒓렇 紐⑤떖 ?쒖떆
                const epilogueModal = document.getElementById('epilogue-modal');
                if (epilogueModal) epilogueModal.classList.remove('hidden');
                
                // ?먰븘濡쒓렇 ?リ퀬 ?꾨챸???붾㈃?쇰줈
                const btnCloseEpilogue = document.getElementById('btn-close-epilogue');
                if (btnCloseEpilogue) {
                    btnCloseEpilogue.onclick = () => {
                        epilogueModal.classList.add('hidden');
                        const endingScreen = document.getElementById('screen-ending');
                        if (endingScreen) endingScreen.classList.remove('hidden');
                        
                        // 遺?쒕챸 ?ㅼ젙
                        let deptName = '?곕━ 遺??;
                        if (PUZZLE_DATA.departments) {
                            const found = PUZZLE_DATA.departments.find(d => d.id === currentDeptId);
                            if (found) deptName = found.name;
                        }
                        const certDeptName = document.getElementById('certificate-dept-name');
                        if (certDeptName) certDeptName.textContent = deptName;
                        
                        triggerConfetti();
                    };
                }
            };
        }
        // ------------------------------------
        
    } else {
        // ?명꽩, ?ъ썝, 李⑥옣
        document.getElementById('stage4-employee-panel').classList.remove('hidden');
        document.getElementById('stage4-manager-panel').classList.add('hidden');
        
        const optionsContainer = document.getElementById('stage4-options-container');
        optionsContainer.innerHTML = `
            <h3 id="stage4-puzzle-title" style="color: var(--accent-gold); margin-bottom: 1rem;"></h3>
            <p id="stage4-puzzle-text" style="font-size: 1.1rem; text-align: left; margin-bottom: 1rem; line-height: 1.6;"></p>
            <input type="text" id="stage4-employee-input" placeholder="?뺣떟 ?낅젰" style="width:100%; padding: 0.8rem; text-align: center; font-size: 1.2rem; border-radius: 8px; border: 1px solid var(--accent-gold); background: rgba(0,0,0,0.6); color: white;">
        `;
        
        const input = document.getElementById('stage4-employee-input');
        const titleEl = document.getElementById('stage4-puzzle-title');
        const textEl = document.getElementById('stage4-puzzle-text');
        
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
                    alert('?뺣떟?낅땲?? ?ㅼ쓬 誘몄뀡?쇰줈 ?섏뼱媛묐땲??');
                    currentStep = stepsSequence[stepIdx];
                    titleEl.textContent = puzzleData[currentStep].title;
                    textEl.textContent = puzzleData[currentStep].text;
                    input.value = '';
                } else {
                    alert(`紐⑤뱺 湲고쉷??寃?좉? ?꾨즺?섏뿀?듬땲?? 遺?λ떂 ?꾪솴?먯뿉 諛섏쁺?섏뿀?듬땲??`);
                    btnSubmit.disabled = true;
                    btnSubmit.textContent = "湲고쉷???뺤젙 ?꾨즺";
                    input.disabled = true;
                    
                    try {
                        await setDoc(doc(db, `departments/${currentDeptId}/roles`, currentRole), {
                            stage4Confirmed: true
                        }, { merge: true });
                    } catch(e) {
                        console.error(e);
                    }
                }
            } else {
                feedback.textContent = "?섎せ???뺣떟?낅땲?? ?ㅼ떆 ?앷컖?대낫?몄슂.";
                feedback.classList.remove('hidden');
            }
        };
    }
    
    // 遺??諛????紐⑤몢?먭쾶 ?곸슜?섎뒗 ?꾩뿭 由ъ뒪??(Stage 5 / QR ?ㅼ틪 ?④퀎 吏꾩엯)
    onSnapshot(doc(db, 'departments', currentDeptId), (docSnap) => {
        const d = docSnap.data();
        if (d && d.currentStage === 5) {
            const successModal = document.getElementById('stage3-success-modal');
            const pwDisplay = document.getElementById('stage3-revealed-password');
            const guideText = document.getElementById('stage3-guide-text');
            const closeBtn = document.getElementById('btn-close-stage3-success');
            const waitingMsg = document.getElementById('stage3-waiting-msg');

            if (successModal && successModal.classList.contains('hidden')) {
                // pwDisplay 愿??濡쒖쭅? ?쒓굅??
                if (guideText) {
                    guideText.innerHTML = "?댁젣 ??먮뱾怨??④퍡 援먯떎 ?대뵖媛???④꺼???덈뒗 <strong>議곌컖 ?먮떒</strong>??李얠븘蹂댁꽭??<br>?먮떒??李얠? ?? <strong>??븷???곴??놁씠 ????꾧뎄????쒕줈</strong> ?먮떒??遺숈뼱 ?덈뒗 QR 肄붾뱶瑜??대???移대찓?쇰줈 ?ㅼ틪?섏꽭??";
                }
                
                closeBtn.classList.remove('hidden'); // ?꾧뎄???ㅼ틪 李쎌쓣 ?????덉쓬
                if(waitingMsg) waitingMsg.classList.add('hidden');
                
                successModal.classList.remove('hidden');

                // ?꾧뎔媛 QR??李띿뼱 議곌컖???띾뱷?섎㈃ 紐⑤몢媛 6?④퀎濡??섏뼱媛?
                const unsub = onSnapshot(doc(db, 'pieces', currentDeptId), (pieceSnap) => {
                    if (pieceSnap.exists() && pieceSnap.data().unlocked) {
                        unsub();
                        document.getElementById('stage3-success-modal').classList.add('hidden');
                        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
                    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
                        document.getElementById('screen-6').classList.remove('hidden');
                        document.getElementById('display-current-role-stage6').textContent = currentRole;
                        alert('?럦 ??먯씠 議곌컖???깃났?곸쑝濡?李얠븯?듬땲?? ?ㅼ쓬 誘몄뀡?쇰줈 ?섏뼱媛묐땲??');
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
            document.getElementById('qr-dept-name').textContent = currentDeptName || '?곕━ 遺??;
        };
    }
}

// ??＝ (Confetti) ?좊땲硫붿씠???⑥닔
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

// ?ㅼ쿇??異붾줎 紐⑤떖 濡쒖쭅
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
            allKeywords = rData.answers.concat(['?섎せ??, '?⑥뼱', '異붽?']);
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
        // ?ㅼ썙???먮Ъ?좉? ?녿뒗 寃쎌슦 (?⑥닚 ?좊줎)
        keywordsContainer.parentElement.style.display = 'none';
        sentenceContainer.innerHTML = `
            <p style="color: var(--accent-gold); text-align: center; margin-bottom: 1rem;">??먮뱾怨?異⑸텇???좊줎??吏꾪뻾???? 遺?λ떂??<b>[?⑹쓽 ?꾨즺]</b> 踰꾪듉???뚮윭二쇱꽭??</p>
            <textarea id="reasoning-summary" rows="4" style="width: 100%; padding: 10px; background: rgba(255,255,255,0.1); border: 1px solid var(--accent-gold); color: white; border-radius: 5px; margin-bottom: 1rem; box-sizing: border-box; font-family: inherit;" placeholder="???理쒖쥌 ?⑹쓽 ?댁슜???닿납???먯쑀濡?쾶 ?뺣━?섏꽭??.."></textarea>
        `;
    }
    
    const btnSubmit = document.getElementById('btn-submit-reasoning');
    btnSubmit.classList.remove('hidden');
    btnSubmit.style.display = 'inline-block';
    btnSubmit.textContent = rData.keywordLock ? '?먮Ъ???湲? : '?⑹쓽 ?꾨즺';
    btnSubmit.onclick = async () => {
        if (currentRole !== '遺??) {
            alert('理쒖쥌 寃곗젙 諛??쒖텧? [遺??留?媛?ν빀?덈떎. 遺?쒖썝?ㅺ낵 ?곸쓽?섏뿬 遺?λ떂??寃곗젙???대젮二쇱꽭??');
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
            // ?붿빟 ?띿뒪?멸? ?덉쑝硫?DB?????
            const summaryEl = document.getElementById('reasoning-summary');
            if (summaryEl && summaryEl.value.trim() !== '') {
                try {
                    await setDoc(doc(db, `departments/${currentDeptId}/reasoning`, `stage${targetStageNum-1}`), {
                        roleGroup: currentRole,
                        summary: summaryEl.value.trim()
                    }, { merge: true });
                } catch(e) { console.error("?붿빟 ????ㅽ뙣:", e); }
            }

            alert('?럦 ?⑹쓽 諛??ㅼ쿇??異붾줎???꾨즺?섏뿀?듬땲?? ?ㅼ쓬 ?④퀎濡??대룞?⑸땲??');
            modal.classList.add('hidden');
            
            try {
                await updateDoc(doc(db, 'departments', currentDeptId), {
                    currentStage: targetStageNum,
                    showStage1Reasoning: false,
                    showStage3Reasoning: false
                });
            } catch(e) {
                console.error("DB ?낅뜲?댄듃 ?ㅽ뙣:", e);
                alert('?쒕쾭? ?곌껐??臾몄젣媛 ?덉뒿?덈떎. ?좎떆 ???ㅼ떆 ?쒕룄?댁＜?몄슂.');
            }
        } else {
            alert('??몄뒿?덈떎! 臾몃㎘???ㅼ떆 ?뚯븙?섏뿬 ?щ컮瑜??ㅼ썙?쒕? 梨꾩썙蹂댁꽭??');
        }
    };
}

// 珥덇린???⑥닔
async function initApp() {
    renderDeptGrid();
    
    // QR ?ㅼ틪?쇰줈 吏꾩엯?덈뒗吏 ?뺤씤 (?qr=true)
    const urlParams = new URLSearchParams(window.location.search);
    const isQrScan = urlParams.get('qr') === 'true';

    // ?몄뀡???⑥븘?덈떎硫??대떦 ?④퀎濡?諛붾줈 蹂듦뎄
    if (currentDeptId && currentRole) {
        try {
            // 遺?쒖쓽 currentStage 蹂寃쎌쓣 ?ㅼ떆媛꾩쑝濡?媛먯??섏뿬 ?붾㈃ ?먮룞 ?꾪솚
            onSnapshot(doc(db, 'departments', currentDeptId), (snap) => {
                if (snap.exists()) {
                    const stage = snap.data().currentStage || 0;
                    
                    deptSelection.classList.add('hidden');
                    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
                    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
                    
                    // QR ?ㅼ틪 吏꾩엯??寃쎌슦 諛붾줈 QR ?붾㈃?쇰줈 ?대룞 (遺?λ쭔 ?덉슜)
                    if (isQrScan) {
                        if (currentRole !== '遺??) {
                            alert('QR ?ㅼ틪怨??뷀샇 ?낅젰? 遺?λ떂留??????덉뒿?덈떎!\n遺?λ떂???대??곗쑝濡??ㅼ틪?댁＜?몄슂.');
                            // ?ㅽ뵆?섏떆???湲??붾㈃?쇰줈 ?뚮젮蹂대깂 (?곗꽑 0?④퀎 ?붾㈃ ?꾩?)
                            document.getElementById('screen-0').classList.remove('hidden');
                            return;
                        }
                        document.getElementById('screen-qr').classList.remove('hidden');
                        document.getElementById('qr-dept-name').textContent = currentDeptName || '?곕━ 遺??;
                        return;
                    }

                    if (stage === 0) {
                        screen1.classList.remove('hidden');
                        startScreen1();
                    } else if (stage === 1) {
                        const s2 = document.getElementById('screen-2');
                        if (s2) {
                            s2.classList.remove('hidden');
                            startScreen2();
                            if (d && d.showStage1Reasoning) {
                                showReasoningModal(PUZZLE_DATA.stage1, 2);
                            }
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
                            if (d && d.showStage3Reasoning) {
                                showReasoningModal(PUZZLE_DATA.stage3, 4);
                            }
                        }
                    } else if (stage === 4) {
                        const s5 = document.getElementById('screen-5');
                        if (s5) {
                            s5.classList.remove('hidden');
                            startScreen5();
                        }
                    }
                } else {
                    // ?뚯씠?대쿋?댁뒪??遺??臾몄꽌媛 ?놁쑝硫?珥덇린?붾맂 寃쎌슦) ?몄뀡 ?좊┝
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

// Removed dev test buttons logic to ensure clean production feel

// ?꾩껜 ?붾㈃ 紐⑥븘蹂닿린 (God Mode)
const devGodModeBtn = document.getElementById('dev-god-mode');
if (devGodModeBtn) {
    let godMode = false;
    devGodModeBtn.addEventListener('click', () => {
        godMode = !godMode;
        if (godMode) {
            devGodModeBtn.textContent = '???먮옒?濡?蹂듦뎄?섍린 (?덈줈怨좎묠)';
            devGodModeBtn.style.background = '#ff0055';
            
            // ?ㅻ뜑 ?쒖떆
            document.getElementById('main-header').classList.remove('hidden');
            
            // 紐⑤뱺 ?ㅽ겕由??쒖떆 (?ㅽ뵆?섏떆, 遺???좏깮 ?쒖쇅)
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
            
            // 紐⑤뱺 遺??????⑤꼸, 紐⑤떖 ???④? ?댁젣
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
            
            // ?ㅽ넗由?紐⑤떖李쎈뱾???몃씪?몄쑝濡??쒖떆
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

// --- QR 議곌컖 李얘린 ?붾㈃ 濡쒖쭅 ---
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
        
        // ?낅젰媛믨낵 ?뺣떟?먯꽌 ?꾩뼱?곌린瑜?紐⑤몢 ?쒓굅?섏뿬 鍮꾧탳 (愿??섍쾶)
        if (inputPw.replace(/\s+/g, '') === correctPw.replace(/\s+/g, '')) {
            qrErrorMsg.classList.add('hidden');
            btnSubmitQr.classList.add('hidden');
            qrPasswordInput.disabled = true;
            qrSuccessPanel.classList.remove('hidden');
            
            // pieces 而щ젆???낅뜲?댄듃
            try {
                await setDoc(doc(db, 'pieces', currentDeptId), { 
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
    });
}

// --- ??쒕낫??濡쒖쭅 ---
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
    
    // Firestore pieces 而щ젆???ㅼ떆媛?援щ룆
    dashboardUnsubscribe = onSnapshot(collection(db, 'pieces'), (snapshot) => {
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
        
        // 紐⑤몢 ?댁젣?섏뿀?????곗텧
        if (unlockedCount >= totalDepts && totalDepts > 0) {
            setTimeout(() => {
                fabricPuzzleContainer.classList.add('scale-up-anim');
                const finalMsg = document.getElementById('dashboard-final-message');
                finalMsg.classList.remove('hidden');
                
                // ?꾩떆濡??섎뱶肄붾뵫??硫붿떆吏 (寃뚯씠吏 ?곕룞 ??
                document.getElementById('dashboard-final-text').innerHTML = "怨좊쭏?뚯슂, ?щ윭遺? ?щ윭遺꾩씠 吏耳쒕궦 留뚰겮? 遺꾨챸???щ씪議뚯뼱?? ?ㅼ쓬?먮뒗 議곌툑 ?? 吏?띻??ν븳 ?좏깮 履쎌쑝濡???몄씠 湲곗슱硫?醫뗪쿋?댁슂.";
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
        // ?먮옒 ?덈뜕 ?붾㈃?쇰줈 ?뚯븘媛湲?(??쒕낫?쒕뒗 愿由ъ옄??QR ?꾨즺 ?붾㈃?먯꽌留??ㅼ뼱??
        // ?ш린???ㅽ뵆?섏떆??QR ?붾㈃?쇰줈 蹂대궡踰꾨┝
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
        if (confirm('紐⑤뱺 湲곌린???몄뀡??珥덇린?뷀븯怨?泥섏쓬 ?붾㈃?쇰줈 ?뚯븘媛?쒓쿋?듬땲源?')) {
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
            const snap = await getDoc(doc(db, 'departments', currentDeptId));
            if (snap.exists()) {
                const stage = snap.data().currentStage || 0;
                let nextStage = stage + 1;
                if (nextStage > 5) nextStage = 5;
                await updateDoc(doc(db, 'departments', currentDeptId), {
                    currentStage: nextStage
                });
            }
        } catch(e) { console.error(e); }
    });
}


