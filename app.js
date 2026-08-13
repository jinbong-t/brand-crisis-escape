import { db, collection, doc, setDoc, getDoc, runTransaction, updateDoc, onSnapshot } from './firebase-config.js';
import { PUZZLE_DATA } from './puzzle-data.js';

sessionStorage.clear();

// DOM ?遺용꺖
const deptGrid = document.getElementById('dept-grid');
const deptSelection = document.getElementById('department-selection');
const roleSelection = document.getElementById('role-selection');
const selectedDeptName = document.getElementById('selected-dept-name');
const roleCards = document.querySelectorAll('.role-card');
const btnBackToDept = document.getElementById('btn-back-to-dept');
const mainHeader = document.getElementById('main-header');
const currentTeamDisplay = document.getElementById('current-team-display');

// ?온?귐딆쁽 筌뤴뫀諭?DOM
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

// ?怨밴묶 ?온??
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

// 疫꿸퀡???봔??筌뤴뫖以?
const DEFAULT_DEPTS = [
    { id: 'dept-1', name: '?遺우쁽?硫몃┛???' },
    { id: 'dept-2', name: '???삺揶쏆뮆而삯겫?' },
    { id: 'dept-3', name: '?????곗춦?봔' },
    { id: 'dept-4', name: '??밴텦?袁⑥셽?봔' },
    { id: 'dept-5', name: '筌띾뜆????' },
    { id: 'dept-6', name: '??됱춳?온?귐?' }
];

// Splash Screen Logic
btnEnterGame.addEventListener('click', () => {
    // 1. 揶쏅베?????밸씜 "?諭????봔??뺣뮉 ?얜똻毓??낅빍繹?" ?袁⑹뒭疫?
    geniusModal.classList.remove('hidden');
    
    // 2. 2.5??????밸씜????쎈탣??뤿뻻 ?遺얇늺 筌뤴뫀紐????わ쭪???Screen 0 ?源놁삢
    setTimeout(() => {
        geniusModal.classList.add('hidden');
        screenSplash.classList.add('hidden');
        screen0.classList.remove('hidden');
    }, 2500);
});

// ?봔???온??
function getDepartments() {
    const saved = localStorage.getItem('rebrand_departments');
    if (saved) return JSON.parse(saved);
    localStorage.setItem('rebrand_departments', JSON.stringify(DEFAULT_DEPTS));
    return DEFAULT_DEPTS;
}

function saveDepartments(depts) {
    localStorage.setItem('rebrand_departments', JSON.stringify(depts));
}

// ?遺얇늺 ???쐭筌?
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
            <button class="btn-delete" data-id="${dept.id}">????/button>
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

// ?봔???醫뤾문
async function selectDepartment(dept) {
    currentDeptId = dept.id;
    currentDeptName = dept.name;
    
    selectedDeptName.textContent = dept.name;
    deptSelection.classList.add('hidden');
    roleSelection.classList.remove('hidden');

    // Firestore?癒?퐣 ?봔???얜챷苑뚦첎? ??곸몵筌???밴쉐
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

// 筌욊낫????뽮쉐???怨밴묶 ?類ㅼ뵥
async function checkRoleAvailability() {
    roleCards.forEach(async (card) => {
        const role = card.getAttribute('data-role');
        const roleRef = doc(db, `departments/${currentDeptId}/roles`, role);
        const snap = await getDoc(roleRef);
        
        if (snap.exists() && snap.data().taken) {
            card.disabled = true;
            card.innerHTML = `<h3>${role}</h3><p>(?醫뤾문 ?袁⑥┷)</p>`;
        } else {
            card.disabled = false;
            card.innerHTML = `<h3>${role}</h3><p>${getRoleDesc(role)}</p>`;
        }
    });
}

function getRoleDesc(role) {
    switch(role) {
        case '?紐낃쉘': return '筌욊낯??怨몄뵥 ??κ퐣 ?癒?퉳';
        case '????: return '?癒?┷ ??곴퐤 獄??브쑴苑?;
        case '筌△뫁??: return '???뼎 揶쏆뮆???袁⑺뀱';
        case '?봔??: return '?ル굟鍮 ?癒?뼊 獄???뽱뀱';
    }
}

// 筌욊낫???醫뤾문 (?紐껋삏????
roleCards.forEach(card => {
    card.addEventListener('click', async () => {
        if (card.disabled) return;
        const role = card.getAttribute('data-role');
        
        try {
            const roleRef = doc(db, `departments/${currentDeptId}/roles`, role);
            await runTransaction(db, async (transaction) => {
                const docSnap = await transaction.get(roleRef);
                if (docSnap.exists() && docSnap.data().taken) {
                    throw "??? ?醫뤾문??筌욊낫???낅빍??";
                }
                transaction.set(roleRef, { taken: true, timestamp: Date.now() });
            });
            
            // ?源껊궗
            currentRole = role;
            saveSessionState();
            alert(`${role} 筌욊낫???곗쨮 ??뽰삂??몃빍??`);
            
            // ??쇱뵠??????띾┛????륁뵠筌왖 ?? ?醫딅빍筌롫뗄???륁몵嚥??遺얇늺 ?袁れ넎
            screen0.classList.add('page-turn-out');
            setTimeout(() => {
                screen0.classList.add('hidden');
                screen0.classList.remove('page-turn-out');
                
                screen1.classList.remove('hidden');
                screen1.classList.add('page-turn-in');
                setTimeout(() => screen1.classList.remove('page-turn-in'), 800);
                
                startScreen1(); // ?遺얇늺 1(??쎈늄?? ???샒
            }, 800);
            
        } catch (e) {
            alert(e);
            checkRoleAvailability(); // ?怨밴묶 揶쏄퉮??
        }
    });
});

// ??살쨮揶쎛疫?
btnBackToDept.addEventListener('click', () => {
    currentDeptId = null;
    currentDeptName = null;
    currentRole = null;
    clearSessionState();
    roleSelection.classList.add('hidden');
    deptSelection.classList.remove('hidden');
});

// ??釉?癰궰野?(嚥≪뮄??袁⑹뜍 - ?怨쀬뵠???醫?)
const btnLogoutRoles = document.querySelectorAll('#btn-logout-role, .btn-logout-role');
btnLogoutRoles.forEach(btn => {
    btn.addEventListener('click', () => {
        if (confirm("?袁⑹삺 ??釉?癒?퐣 嚥≪뮄??袁⑹뜍??뤿뻻野껋쥙???뉙돱? (???癒?굶??疫꿸퀣釉?疫꿸퀡以?? DB??域밸챶?嚥?癰귣똻???몃빍??)")) {
            currentRole = null;
            sessionStorage.removeItem('currentRole');
            location.reload();
        }
    });
});

// ?온?귐딆쁽 筌뤴뫀諭?嚥≪뮇彛?(5甕?????????뽮쉐??
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
    if (confirm("?類ｌ춾 筌뤴뫀諭??봔???怨쀬뵠?怨? 筌욊낫???醫뤾문 疫꿸퀡以???λ뜃由?酉釉??볦퓢??щ빍繹? (??롫즼??????곷뮸??덈뼄!)")) {
        const depts = getDepartments();
        const roles = ['인턴', '사원', '차장', '부장'];
        for (const dept of depts) {
            try {
                // ?봔??疫꿸퀡???類ｋ궖 獄???쎈??? ?λ뜃由??
                await setDoc(doc(db, 'departments', dept.id), {
                    name: dept.name,
                    currentStage: 0,
                    managerFinalAnswer1: "",
                    managerFinalAnswer2: "",
                    stage2Pw: "",
                    reasoningWords: [],
                    qrScanned: false
                });
                
                // QR ??깅뮞 ?怨밴묶 ?λ뜃由??
                await setDoc(doc(db, 'pieces', dept.id), {
                    unlocked: false
                });

                // 筌욊낫???怨밴묶 ?λ뜃由??
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
        
        alert("?λ뜃由?遺얜┷??됰뮸??덈뼄.");
        location.reload();
    }
});

// ???뮞?紐꾩뒠 ??쥓???袁⑷퍥 ?λ뜃由??甕곌쑵??
const btnEasyReset = document.getElementById('btn-easy-reset');
if (btnEasyReset) {
    btnEasyReset.addEventListener('click', async () => {
        if (confirm("筌뤴뫀諭??봔??疫꿸퀡以됪??怨쀬뵠??甕곗쥙???筌욊쑵六??怨뱀넺???袁⑹읈???λ뜃由?酉釉??筌ｌ꼷?ч겫???0??ｍ? ??쇰뻻 ??뽰삂??뤿뻻野껋쥙???뉙돱?")) {
            const depts = getDepartments();
        const roles = ['인턴', '사원', '차장', '부장'];
            
            // 筌뤴뫀諭??봔??뽰벥 亦낅슦釉?獄쏆꼹??獄???쎈??? 0??곗쨮 ??롫즼?귐덈┛ (?袁⑹읈 ?λ뜃由??
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
            
            alert("?袁④펾??띿쓺 ?λ뜃由?遺얜┷??됰뮸??덈뼄! 繹먥뫀嫄???怨밴묶?癒?퐣 ??뽰삂??몃빍??");
            location.reload();
        }
    });
}

// ???뮞?紐꾩뒠 ??쇱퓝???곕뗀以?獄쏅뗀以덂첎?疫?甕곌쑵??
const debugRoleBtns = document.querySelectorAll('.btn-debug-role');
debugRoleBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
        currentDeptId = 'test-dept'; // ?袁⑹벥???봔??
        currentRole = btn.getAttribute('data-role');
        currentDeptName = '???뮞?紐???;
        sessionStorage.setItem('currentRole', currentRole);
        
        // ?봔???얜챷苑?揶쏅벡????밴쉐 (updateDoc ??살첒 獄쎻뫗?)
        try {
            await setDoc(doc(db, 'departments', currentDeptId), {
                name: '???뮞?紐???,
                currentStage: 1
            }, { merge: true });
        } catch(e) { console.error(e); }

        document.getElementById('screen-splash').classList.remove('active');
        
        // ?類ㅻ뻼 ???λ뜃由??(???⑥눘??癒?퐣 onSnapshot?????嚥??얜씈?졿??遺얇늺 1???類ㅺ맒 ???샒??
        initApp();
        
        setTimeout(() => showReasoningModal(PUZZLE_DATA.stage1, 2), 800);
    });
});

