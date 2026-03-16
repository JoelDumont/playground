// Git graph visualizer with two scenarios: rebase and merge.

const CANVAS_WIDTH = 1240;
const CANVAS_HEIGHT = 620;
const COMMIT_RADIUS = 26;
const REBASE_STEP_FRAMES = 80;
const REBASE_PAUSE_FRAMES = 30;
const MERGE_STEP_FRAMES = 95;
const MERGE_PAUSE_FRAMES = 40;

const UI = {
    background: [26, 31, 40],
    grid: [45, 54, 69],
    text: [232, 238, 247],
    muted: [150, 162, 182],
    main: [74, 163, 255],
    feature: [243, 155, 74],
    merge: [120, 255, 166]
};

let activeScenario = 'rebase';

let commitNodes = [];
let edges = [];
let pointers = [];

let rebasePlan = [];
let rebaseAnimation = null;
let rebaseFrame = 0;
let rebasePlanIndex = 0;
let rebasePauseFrames = 0;
let rebaseDone = false;

let mergeAnimation = null;
let mergeFrame = 0;
let mergePauseFrames = 0;
let mergeDone = false;

function setup() {
    const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    canvas.parent('canvas-container');
    textFont('Consolas');
    bindScenarioControls();
    initScene();
}

function draw() {
    background(...UI.background);
    drawBackdrop();

    if (activeScenario === 'rebase') {
        updateRebaseAnimation();
    } else {
        updateMergeAnimation();
    }

    drawEdges();
    drawCommitNodes();
    drawBranchPointers();
    drawHud();
    syncStatusPanel();
}

function keyPressed() {
    if (key === 'r' || key === 'R') {
        initScene();
    }
}

function bindScenarioControls() {
    const buttons = document.querySelectorAll('.scenario-btn');
    for (const button of buttons) {
        button.addEventListener('click', () => {
            const scenario = button.dataset.scenario;
            if (scenario) {
                setScenario(scenario);
            }
        });
    }
    updateScenarioButtons();
}

function setScenario(scenario) {
    if (scenario !== 'rebase' && scenario !== 'merge') {
        return;
    }
    activeScenario = scenario;
    updateScenarioButtons();
    initScene();
}

function updateScenarioButtons() {
    const buttons = document.querySelectorAll('.scenario-btn');
    for (const button of buttons) {
        const isActive = button.dataset.scenario === activeScenario;
        button.classList.toggle('active', isActive);
    }
}

function initScene() {
    commitNodes = [];
    edges = [];
    pointers = [];

    if (activeScenario === 'rebase') {
        initRebaseScene();
    } else {
        initMergeScene();
    }
}

function initRebaseScene() {
    rebasePlan = [];
    rebaseAnimation = null;
    rebaseFrame = 0;
    rebasePlanIndex = 0;
    rebasePauseFrames = 0;
    rebaseDone = false;

    const mainY = 210;
    const featureY = 390;

    const m1 = createCommit('m1', 'a1c4f90', 150, mainY, 'main');
    const m2 = createCommit('m2', 'd2b744e', 340, mainY, 'main');
    const m3 = createCommit('m3', 'f87e232', 530, mainY, 'main');
    const m4 = createCommit('m4', '1ea03bf', 720, mainY, 'main');

    const f1 = createCommit('f1', '9ca0f44', 340, featureY, 'feature');
    const f2 = createCommit('f2', '6bf2310', 530, featureY, 'feature');
    const f3 = createCommit('f3', '8d1ae55', 720, featureY, 'feature');

    createEdge(m1, m2, 'main');
    createEdge(m2, m3, 'main');
    createEdge(m3, m4, 'main');

    createEdge(m2, f1, 'feature');
    createEdge(f1, f2, 'feature');
    createEdge(f2, f3, 'feature');

    pointers.push({ label: 'main', targetId: m4.id, color: color(...UI.main), yOffset: -70 });
    pointers.push({ label: 'feature', targetId: f3.id, color: color(...UI.feature), yOffset: 72 });

    rebasePlan = [
        { oldId: f1.id, newId: 'f1r', hash: '3a9db10', message: 'Replaying feature commit 1...' },
        { oldId: f2.id, newId: 'f2r', hash: '45bc9d2', message: 'Replaying feature commit 2...' },
        { oldId: f3.id, newId: 'f3r', hash: 'af22133', message: 'Replaying feature commit 3...' }
    ];
}

function initMergeScene() {
    mergeAnimation = null;
    mergeFrame = 0;
    mergePauseFrames = MERGE_PAUSE_FRAMES;
    mergeDone = false;

    const mainY = 210;
    const featureY = 390;

    const m1 = createCommit('m1', 'a1c4f90', 150, mainY, 'main');
    const m2 = createCommit('m2', 'd2b744e', 340, mainY, 'main');
    const m3 = createCommit('m3', 'f87e232', 530, mainY, 'main');
    const m4 = createCommit('m4', '1ea03bf', 720, mainY, 'main');

    const f1 = createCommit('f1', '9ca0f44', 340, featureY, 'feature');
    const f2 = createCommit('f2', '6bf2310', 530, featureY, 'feature');
    const f3 = createCommit('f3', '8d1ae55', 720, featureY, 'feature');

    createEdge(m1, m2, 'main');
    createEdge(m2, m3, 'main');
    createEdge(m3, m4, 'main');

    createEdge(m2, f1, 'feature');
    createEdge(f1, f2, 'feature');
    createEdge(f2, f3, 'feature');

    pointers.push({ label: 'main', targetId: m4.id, color: color(...UI.main), yOffset: -70 });
    pointers.push({ label: 'feature', targetId: f3.id, color: color(...UI.feature), yOffset: 72 });
}

function createCommit(id, hash, x, y, lane) {
    const node = {
        id,
        hash,
        x,
        y,
        lane,
        superseded: false,
        alpha: 255
    };
    commitNodes.push(node);
    return node;
}

function createEdge(fromNode, toNode, kind) {
    edges.push({ from: fromNode.id, to: toNode.id, kind, alpha: 255 });
}

function updateRebaseAnimation() {
    if (rebaseDone) {
        return;
    }

    if (rebasePauseFrames > 0) {
        rebasePauseFrames -= 1;
        return;
    }

    if (!rebaseAnimation) {
        if (rebasePlanIndex >= rebasePlan.length) {
            rebaseDone = true;
            return;
        }
        startReplay(rebasePlan[rebasePlanIndex]);
    }

    rebaseFrame += 1;
    const t = constrain(rebaseFrame / REBASE_STEP_FRAMES, 0, 1);
    const eased = easeInOutCubic(t);

    rebaseAnimation.node.x = lerp(rebaseAnimation.startX, rebaseAnimation.endX, eased);
    rebaseAnimation.node.y = lerp(rebaseAnimation.startY, rebaseAnimation.endY, eased);

    if (t >= 1) {
        finishReplay();
    }
}

function startReplay(step) {
    const oldNode = getNode(step.oldId);
    const mainPointer = getPointer('main');
    const mainHead = mainPointer ? getNode(mainPointer.targetId) : null;

    if (!oldNode || !mainHead) {
        rebaseDone = true;
        return;
    }

    const newNode = createCommit(step.newId, step.hash, oldNode.x, oldNode.y, 'rebased');
    newNode.alpha = 170;

    // Keep replayed commits inside the pane while still spacing them apart.
    const horizontalSpacing = 150 + rebasePlanIndex * 120;
    const safeEndX = min(mainHead.x + horizontalSpacing, width - 90);

    rebaseAnimation = {
        step,
        oldNode,
        node: newNode,
        startX: oldNode.x,
        startY: oldNode.y,
        endX: safeEndX,
        endY: mainHead.y,
        message: step.message
    };
    rebaseFrame = 0;
}

function finishReplay() {
    const featurePointer = getPointer('feature');
    const previousHead = featurePointer ? getNode(featurePointer.targetId) : null;
    const replayed = rebaseAnimation.node;

    replayed.alpha = 255;
    replayed.lane = 'feature';

    const mainPointer = getPointer('main');
    const mainHead = mainPointer ? getNode(mainPointer.targetId) : null;
    if (!featurePointer || !mainHead) {
        rebaseDone = true;
        return;
    }

    if (rebasePlanIndex === 0) {
        createEdge(mainHead, replayed, 'feature');
    } else if (previousHead) {
        createEdge(previousHead, replayed, 'feature');
    }

    featurePointer.targetId = replayed.id;
    rebaseAnimation.oldNode.superseded = true;
    rebaseAnimation.oldNode.alpha = 75;

    fadeOriginalEdge(rebaseAnimation.oldNode.id);

    rebaseAnimation = null;
    rebasePlanIndex += 1;
    rebasePauseFrames = REBASE_PAUSE_FRAMES;
}