// ??륁뵠筌왖 ??쎄땁 嚥≪뮇彛?
const skipButtons = document.querySelectorAll('.btn-skip');
skipButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
        const targetStage = parseInt(btn.getAttribute('data-target'));
        
        if (!currentDeptId || !currentRole) {
            const forceTest = confirm("?袁⑹삺 ?醫뤾문???봔??뺢돌 筌욊낫?????곷뮸??덈뼄! ???뮞?紐꾩뒠 '???뮞?紐????봔?? 亦낅슦釉??곗쨮 揶쏅벡????놁삢??뤿뻻野껋쥙???뉙돱?");
            if (forceTest) {
                currentDeptId = 'test-dept-' + Date.now(); // ?袁⑸뻻 ?봔????밴쉐
                currentDeptName = '???뮞?紐???;
                currentRole = '?봔??;
                saveSessionState();
            } else {
                return;
            }
        }
        
        if (confirm(`${targetStage}??ｍ롦에?揶쏅벡????猷??뤿뻻野껋쥙???뉙돱?`)) {
            try {
                // ?봔???얜챷苑뚦첎? ??곸몵筌??袁⑸뻻 ??밴쉐
                await setDoc(doc(db, 'departments', currentDeptId), {
                    name: currentDeptName,
                    currentStage: targetStage,
                    startTime: Date.now()
                }, { merge: true });
                
                // 筌뤴뫀????る┛
                adminModal.classList.add('hidden');
                
                // 筌뤴뫀諭??遺얇늺 ??ｋ┛疫?
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
                    alert(`${targetStage}??ｍ??遺얇늺?? ?袁⑹춦 ?⑤벊沅?餓λ쵐???덈뼄! ??몃뎨??몃뎨 ??길닼?);
                }
                
            } catch(e) {
                console.error(e);
            }
        }
    });
});

// ==========================================
// Screen 1: ??쎈늄??嚥≪뮇彛?
// ==========================================
let introParagraphs = [];
let currentIntroIndex = 0;

function startScreen1() {
    mainHeader.classList.remove('hidden');
    currentTeamDisplay.textContent = `${currentDeptName} - ${currentRole}`;

    // ??쎈늄????쎈꽅??筌뤴뫀??餓Β??
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
            
            // ?뚢뫂???瑗???쎄쾿嚥?筌??袁⑥삋嚥?
            container.parentElement.scrollTop = container.parentElement.scrollHeight;
            
            if (currentIntroIndex === introParagraphs.length - 1) {
                btnNext.classList.add('hidden');
                btnClose.classList.remove('hidden');
            }
        }
    };

    introModal.classList.remove('hidden');
    
    // ?怨멸맒 ?癒?짗 ??源???뺣즲
    if (introVideo) {
        introVideo.play().catch(e => console.log("?癒?짗 ??源?獄쎻뫗???, e));
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
    // ?λ뜃由?癒?뮉 ?얜똻??袁⑥쨮 ??롫선??獄쏄퀣??
    const shuffledCards = [...PUZZLE_DATA.opening.cards].sort(() => Math.random() - 0.5);
    
    shuffledCards.forEach(cardData => {
        const card = document.createElement('div');
        card.className = 'flip-card';
        card.setAttribute('draggable', 'true');
        card.dataset.id = cardData.id;
        card.dataset.back = cardData.back;

        // ??곸춳??彛??癒?덱???袁る퉸 ??꾩퍢????뺣쑁 ???읈????쎈늄???봔??
        const randomRot = (Math.random() - 0.5) * 10; // -15??~ +15??
        const randomY = (Math.random() - 0.5) * 10;   // -10px ~ +10px
        card.style.transform = `rotate(${randomRot}deg) translateY(${randomY}px)`;
        
        card.innerHTML = `
            <div class="flip-card-inner">
                <div class="flip-card-front" style="background-image: url('splash_bg.png'); background-size: cover; background-position: center; border: 2px solid var(--accent-gold);">
                    <!-- ??뚣늺?? ??ｊ볼筌??怨밴묶 -->
                    <span style="background: rgba(0,0,0,0.7); padding: 5px; border-radius: 4px; font-weight: bold; color: white;">鈺곌퀣沅?燁삳?諭?/span>
                </div>
                <div class="flip-card-back" style="display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 1rem;">
                    <span style="font-size: 0.85rem; font-family: 'Noto Sans KR'; font-weight: 500; word-break: keep-all; line-height: 1.5; color: var(--text-main);">${cardData.text}</span>
                    <!-- ??ъ쁽???遺얇늺??癰귣똻肉т틠?? ??꾪???쇱춦 ?類ｌ졊 ??뽮퐣 筌ｋ똾寃??뱀몵嚥≪뮆彛??????몃빍??-->
                </div>
            </div>
        `;

        // ??쇱춿疫???源??
        card.addEventListener('click', () => {
            card.classList.toggle('flipped');
            checkUnlockCondition();
        });

        // ??뺤삋域?????뺚댘 ??源??
        card.addEventListener('dragstart', (e) => {
            card.classList.add('dragging');
        });
        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
            checkUnlockCondition();
        });

        openingCardsContainer.appendChild(card);
    });

    // ?뚢뫂???瑗???뺤삋域??類ｌ졊 嚥≪뮇彛?
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

    // 筌뤴뫀而???怨쀭뒄(??뺤삋域? 筌왖??
    let touchDragging = null;
    openingCardsContainer.addEventListener('touchstart', e => {
        if (e.target.closest('.flip-card')) {
            touchDragging = e.target.closest('.flip-card');
            // ?怨쀭뒄 ??뽰삂 ??獄쏅뗀以???쇱춿??? ??낅즲嚥???꾩퍢????뺤쟿??
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

// ??뺤삋域??袁⑺뒄 ?④쑴沅???λ땾
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

// ?醫됲닊 ??곸젫 鈺곌퀗援?野꺜??(??곕굡獄쏄퉮????볦퍟????ｋ궢筌?
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

// ?醫됲닊 ??곸젫 甕곌쑵??????
btnUnlock.addEventListener('click', () => {
    const cards = [...openingCardsContainer.querySelectorAll('.flip-card')];
    const isAllFlipped = cards.every(c => c.classList.contains('flipped'));
    const currentOrder = cards.map(c => c.dataset.back).join('');

    if (!isAllFlipped) {
        alert("筌뤴뫀諭?鈺곌퀣沅?燁삳?諭띄몴???쇱춿????곸뒠???類ㅼ뵥??곻폒?紐꾩뒄!");
        return;
    }
    
    if (currentOrder !== '1234') {
        alert("??뽮퐣揶쎛 ???紐꾨뮸??덈뼄. ??롮첒 ??밴텦?봔???癒?┛繹먮슣? ??띻펾 ??쇰옘??獄쏆뮇源??롫뮉 ??而?몴???뽮퐣??嚥???뤿였????紐꾩뒄!");
        return;
    }

    diaryText.textContent = PUZZLE_DATA.opening.diaryText;
    diaryModal.classList.remove('hidden');
});

// ??쇱뵠????????뽱뀱
btnSubmitOpening.addEventListener('click', async () => {
    const selected = document.querySelector('input[name="flow-type"]:checked');
    if (!selected) {
        alert('???뱽 ?醫뤾문??곻폒?紐꾩뒄.');
        return;
    }

    if (selected.value === PUZZLE_DATA.opening.answer) {
        // ?類ｋ뼗 ??
        openingErrorMsg.classList.add('hidden');
        diaryModal.classList.add('hidden');
        alert('?類ｋ뼗??낅빍?? 1??ｍ롦에???猷??몃빍??');
        
        // ?怨밴묶 ??낅쑓??꾨뱜
        try {
            await updateDoc(doc(db, 'departments', currentDeptId), {
                currentStage: 1
            });
        } catch(e) { console.error(e); }

        // 1??ｍ??遺얇늺??곗쨮 ?袁れ넎
        document.getElementById('screen-1').classList.add('hidden');
        document.getElementById('screen-2').classList.remove('hidden');
        startScreen2();
    } else {
        openingErrorMsg.classList.remove('hidden');
    }
});

// ==========================================
// Screen 2: 1??ｍ?(?遺우쁽?紐꾩뒄???뼄) 嚥≪뮇彛?
// ==========================================
function startScreen2(deptData) {
    mainHeader.classList.remove('hidden');
    currentTeamDisplay.textContent = `${currentDeptName} - ${currentRole}`;
    
    document.getElementById('display-current-role').textContent = currentRole;
    
    // 1??ｍ???쎈꽅??筌뤴뫀???袁⑹뒭疫?
    if (!(deptData && deptData.showStage1Reasoning)) {
        document.getElementById('stage1-story-modal').classList.remove('hidden');
    }
    
    document.getElementById('btn-start-stage1-missions').onclick = () => {
        document.getElementById('stage1-story-modal').classList.add('hidden');
    };
    
    // 沃섎챷??1-1 (筌륁??雅? ?紐낅샒
    const montageData = PUZZLE_DATA.stage1.montage[currentRole];

    if (!montageData) {
        console.error('Invalid currentRole for montageData:', currentRole);
        alert('??????⑥щ턄??? ??ル쪇???? ???용????덈펲.');
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
                alert('?類ｋ뼗??낅빍?? ??쇱벉 沃섎챷?????議??щ빍??');
                optionsContainer.querySelectorAll('button').forEach(b => b.disabled = true);
                const m2 = document.getElementById('mission-1-2');
                if (m2) {
                    m2.classList.remove('hidden');
                    m2.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            } else {
                alert('???紐꾨뮸??덈뼄. ??κ퐣????쇰뻻 ?類ㅼ뵥????紐꾩뒄.');
                btn.classList.remove('selected');
            }
        });
        optionsContainer.appendChild(btn);
    });

    // 沃섎챷??1-2 (?癒?뼊 ?대Ŋ彛?? ?紐낅샒
    const fabricData = PUZZLE_DATA.stage1.fabricStandards[currentRole];
    document.getElementById('fabric-clue-title').textContent = fabricData.title;
    document.getElementById('fabric-clue-text').textContent = fabricData.text;
    
    const btnSubmitM2 = document.getElementById('btn-submit-mission-1-2');
    if (btnSubmitM2) {
        btnSubmitM2.textContent = currentRole === '?봔?? ? '筌ㅼ뮇伊??諭???띾┛' : '?봔?貫?귞뙼?野껉퀣?????곫묾?;
    }
    
    document.querySelectorAll('.fabric-btn').forEach(btn => {
        // 癰귣벊???醫뤾문 揶쎛?館釉?袁⑥쨯 ?醫?
        btn.onclick = () => btn.classList.toggle('selected');
    });

    document.getElementById('btn-submit-mission-1-2').onclick = () => {
        const selectedButtons = Array.from(document.querySelectorAll('.fabric-btn.selected'));
        if (selectedButtons.length === 0) {
            alert('?癒?뼊????롪돌 ??곴맒 ?醫뤾문??곻폒?紐꾩뒄.');
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
            alert(currentRole === '?봔?? ? '?類ｋ뼗??낅빍?? ?袁④펾???癒?뼊???ⓥ뫀??筌ㅼ뮇伊??諭???뤿??щ빍??' : '?類ｋ뼗??낅빍?? ?봔?貫?귞뙼?疫꿸퀣釉???얜똻沅???怨몃뻿??됰뮸??덈뼄!');
            document.getElementById('btn-submit-mission-1-2').disabled = true;
            document.getElementById('btn-submit-mission-1-2').textContent = currentRole === '?봔?? ? '筌ㅼ뮇伊??諭???袁⑥┷' : '野껉퀣???遺욧퍕 ?袁⑥┷ (疫꿸퀣釉??怨몃뻿)';
            document.querySelectorAll('.fabric-btn').forEach(b => b.disabled = true);
            
            const m3 = document.getElementById('mission-1-3');
            if (m3) {
                m3.classList.remove('hidden');
                m3.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        } else {
            alert('???紐꾨뮸??덈뼄. ?源낇뀋??? 鈺곌퀗援????쇰뻻 ??뺤쓰 ?쀬눊????類ㅼ뵥??뤾쉭??');
        }
    };

    // 沃섎챷??1-3 (??쇱퓝???곕뗀以? ?紐낅샒
    const reasoningData = PUZZLE_DATA.stage1.reasoning;
    document.getElementById('reasoning-context').innerHTML = reasoningData.context.replace(/\n/g, '<br>');
    document.getElementById('reasoning-role-label').textContent = reasoningData.roleLabels[currentRole];

    if (currentRole === '?봔??) {
        document.getElementById('manager-montage-panel').classList.remove('hidden');
        document.getElementById('manager-submit-panel').classList.remove('hidden');
        document.getElementById('btn-stage1-confirm-all').style.display = 'none'; // ?봔?關? ?袁⑷퍥 ??뽱뀱 筌???곸뒠
        document.getElementById('reasoning-textarea').style.display = 'none'; // ?봔?關? 筌뤴뫀??癒?퐣 ??낆젾
        document.getElementById('reasoning-role-label').textContent = "?봔?貫??? ???癒?굶??筌뤴뫀紐???κ퐣?? ??띻퍍????뽱뀱?????돱筌왖 疫꿸퀡???雅뚯눘苑?? ??롫뼊??'筌ㅼ뮇伊??類ｋ뼗 ??뽱뀱'???袁⑥┷??롢늺 ?醫딆쨴 筌≪럩???????덈뼄.";
        document.getElementById('reasoning-role-label').style.color = '#ff9f43';
        
        // ?봔???袁⑹뒠 ??쇰뻻揶??????袁れ넺 筌뤴뫀??怨뺤춦
        onSnapshot(collection(db, `departments/${currentDeptId}/roles`), (snapshot) => {
            let allConfirmed = true;
            const requiredRoles = ['?紐낃쉘', '????, '筌△뫁??];
            
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
            
            // ???뮞???紐꾩벥???袁る퉸 ???癒?뵠 筌뤴뫀紐???뽱뀱??? ??녿툡???봔??甕곌쑵????湲???뽮쉐??
            document.getElementById('btn-submit-stage1').disabled = false;
        });
        
        // ?봔???袁⑹뒠 筌ㅼ뮇伊???뽱뀱 甕곌쑵??
        const btnSubmitStage1 = document.getElementById('btn-submit-stage1');
        btnSubmitStage1.onclick = async () => {
            const finalAnswer1 = document.getElementById('manager-final-answer-1').value;
            const finalAnswer2 = document.getElementById('manager-final-answer-2').value;
            const errorMsg = document.getElementById('manager-error-msg');
            
            if (!finalAnswer1 || !finalAnswer2) {
                alert('沃섎챷??1(筌륁??雅???沃섎챷??2(燁살뮉?싧칰???筌ㅼ뮇伊??類ｋ뼗??筌뤴뫀紐??醫뤾문??곻폒?紐꾩뒄.');
                return;
            }
            
            if (finalAnswer1 === 'B' && finalAnswer2 === 'H') {
                errorMsg.classList.add('hidden');
                btnSubmitStage1.disabled = true;
                btnSubmitStage1.textContent = '筌ㅼ뮇伊??諭???袁⑥┷ (??쇱퓝???곕뗀以?筌욊쑵六얌빳?';
                
                try {
                    await updateDoc(doc(db, 'departments', currentDeptId), {
                        showStage1Reasoning: true
                    });
                    alert('???筌뤴뫀諭????癒?벥 ??띻퍍???ル굟鍮??뤿연 筌욊쑴彛??袁⑸툧???癒?뼊??筌≪뼚釉??щ빍??\n\n??곸젫 ??밸씜??롫뮉 \'??쇱퓝???곕뗀以?' ?얜챷?ｇ몴??봔??뽰뜚??븍궢 ?醫딆쨴??뤿연 ??욧퍙??뤾쉭??');
                    showReasoningModal(PUZZLE_DATA.stage1, 2);
                } catch(e) {
                    console.error(e);
                }
                
            } else {
                errorMsg.classList.remove('hidden');
                errorMsg.textContent = '??삳뼗??낅빍?? ???癒?굶??筌뤴뫁釉????κ퐣(?대Ŋ彛??????쇰뻻 ??뺤쓰 ?브쑴苑????紐꾩뒄.';
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
                    alert('??띻퍍??鈺곌퀗?????怨멸쉭???怨몃선??疫꿸퀣釉??곻폒?紐꾩뒄.');
                    return;
                }
                
                try {
                    const roleRef = doc(db, `departments/${currentDeptId}/roles`, currentRole);
                    await updateDoc(roleRef, { stage1Confirmed: true, reasoning: textarea.value });
                    
                    alert('?봔?貫?귞뙼?筌ㅼ뮇伊?疫꿸퀣釉?野껉퀣???遺욧퍕)???얜똻沅????띻펷??щ빍?? ?봔?貫???筌뤴뫀紐????띻퍍???띯뫂鍮??筌ㅼ뮇伊??諭??????돱筌왖 ??疫꿸퀬鍮먧틠?깃쉭??');
                    btnConfirmAll.disabled = true;
                    btnConfirmAll.textContent = '疫꿸퀣釉??怨몃뻿 ?袁⑥┷ (?봔???諭????疫?餓?..)';
                    textarea.disabled = true;
                } catch(e) {
                    console.error(e);
                    alert('疫꿸퀣釉??怨몃뻿 餓???살첒揶쎛 獄쏆뮇源??됰뮸??덈뼄.');
                }
            };
        }
        
        
    }
}

// ==========================================
// Screen 3: 2??ｍ?(???쉘/?딅맩??? 嚥≪뮇彛?
// ==========================================
function startScreen3() {
    mainHeader.classList.remove('hidden');
    currentTeamDisplay.textContent = `${currentDeptName} - ${currentRole}`;
    
    document.getElementById('display-current-role-stage2').textContent = currentRole;
    
    // 2??ｍ???쎈꽅??筌뤴뫀???袁⑹뒭疫?
    const storyModal = document.getElementById('stage2-story-modal');
    storyModal.classList.remove('hidden');
    
    document.getElementById('stage2-intro-text').innerText = PUZZLE_DATA.stage2.intro;
    
    document.getElementById('btn-start-stage2-missions').onclick = () => {
        storyModal.classList.add('hidden');
    };
    
    const puzzleData = PUZZLE_DATA.stage2.puzzles[currentRole];
    
    if (currentRole === '?봔??) {
        document.getElementById('stage2-employee-panel').classList.add('hidden');
        document.getElementById('stage2-manager-panel').classList.remove('hidden');
        
        // ?봔???袁れ넺???귐딅뮞??
        onSnapshot(collection(db, `departments/${currentDeptId}/roles`), (snapshot) => {
        const roles = ['인턴', '사원', '차장', '부장'];
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
            
            // ???뮞???紐꾩벥???袁る퉸 ?봔??甕곌쑵????湲???뽮쉐??
            document.getElementById('btn-submit-stage2').disabled = false;
        });
        
        // ?봔??疫뀀뜃??揶쎛??甕곌쑵??
        document.getElementById('btn-submit-stage2').onclick = async () => {
            const pw = document.getElementById('manager-vault-pw').value;
            if (pw === PUZZLE_DATA.stage2.puzzles['?봔??].answer) {
                document.getElementById('manager-error-msg-stage2').classList.add('hidden');
                
                // Firestore???믪눘? ??낅쑓??꾨뱜??뤿연 ??삘뀲 ???癒?굶???遺얇늺????뤿선揶쎛野???
                try {
                    await updateDoc(doc(db, 'departments', currentDeptId), {
                        currentStage: 3
                    });
                    
                    alert("????⑤벊??揶쎛???袁⑥┷! 2??ｍ???됲뀱 ?源껊궗!\n\n(3??ｍ??????곗춦??살쨮 ??猷??몃빍??)");
                } catch(e) {
                    console.error(e);
                }
            } else {
                document.getElementById('manager-error-msg-stage2').classList.remove('hidden');
            }
        };
        
    } else {
        // ?????紐낃쉘/筌△뫁??
        document.getElementById('stage2-employee-panel').classList.remove('hidden');
        document.getElementById('stage2-manager-panel').classList.add('hidden');
        
        document.getElementById('stage2-puzzle-title').textContent = puzzleData.title;
        document.getElementById('stage2-puzzle-text').textContent = puzzleData.text;
        document.getElementById('stage2-puzzle-hint').textContent = `??곕뱜: ${puzzleData.hint}`;
        
        const btnSubmit = document.getElementById('btn-stage2-submit');
        const input = document.getElementById('stage2-answer-input');
        
        btnSubmit.onclick = async () => {
            if (input.value === puzzleData.answer) {
                alert(`?類ｋ뼗??낅빍?? ?諭???筌≪뼚? ??ъ쁽??[ ${puzzleData.answer} ] ??낅빍??\n?봔?貫??癒?쓺 ????ъ쁽????뽮퐣??嚥????젻雅뚯눘苑??`);
                btnSubmit.disabled = true;
                btnSubmit.textContent = "??猷??袁⑥┷ (??疫?餓?";
                input.disabled = true;
                
                // Firebase ??낅쑓??꾨뱜
                try {
                    await setDoc(doc(db, `departments/${currentDeptId}/roles`, currentRole), {
                        stage2Confirmed: true,
                        stage2Answer: puzzleData.answer
                    }, { merge: true });
                } catch(e) {
                    console.error(e);
                }
                
            } else {
                alert("??쑬?甕곕뜇?뉐첎? ???紐꾨뮸??덈뼄. ??곕뱜????쇰뻻 ??뚮선癰귣똻苑??");
            }
        };
    }
}

// ==========================================
// Screen 4: 3??ｍ?(?????곗춦?? 嚥≪뮇彛?
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
    
    if (currentRole === '?봔??) {
        document.getElementById('stage3-employee-panel').classList.add('hidden');
        document.getElementById('stage3-manager-panel').classList.remove('hidden');
        
        onSnapshot(collection(db, `departments/${currentDeptId}/roles`), (snapshot) => {
        const roles = ['인턴', '사원', '차장', '부장'];
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
        
        document.getElementById('stage3-manager-title').textContent = "??κ퐣 1: ??깅뮞???뚎됱쑎 ?ル굟鍮";
        document.getElementById('stage3-manager-text').innerHTML = personalColorData.text.replace(/\n/g, '<br>');
        
        document.getElementById('btn-stage3-manager-submit').onclick = () => {
            const val = document.getElementById('stage3-manager-answer-input').value.replace(/\s+/g, '');
            if (val === personalColorData.answer) {
                alert("?類ｋ뼗??낅빍?? ??곸젫 ???癒?굶??筌뤴뫁? ??κ퐣嚥?筌ㅼ뮇伊??????곗춦???袁⑷쉐??뤾쉭??");
                document.getElementById('stage3-manager-step1').classList.add('hidden');
                document.getElementById('stage3-manager-step2').classList.remove('hidden');
            } else {
                alert("??삳뼗??낅빍?? ??쇰뻻 ??룹퍟????紐꾩뒄.");
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
            if (selectedItems['line'] === '揶쎛嚥≪뮇苑? && 
                selectedItems['color'] === '??뽮퉳' && 
                selectedItems['material'] === '筌묕퐢鍮?? &&
                selectedItems['pattern'] === '?臾??얜???) {
                
                errorMsg.classList.add('hidden');
                alert("????袁④펾??몃빍?? ??띻펾???遺우쁽?紐꾩뱽 筌뤴뫀紐??⑥쥓???燁살뮉?싧칰???롮첒 ?뚎됱젂??륁뵠 ?袁⑷쉐??뤿???щ빍??\n??곸젫 ??밸씜??롫뮉 '??쇱퓝???곕뗀以? ?얜챷?ｇ몴??봔??뽰뜚??븍궢 ?醫딆쨴??뤿연 ??욧퍙??뤾쉭??");
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
        
        document.getElementById('stage3-puzzle-title').textContent = "??κ퐣 1: ??깅뮞???뚎됱쑎";
        document.getElementById('stage3-puzzle-text').innerHTML = personalColorData.text.replace(/\n/g, '<br>');
        document.getElementById('stage3-puzzle-hint').textContent = '';
        
        const btnSubmit = document.getElementById('btn-stage3-submit');
        const input = document.getElementById('stage3-answer-input');
        
        let currentStep = 1;
        
        btnSubmit.onclick = async () => {
            if (currentStep === 1) {
                if (input.value.replace(/\s+/g, '') === personalColorData.answer) {
                    alert(`?類μ넇????κ퐣??筌≪뼚釉??щ빍??\n??쇱벉 ??κ퐣???類ㅼ뵥??뤾쉭??`);
                    currentStep = 2;
                    input.value = '';
                    document.getElementById('stage3-puzzle-title').textContent = "??κ퐣 2: 筌△뫗???ｋ궢 ?醫뤾문";
                    document.getElementById('stage3-puzzle-text').innerHTML = PUZZLE_DATA.stage3.bodyType.memo.replace(/\n/g, '<br>') + '<br><br>' + bodyTypeData.text;
                } else {
                    alert("??삳뼗??낅빍?? ?묅뫂?졿???쀫꽑 餓???롪돌????낆젾??뤾쉭??");
                }
            } else if (currentStep === 2) {
                if (input.value.replace(/\s+/g, '') === bodyTypeData.answer) {
                    alert(`筌뤴뫀諭???κ퐣??筌≪뼚釉??щ빍?? ?봔?貫??癒?쓺 ???젻雅뚯눘苑??`);
                    btnSubmit.disabled = true;
                    btnSubmit.textContent = "?袁⑸꽊 ?袁⑥┷ (??疫?餓?";
                    input.disabled = true;
                    
                    try {
                        await setDoc(doc(db, `departments/${currentDeptId}/roles`, currentRole), {
                            stage3Confirmed: true
                        }, { merge: true });
                    } catch(e) {
                        console.error(e);
                    }
                } else {
                    alert("??삳뼗??낅빍?? ??쇰뻻 ??룹퍟????紐꾩뒄!");
                }
            }
        };
        
        
    }
}

// 4??ｍ? ?怨쀫Ф????疫꿸퀣??(T.P.O 獄???띻펾?癒?땾)
function startScreen5() {
    document.getElementById('display-current-role-stage4').textContent = currentRole;
    
    // 筌뤴뫀???袁⑹뒭疫?
    const storyModal = document.getElementById('stage4-story-modal');
    storyModal.classList.remove('hidden');
    document.getElementById('stage4-intro-text').innerHTML = PUZZLE_DATA.stage4.intro.replace(/\n/g, '<br>');
    
    document.getElementById('btn-start-stage4-missions').onclick = () => {
        storyModal.classList.add('hidden');
    };
    
    const puzzleData = PUZZLE_DATA.stage4.puzzles[currentRole];
    
    if (currentRole === '?봔??) {
        document.getElementById('stage4-employee-panel').classList.add('hidden');
        document.getElementById('stage4-manager-panel').classList.remove('hidden');
        document.getElementById('reasoning-textarea').classList.add('hidden');
        
        // ?봔??Step 1: TPO ?癒?
        document.getElementById('stage4-manager-step1-title').textContent = puzzleData.step1.title;
        document.getElementById('stage4-manager-step1-text').textContent = puzzleData.step1.text;
        
        document.getElementById('btn-stage4-manager-step1').onclick = () => {
            const val = document.getElementById('stage4-manager-step1-input').value.replace(/\s+/g, '');
            if (val === puzzleData.step1.answer) {
                alert('?類ｋ뼗??낅빍?? ??곸젫 ???癒?굶????????κ퐣??筌뤴뫁釉?5R ??뽮퐣??筌띿쉸?쎿?筌ㅼ뮇伊???띻펾 ?癒?땾????낆젾??뤾쉭??');
                document.getElementById('stage4-manager-step1').classList.add('hidden');
                document.getElementById('stage4-5r-puzzle').classList.remove('hidden');
            } else {
                alert('??삳뼗??낅빍?? ??쇰뻻 ??룹퍟????紐꾩뒄.');
            }
        };

        // 5R ??뺤삋域?????뺚댘 嚥≪뮇彛?
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
        // --- 筌?뗀苡?????燁살꼶??嚥≪뮇彛?---
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
                e.preventDefault(); // ??쎄쾿嚥?獄쎻뫗?
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
            
            // ??깃맒 甕곌쑵????源??
            document.querySelectorAll('.color-btn').forEach(btn => {
                btn.onclick = () => {
                    document.querySelectorAll('.color-btn').forEach(b => b.style.borderColor = 'transparent');
                    btn.style.borderColor = 'white';
                    ctx.strokeStyle = btn.getAttribute('data-color');
                };
            });
            
            // ?袁㏓럡 甕곌쑵???⑤벏??筌ｌ꼶????λ땾
            const setToolActive = (activeId) => {
                document.querySelectorAll('.btn-tool').forEach(b => b.style.borderColor = 'transparent');
                document.getElementById(activeId).style.borderColor = 'white';
            };

            // ?袁㏓럡 甕곌쑵????源??
            document.getElementById('btn-tool-pen').onclick = () => {
                currentTool = 'pen';
                setToolActive('btn-tool-pen');
                ctx.lineWidth = 5;
                ctx.globalAlpha = 1.0;
                // ?袁⑹삺 ?醫뤾문????깃맒 ?醫?
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
        
        // 筌?뗀苡??AI ?브쑴苑?甕곌쑵??
        const btnAnalyzeCanvas = document.getElementById('btn-analyze-canvas');
        if (btnAnalyzeCanvas) {
            btnAnalyzeCanvas.onclick = () => {
                aiFeedback.classList.remove('hidden');
                aiFeedbackText.textContent = "筌?뗀苡?????筌왖???브쑴苑?餓λ쵐???덈뼄...";
                setTimeout(() => {
                    aiFeedbackText.innerHTML = "<b>[Claude Vision API ?브쑴苑?野껉퀗??</b><br>??롮첒??筌욌뜃而??????쀬겱??뤿???거? ?醫롮벥 ?癒?カ??筌뤴뫀???筌ｋ똾???癰귣똻???????덈즲嚥????燁살꼶由??됰뮸??덈뼄. 5R 餓?'??沅?? ?遺용꺖???怨몄뒠??띾┛ ?ル뿭? ?遺우쁽???類κ묶??낅빍??";
                }, 2500);
            };
        }
        
        // ???뵬 ??낆쨮????AI ?브쑴苑??紐꾪뀱 ?袁⑸뻻 嚥≪뮇彛?
        const fileUpload = document.getElementById('design-upload');
        const aiFeedback = document.getElementById('ai-feedback-panel');
        const aiFeedbackText = document.getElementById('ai-feedback-text');
        
        if (fileUpload) {
            fileUpload.addEventListener('change', () => {
                if(fileUpload.files && fileUpload.files[0]) {
                    aiFeedback.classList.remove('hidden');
                    aiFeedbackText.textContent = "???筌왖???브쑴苑?餓λ쵐???덈뼄...";
                    // ?袁⑸뻻 ?브쑴苑?筌왖????볦퍢
                    setTimeout(() => {
                        aiFeedbackText.innerHTML = "<b>[Claude Vision API ?브쑴苑?野껉퀗??</b><br>??롮첒??筌욌뜃而??????쀬겱??뤿???거? ?醫롮벥 ?癒?カ??筌뤴뫀???筌ｋ똾???癰귣똻???????덈즲嚥????燁살꼶由??됰뮸??덈뼄. 5R 餓?'??沅?? ?遺용꺖???怨몄뒠??띾┛ ?ル뿭? ?遺우쁽???類κ묶??낅빍??";
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
            
            // ??깆쁽 ???뮞?紐낅릭疫???덈즲嚥?isTeamDone 鈺곌퀗援??袁⑸뻻 ??곸젫
            if (is5RCorrect && isScoreCorrect) {
                btnLaunch.disabled = false;
                btnLaunch.style.background = 'linear-gradient(45deg, #FFD700, #FFA500)';
                btnLaunch.style.color = '#000';
                btnLaunch.style.cursor = 'pointer';
                btnLaunch.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.8)';
                btnLaunch.textContent = "????怨쀫Ф??揶쎛?????;
            } else {
                btnLaunch.disabled = true;
                btnLaunch.style.background = '#555';
                btnLaunch.style.color = '#888';
                btnLaunch.style.cursor = 'not-allowed';
                btnLaunch.style.boxShadow = 'none';
                btnLaunch.textContent = "鈺곌퀗援???苑????怨쀫Ф??揶쎛??";
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
        
        // ???癒?굶???類ｋ뼗 ?袁れ넺 ??쇰뻻揶?揶쏅Ŋ??
        onSnapshot(collection(db, `departments/${currentDeptId}/roles`), (snapshot) => {
            let correctCount = 0;
            
            snapshot.forEach(docSnap => {
                const r = docSnap.id;
                const d = docSnap.data();
                
                if (['?紐낃쉘', '????, '筌△뫁??].includes(r)) {
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
            // 野껊슣?좑쭪? 獄???낅쑓??꾨뱜 (??????苑??疫꿸퀡而?
            const simulatedScore = Math.floor((correctCount / 3) * 100);
            scoreFill.style.width = `${simulatedScore}%`;
            scoreText.textContent = `${simulatedScore} / 100 ??;
            
            checkManagerStage4Complete();
        });
        
        // ?怨쀫Ф 甕곌쑵??????(3??ｍ??袁⑥┷) - ??곸젫 DB????낅쑓??꾨뱜??뤿연 筌뤴뫀紐?癒?쓺 ?怨쀫Ф?????뵝
        btnLaunch.onclick = async () => {
            try {
                await updateDoc(doc(db, 'departments', currentDeptId), {
                    currentStage: 5
                });
            } catch(e) {
                console.error("?怨쀫Ф??揶쎛????쎈솭:", e);
                alert("??뺤쒔 ??살첒揶쎛 獄쏆뮇源??됰뮸??덈뼄. ??쇰뻻 ??뺣즲??곻폒?紐꾩뒄.");
            }
        };
        
        const btnSubmitPersonal = document.getElementById('btn-submit-personal-design');
        if (btnSubmitPersonal) {
            btnSubmitPersonal.onclick = () => {
                const reason = document.getElementById('personal-reason').value;
                const r5 = document.getElementById('personal-5r').value;
                if (!reason || !r5) {
                    alert('?袁⑸땾 ?醫뤾문 ?遺용꺖(5R)?? ??곸????怨몃선雅뚯눘苑??');
                    return;
                }
                alert('揶쏆뮇???遺우쁽????뽱뀱???袁⑥┷??뤿???щ빍?? ??뺣짗 ???빵 ??륁뵠筌왖嚥???뤿선揶쏅쵎???');
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
                    alert('筌뤴뫀諭?筌욌뜄揆?????퉸雅뚯눘苑??');
                    return;
                }
                alert('???㉦?????빵 揶쏅Ŋ沅??몃빍?? 筌뤴뫀諭???뺣짗???ル굝利??뤿???щ빍??');
                document.getElementById('screen-7').classList.add('hidden');
                
                // ?癒곕툡嚥≪뮄??筌뤴뫀????뽯뻻
                const epilogueModal = document.getElementById('epilogue-modal');
                if (epilogueModal) epilogueModal.classList.remove('hidden');
                
                // ?癒곕툡嚥≪뮄????ろ??袁⑥구???遺얇늺??곗쨮
                const btnCloseEpilogue = document.getElementById('btn-close-epilogue');
                if (btnCloseEpilogue) {
                    btnCloseEpilogue.onclick = () => {
                        epilogueModal.classList.add('hidden');
                        const endingScreen = document.getElementById('screen-ending');
                        if (endingScreen) endingScreen.classList.remove('hidden');
                        
                        // ?봔??뺤구 ??쇱젟
                        let deptName = '?怨뺚봺 ?봔??;
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
        // ?紐낃쉘, ???? 筌△뫁??
        document.getElementById('stage4-employee-panel').classList.remove('hidden');
        document.getElementById('stage4-manager-panel').classList.add('hidden');
        
        const optionsContainer = document.getElementById('stage4-options-container');
        optionsContainer.innerHTML = `
            <h3 id="stage4-puzzle-title" style="color: var(--accent-gold); margin-bottom: 1rem;"></h3>
            <p id="stage4-puzzle-text" style="font-size: 1.1rem; text-align: left; margin-bottom: 1rem; line-height: 1.6;"></p>
            <input type="text" id="stage4-employee-input" placeholder="?類ｋ뼗 ??낆젾" style="width:100%; padding: 0.8rem; text-align: center; font-size: 1.2rem; border-radius: 8px; border: 1px solid var(--accent-gold); background: rgba(0,0,0,0.6); color: white;">
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
                    alert('?類ｋ뼗??낅빍?? ??쇱벉 沃섎챷???곗쨮 ??뤿선揶쏅쵎???');
                    currentStep = stepsSequence[stepIdx];
                    titleEl.textContent = puzzleData[currentStep].title;
                    textEl.textContent = puzzleData[currentStep].text;
                    input.value = '';
                } else {
                    alert(`筌뤴뫀諭?疫꿸퀬???野꺜?醫? ?袁⑥┷??뤿???щ빍?? ?봔?貫???袁れ넺?癒?퓠 獄쏆꼷???뤿???щ빍??`);
                    btnSubmit.disabled = true;
                    btnSubmit.textContent = "疫꿸퀬????類ㅼ젟 ?袁⑥┷";
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
                feedback.textContent = "??롢걵???類ｋ뼗??낅빍?? ??쇰뻻 ??룹퍟????紐꾩뒄.";
                feedback.classList.remove('hidden');
            }
        };
    }
    
    // ?봔??獄?????筌뤴뫀紐?癒?쓺 ?怨몄뒠??롫뮉 ?袁⑸열 ?귐딅뮞??(Stage 5 / QR ??쇳떔 ??ｍ?筌욊쑴??
    onSnapshot(doc(db, 'departments', currentDeptId), (docSnap) => {
        const d = docSnap.data();
        if (d && d.currentStage === 5) {
            const successModal = document.getElementById('stage3-success-modal');
            const pwDisplay = document.getElementById('stage3-revealed-password');
            const guideText = document.getElementById('stage3-guide-text');
            const closeBtn = document.getElementById('btn-close-stage3-success');
            const waitingMsg = document.getElementById('stage3-waiting-msg');

            if (successModal && successModal.classList.contains('hidden')) {
                // pwDisplay ?온??嚥≪뮇彛?? ??볤탢??
                if (guideText) {
                    guideText.innerHTML = "??곸젫 ???癒?굶????ｍ뜞 ?대Ŋ????逾뽩첎?????ｊ볼????덈뮉 <strong>鈺곌퀗而??癒?뼊</strong>??筌≪뼚釉섋퉪?곴쉭??<br>?癒?뼊??筌≪뼚? ?? <strong>??釉???怨???곸뵠 ?????袁㏓럡??????뺤쨮</strong> ?癒?뼊???븐늿堉???덈뮉 QR ?꾨뗀諭띄몴??????燁삳?李??곗쨮 ??쇳떔??뤾쉭??";
                }
                
                closeBtn.classList.remove('hidden'); // ?袁㏓럡????쇳떔 筌≪럩????????됱벉
                if(waitingMsg) waitingMsg.classList.add('hidden');
                
                successModal.classList.remove('hidden');

                // ?袁㏓럵揶쎛 QR??筌〓씮堉?鈺곌퀗而????얜굣??롢늺 筌뤴뫀紐℡첎? 6??ｍ롦에???뤿선揶?
                const unsub = onSnapshot(doc(db, 'pieces', currentDeptId), (pieceSnap) => {
                    if (pieceSnap.exists() && pieceSnap.data().unlocked) {
                        unsub();
                        document.getElementById('stage3-success-modal').classList.add('hidden');
                        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
                    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
                        document.getElementById('screen-6').classList.remove('hidden');
                        document.getElementById('display-current-role-stage6').textContent = currentRole;
                        alert('??????癒?뵠 鈺곌퀗而???源껊궗?怨몄몵嚥?筌≪뼚釉??щ빍?? ??쇱벉 沃섎챷???곗쨮 ??뤿선揶쏅쵎???');
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
            document.getElementById('qr-dept-name').textContent = currentDeptName || '?怨뺚봺 ?봔??;
        };
    }
}

// ??竊?(Confetti) ?醫딅빍筌롫뗄?????λ땾
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

// ??쇱퓝???곕뗀以?筌뤴뫀??嚥≪뮇彛?
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
            allKeywords = rData.answers.concat(['??롢걵??, '??λ선', '?곕떽?']);
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
        // ??쇱뜖???癒??醫? ??용뮉 野껋럩??(??λ떄 ?醫딆쨴)
        keywordsContainer.parentElement.style.display = 'none';
        sentenceContainer.innerHTML = `
            <p style="color: var(--accent-gold); text-align: center; margin-bottom: 1rem;">???癒?굶???겸뫖????醫딆쨴??筌욊쑵六???? ?봔?貫???<b>[??뱀벥 ?袁⑥┷]</b> 甕곌쑵??????쑎雅뚯눘苑??</p>
            <textarea id="reasoning-summary" rows="4" style="width: 100%; padding: 10px; background: rgba(255,255,255,0.1); border: 1px solid var(--accent-gold); color: white; border-radius: 5px; margin-bottom: 1rem; box-sizing: border-box; font-family: inherit;" placeholder="????筌ㅼ뮇伊???뱀벥 ??곸뒠????용궔???癒??嚥?苡??類ｂ봺??뤾쉭??.."></textarea>
        `;
    }
    
    const btnSubmit = document.getElementById('btn-submit-reasoning');
    btnSubmit.classList.remove('hidden');
    btnSubmit.style.display = 'inline-block';
    btnSubmit.textContent = rData.keywordLock ? '?癒?????疫? : '??뱀벥 ?袁⑥┷';
    btnSubmit.onclick = async () => {
        if (currentRole !== '?봔??) {
            alert('筌ㅼ뮇伊?野껉퀣??獄???뽱뀱?? [?봔??筌?揶쎛?館鍮??덈뼄. ?봔??뽰뜚??븍궢 ?怨몄벥??뤿연 ?봔?貫???野껉퀣???????틠?깃쉭??');
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
            // ?遺용튋 ??용뮞?硫? ??됱몵筌?DB??????
            const summaryEl = document.getElementById('reasoning-summary');
            if (summaryEl && summaryEl.value.trim() !== '') {
                try {
                    await setDoc(doc(db, `departments/${currentDeptId}/reasoning`, `stage${targetStageNum-1}`), {
                        roleGroup: currentRole,
                        summary: summaryEl.value.trim()
                    }, { merge: true });
                } catch(e) { console.error("?遺용튋 ??????쎈솭:", e); }
            }

            alert('?????뱀벥 獄???쇱퓝???곕뗀以???袁⑥┷??뤿???щ빍?? ??쇱벉 ??ｍ롦에???猷??몃빍??');
            modal.classList.add('hidden');
            
            try {
                await updateDoc(doc(db, 'departments', currentDeptId), {
                    currentStage: targetStageNum,
                    showStage1Reasoning: false,
                    showStage3Reasoning: false
                });
            } catch(e) {
                console.error("DB ??낅쑓??꾨뱜 ??쎈솭:", e);
                alert('??뺤쒔?? ?怨뚭퍙???얜챷?ｅ첎? ??됰뮸??덈뼄. ?醫롫뻻 ????쇰뻻 ??뺣즲??곻폒?紐꾩뒄.');
            }
        } else {
            alert('???紐꾨뮸??덈뼄! ?얜챶?????쇰뻻 ???툢??뤿연 ??而?몴???쇱뜖??? 筌?쑴?숃퉪?곴쉭??');
        }
    };
}

// ?λ뜃由????λ땾
async function initApp() {
    renderDeptGrid();
    
    // QR ??쇳떔??곗쨮 筌욊쑴???덈뮉筌왖 ?類ㅼ뵥 (?qr=true)
    const urlParams = new URLSearchParams(window.location.search);
    const isQrScan = urlParams.get('qr') === 'true';

    // ?紐꾨????λ툡??덈뼄筌???????ｍ롦에?獄쏅뗀以?癰귣벀??
    if (currentDeptId && currentRole) {
        try {
            // ?봔??뽰벥 currentStage 癰궰野껋럩????쇰뻻揶쏄쑴?앮에?揶쏅Ŋ???뤿연 ?遺얇늺 ?癒?짗 ?袁れ넎
            onSnapshot(doc(db, 'departments', currentDeptId), (snap) => {
                if (snap.exists()) {
                    const stage = snap.data().currentStage || 0;
                    
                    deptSelection.classList.add('hidden');
                    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
                    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
                    
                    // QR ??쇳떔 筌욊쑴???野껋럩??獄쏅뗀以?QR ?遺얇늺??곗쨮 ??猷?(?봔?貫彛???됱뒠)
                    if (isQrScan) {
                        if (currentRole !== '?봔??) {
                            alert('QR ??쇳떔???酉????낆젾?? ?봔?貫?귨쭕???????됰뮸??덈뼄!\n?봔?貫???????怨쀬몵嚥???쇳떔??곻폒?紐꾩뒄.');
                            // ??쎈탣??뤿뻻????疫??遺얇늺??곗쨮 ???젻癰귣?源?(?怨쀪퐨 0??ｍ??遺얇늺 ?袁?)
                            document.getElementById('screen-0').classList.remove('hidden');
                            return;
                        }
                        document.getElementById('screen-qr').classList.remove('hidden');
                        document.getElementById('qr-dept-name').textContent = currentDeptName || '?怨뺚봺 ?봔??;
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
                    // ???뵠??荑??곷뮞???봔???얜챷苑뚦첎? ??곸몵筌??λ뜃由?遺얜쭆 野껋럩?? ?紐꾨??醫듼뵝
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

// ?袁⑷퍥 ?遺얇늺 筌뤴뫁釉섋퉪?용┛ (God Mode)
const devGodModeBtn = document.getElementById('dev-god-mode');
if (devGodModeBtn) {
    let godMode = false;
    devGodModeBtn.addEventListener('click', () => {
        godMode = !godMode;
        if (godMode) {
            devGodModeBtn.textContent = '???癒?삋??嚥?癰귣벀???띾┛ (??덉쨮?⑥쥙臾?';
            devGodModeBtn.style.background = '#ff0055';
            
            // ??삳쐭 ??뽯뻻
            document.getElementById('main-header').classList.remove('hidden');
            
            // 筌뤴뫀諭???쎄쾿????뽯뻻 (??쎈탣??뤿뻻, ?봔???醫뤾문 ??뽰뇚)
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
            
            // 筌뤴뫀諭??봔????????ㅺ섯, 筌뤴뫀??????? ??곸젫
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
            
            // ??쎈꽅??筌뤴뫀?뽳㎕?덈굶???紐껋뵬?紐꾩몵嚥???뽯뻻
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

// --- QR 鈺곌퀗而?筌≪뼐由??遺얇늺 嚥≪뮇彛?---
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
        
        // ??낆젾揶쏅????類ｋ뼗?癒?퐣 ?袁⑸선?怨뚮┛??筌뤴뫀紐???볤탢??뤿연 ??쑨??(?온????띿쓺)
        if (inputPw.replace(/\s+/g, '') === correctPw.replace(/\s+/g, '')) {
            qrErrorMsg.classList.add('hidden');
            btnSubmitQr.classList.add('hidden');
            qrPasswordInput.disabled = true;
            qrSuccessPanel.classList.remove('hidden');
            
            // pieces ?뚎됱젂????낅쑓??꾨뱜
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

// --- ????뺣궖??嚥≪뮇彛?---
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
    
    // Firestore pieces ?뚎됱젂????쇰뻻揶??닌됰즴
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
        
        // 筌뤴뫀紐???곸젫??뤿??????怨쀭뀱
        if (unlockedCount >= totalDepts && totalDepts > 0) {
            setTimeout(() => {
                fabricPuzzleContainer.classList.add('scale-up-anim');
                const finalMsg = document.getElementById('dashboard-final-message');
                finalMsg.classList.remove('hidden');
                
                // ?袁⑸뻻嚥???롫굡?꾨뗀逾??筌롫뗄?놅쭪? (野껊슣?좑쭪? ?怨뺣짗 ??
                document.getElementById('dashboard-final-text').innerHTML = "?⑥쥓彛???뒄, ????겫? ????겫袁⑹뵠 筌왖?녹뮆沅?筌띾슦寃?? ?브쑬梨?????よ???선?? ??쇱벉?癒?뮉 鈺곌퀗???? 筌왖????館釉??醫뤾문 筌잛럩?앮에????紐꾩뵠 疫꿸퀣?깍쭖??ル뿪荑??곸뒄.";
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
        // ?癒?삋 ??덈쐲 ?遺얇늺??곗쨮 ???툡揶쎛疫?(????뺣궖??뺣뮉 ?온?귐딆쁽??QR ?袁⑥┷ ?遺얇늺?癒?퐣筌???쇰선??
        // ??由????쎈탣??뤿뻻??QR ?遺얇늺??곗쨮 癰귣?沅↑린袁ⓥ뵝
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
        if (confirm('筌뤴뫀諭?疫꿸퀗由???紐꾨???λ뜃由?酉釉??筌ｌ꼷???遺얇늺??곗쨮 ???툡揶쎛??볦퓢??щ빍繹?')) {
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