function updateMergeAnimation() {
    if (mergeDone) {
        return;
    }

    if (mergePauseFrames > 0) {
        mergePauseFrames -= 1;
        return;
    }

    if (!mergeAnimation) {
        startMergeCommit();
    }

    mergeFrame += 1;
    const t = constrain(mergeFrame / MERGE_STEP_FRAMES, 0, 1);
    const eased = easeInOutCubic(t);

    mergeAnimation.node.x = lerp(mergeAnimation.startX, mergeAnimation.endX, eased);
    mergeAnimation.node.y = lerp(mergeAnimation.startY, mergeAnimation.endY, eased);
    mergeAnimation.node.alpha = lerp(120, 255, eased);

    if (t >= 1) {
        finishMergeCommit();
    }
}

function startMergeCommit() {
    const mainPointer = getPointer('main');
    const featurePointer = getPointer('feature');
    const mainHead = mainPointer ? getNode(mainPointer.targetId) : null;
    const featureHead = featurePointer ? getNode(featurePointer.targetId) : null;

    if (!mainHead || !featureHead) {
        mergeDone = true;
        return;
    }

    const startX = (mainHead.x + featureHead.x) / 2;
    const startY = 110;
    const endX = min(max(mainHead.x + 180, 860), width - 100);
    const endY = 300;

    const mergeNode = createCommit('mg1', 'c81fa07', startX, startY, 'merge');
    mergeNode.alpha = 120;

    mergeAnimation = {
        node: mergeNode,
        mainHead,
        featureHead,
        startX,
        startY,
        endX,
        endY,
        message: 'Creating merge commit from main and feature tips...'
    };
    mergeFrame = 0;
}

function finishMergeCommit() {
    const mainPointer = getPointer('main');
    if (!mainPointer) {
        mergeDone = true;
        return;
    }

    const mergeNode = mergeAnimation.node;
    mergeNode.alpha = 255;

    createEdge(mergeAnimation.mainHead, mergeNode, 'merge');
    createEdge(mergeAnimation.featureHead, mergeNode, 'merge');

    mainPointer.targetId = mergeNode.id;
    mergeAnimation = null;
    mergeDone = true;
}

function fadeOriginalEdge(fromId) {
    for (let i = 0; i < edges.length; i++) {
        const edge = edges[i];
        if (edge.to === fromId || edge.from === fromId) {
            edge.alpha = 80;
        }
    }
}

function drawBackdrop() {
    drawSubtleGrid();

    noStroke();
    fill(41, 49, 63, 180);
    rect(70, 130, width - 140, 150, 12);

    fill(50, 45, 38, 185);
    rect(70, 320, width - 140, 170, 12);

    fill(...UI.muted);
    textSize(12);
    textAlign(LEFT, CENTER);
    text('main', 88, 146);
    text(activeScenario === 'rebase' ? 'feature (before -> after rebase)' : 'feature (merged into main)', 88, 336);
}

function drawEdges() {
    for (const edge of edges) {
        const fromNode = getNode(edge.from);
        const toNode = getNode(edge.to);
        if (!fromNode || !toNode) {
            continue;
        }

        const isDashed = fromNode.superseded || toNode.superseded;
        if (edge.kind === 'main') {
            stroke(UI.main[0], UI.main[1], UI.main[2], edge.alpha);
        } else if (edge.kind === 'merge') {
            stroke(UI.merge[0], UI.merge[1], UI.merge[2], edge.alpha);
        } else {
            stroke(UI.feature[0], UI.feature[1], UI.feature[2], edge.alpha);
        }

        strokeWeight(3);
        if (isDashed) {
            drawDashedLine(fromNode.x, fromNode.y, toNode.x, toNode.y, 8, 6);
        } else {
            line(fromNode.x, fromNode.y, toNode.x, toNode.y);
        }
    }
}

function drawCommitNodes() {
    textAlign(CENTER, CENTER);
    textSize(11);

    for (const node of commitNodes) {
        const palette = paletteForLane(node.lane);
        fill(red(palette.fill), green(palette.fill), blue(palette.fill), node.alpha);
        stroke(red(palette.stroke), green(palette.stroke), blue(palette.stroke), node.alpha);
        strokeWeight(2);
        circle(node.x, node.y, COMMIT_RADIUS * 2);

        noStroke();
        fill(12, 16, 22, node.alpha);
        text(node.hash.slice(0, 6), node.x, node.y);
        drawCommitLabel(node);
    }
}

function drawCommitLabel(node) {
    const labelText = node.id;
    textSize(11);
    const labelWidth = textWidth(labelText) + 14;
    const y = node.y - COMMIT_RADIUS - 16;

    noStroke();
    fill(node.superseded ? 78 : 175, 188, 209, node.alpha);
    rectMode(CENTER);
    rect(node.x, y, labelWidth, 18, 6);
    fill(243, 246, 252, node.alpha);
    text(labelText, node.x, y + 0.5);
    rectMode(CORNER);
}

function drawBranchPointers() {
    textAlign(CENTER, CENTER);
    textSize(13);

    for (const pointer of pointers) {
        const target = getNode(pointer.targetId);
        if (!target) {
            continue;
        }

        const pointerY = target.y + pointer.yOffset;
        fill(pointer.color);
        stroke(pointer.color);
        strokeWeight(2);
        line(target.x, pointerY + (pointer.yOffset > 0 ? -12 : 12), target.x, target.y + (pointer.yOffset > 0 ? -28 : 28));

        noStroke();
        rectMode(CENTER);
        rect(target.x, pointerY, 96, 28, 8);
        fill(18, 22, 30);
        text(pointer.label, target.x, pointerY + 1);
        rectMode(CORNER);
    }
}

function drawHud() {
    noStroke();
    fill(...UI.text);
    textAlign(LEFT, TOP);
    textSize(13);
    text(activeScenario === 'rebase' ? 'Rebase Replay' : 'Merge Replay', 22, 20);

    fill(...UI.muted);
    text(getStatusText(), 22, 42);

    fill(...UI.main);
    circle(width - 252, 28, 10);
    fill(...UI.text);
    text('main branch', width - 238, 20);

    fill(...UI.feature);
    circle(width - 252, 52, 10);
    fill(...UI.text);
    text('feature branch', width - 238, 44);

    if (activeScenario === 'merge') {
        fill(...UI.merge);
        circle(width - 252, 76, 10);
        fill(...UI.text);
        text('merge edges/commit', width - 238, 68);
    }
}

function syncStatusPanel() {
    const statusNode = document.getElementById('status-text');
    const cmdNode = document.getElementById('cmd-text');

    if (cmdNode) {
        cmdNode.textContent = getCommandText();
    }
    if (statusNode) {
        statusNode.textContent = getStatusText();
    }
}

function getCommandText() {
    if (activeScenario === 'merge') {
        return 'git checkout main ; git merge feature';
    }
    return 'git checkout feature ; git rebase main';
}

function getStatusText() {
    if (activeScenario === 'merge') {
        if (mergeDone) {
            return 'Merge complete. main now points at the merge commit.';
        }
        if (mergeAnimation) {
            return mergeAnimation.message;
        }
        return 'Preparing merge visualization...';
    }

    if (rebaseDone) {
        return 'Rebase complete. feature now points to the replayed tip.';
    }
    if (rebaseAnimation) {
        return rebaseAnimation.message;
    }
    return 'Preparing next replay step...';
}

function paletteForLane(lane) {
    if (lane === 'main') {
        return { fill: color(125, 189, 255), stroke: color(...UI.main) };
    }
    if (lane === 'rebased') {
        return { fill: color(255, 206, 161), stroke: color(233, 137, 61) };
    }
    if (lane === 'merge') {
        return { fill: color(174, 255, 205), stroke: color(...UI.merge) };
    }
    return { fill: color(247, 173, 112), stroke: color(...UI.feature) };
}

function getNode(id) {
    for (const node of commitNodes) {
        if (node.id === id) {
            return node;
        }
    }
    return null;
}

function getPointer(label) {
    for (const pointer of pointers) {
        if (pointer.label === label) {
            return pointer;
        }
    }
    return null;
}

function drawDashedLine(x1, y1, x2, y2, dashLength, gapLength) {
    const distance = dist(x1, y1, x2, y2);
    const dx = (x2 - x1) / distance;
    const dy = (y2 - y1) / distance;

    let traveled = 0;
    while (traveled < distance) {
        const startX = x1 + dx * traveled;
        const startY = y1 + dy * traveled;
        const endStep = min(traveled + dashLength, distance);
        const endX = x1 + dx * endStep;
        const endY = y1 + dy * endStep;
        line(startX, startY, endX, endY);
        traveled += dashLength + gapLength;
    }
}

function easeInOutCubic(t) {
    return t < 0.5
        ? 4 * t * t * t
        : 1 - pow(-2 * t + 2, 3) / 2;
}

function drawSubtleGrid() {
    stroke(UI.grid[0], UI.grid[1], UI.grid[2], 95);
    strokeWeight(1);

    for (let x = 0; x <= width; x += 40) {
        line(x, 0, x, height);
    }

    for (let y = 0; y <= height; y += 40) {
        line(0, y, width, y);
    }
}
