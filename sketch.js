// Git Rebase Visualizer
// Animates feature commits being replayed onto the latest main commit.

const COMMIT_RADIUS = 26;
const REBASE_STEP_FRAMES = 80;
const REBASE_PAUSE_FRAMES = 30;

const UI = {
    background: [26, 31, 40],
    panel: [31, 38, 49],
    grid: [45, 54, 69],
    text: [232, 238, 247],
    muted: [150, 162, 182],
    main: [74, 163, 255],
    feature: [243, 155, 74],
    active: [120, 255, 166],
    ghost: [123, 133, 151]
};

let commitNodes = [];
let edges = [];
let pointers = [];
let rebasePlan = [];
let activeAnimation = null;
let animationFrame = 0;
let planIndex = 0;
let pauseFrames = 0;
let rebaseDone = false;

function setup() {
    const canvas = createCanvas(1020, 620);
    canvas.parent('canvas-container');
    textFont('Consolas');
    initScene();
}

function draw() {
    background(...UI.background);
    drawBackdrop();
    updateRebaseAnimation();
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

function initScene() {
    commitNodes = [];
    edges = [];
    pointers = [];
    rebasePlan = [];
    activeAnimation = null;
    animationFrame = 0;
    planIndex = 0;
    pauseFrames = 0;
    rebaseDone = false;

    const mainY = 210;
    const featureY = 390;

    const m1 = createCommit('m1', 'a1c4f90', 150, mainY, 'main');
    const m2 = createCommit('m2', 'd2b744e', 320, mainY, 'main');
    const m3 = createCommit('m3', 'f87e232', 500, mainY, 'main');
    const m4 = createCommit('m4', '1ea03bf', 680, mainY, 'main');

    const f1 = createCommit('f1', '9ca0f44', 320, featureY, 'feature');
    const f2 = createCommit('f2', '6bf2310', 500, featureY, 'feature');
    const f3 = createCommit('f3', '8d1ae55', 680, featureY, 'feature');

    createEdge(m1, m2, false);
    createEdge(m2, m3, false);
    createEdge(m3, m4, false);

    createEdge(m2, f1, true);
    createEdge(f1, f2, true);
    createEdge(f2, f3, true);

    pointers.push({ label: 'main', targetId: m4.id, color: color(...UI.main), yOffset: -70 });
    pointers.push({ label: 'feature', targetId: f3.id, color: color(...UI.feature), yOffset: 72 });

    rebasePlan = [
        { oldId: f1.id, newId: 'f1r', hash: '3a9db10', message: 'Replay feature commit 1' },
        { oldId: f2.id, newId: 'f2r', hash: '45bc9d2', message: 'Replay feature commit 2' },
        { oldId: f3.id, newId: 'f3r', hash: 'af22133', message: 'Replay feature commit 3' }
    ];
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

function createEdge(fromNode, toNode, isFeature) {
    edges.push({ from: fromNode.id, to: toNode.id, isFeature, alpha: 255 });
}

function updateRebaseAnimation() {
    if (rebaseDone) {
        return;
    }

    if (pauseFrames > 0) {
        pauseFrames -= 1;
        return;
    }

    if (!activeAnimation) {
        if (planIndex >= rebasePlan.length) {
            rebaseDone = true;
            return;
        }
        startReplay(rebasePlan[planIndex]);
    }

    animationFrame += 1;
    const t = constrain(animationFrame / REBASE_STEP_FRAMES, 0, 1);
    const eased = easeInOutCubic(t);

    activeAnimation.node.x = lerp(activeAnimation.startX, activeAnimation.endX, eased);
    activeAnimation.node.y = lerp(activeAnimation.startY, activeAnimation.endY, eased);

    if (t >= 1) {
        finishReplay();
    }
}

function startReplay(step) {
    const oldNode = getNode(step.oldId);
    const mainPointer = getPointer('main');
    const mainHead = getNode(mainPointer.targetId);

    if (!oldNode || !mainHead) {
        rebaseDone = true;
        return;
    }

    const newNode = createCommit(step.newId, step.hash, oldNode.x, oldNode.y, 'rebased');
    newNode.alpha = 170;

    // Space each rebased commit to the right of the previous one.
    const horizontalSpacing = 170 + planIndex * COMMIT_RADIUS * 3;

    activeAnimation = {
        step,
        oldNode,
        node: newNode,
        startX: oldNode.x,
        startY: oldNode.y,
        endX: mainHead.x + horizontalSpacing,
        endY: mainHead.y,
        message: step.message
    };
    animationFrame = 0;
}

function finishReplay() {
    const featurePointer = getPointer('feature');
    const previousHead = getNode(featurePointer.targetId);
    const replayed = activeAnimation.node;

    replayed.alpha = 255;
    replayed.lane = 'feature';

    const mainPointer = getPointer('main');
    const mainHead = getNode(mainPointer.targetId);

    if (planIndex === 0) {
        createEdge(mainHead, replayed, true);
    } else {
        createEdge(previousHead, replayed, true);
    }

    featurePointer.targetId = replayed.id;
    activeAnimation.oldNode.superseded = true;
    activeAnimation.oldNode.alpha = 75;

    fadeOriginalEdge(activeAnimation.oldNode.id);

    activeAnimation = null;
    planIndex += 1;
    pauseFrames = REBASE_PAUSE_FRAMES;
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
    text('feature (before -> after rebase)', 88, 336);
}

function drawEdges() {
    for (const edge of edges) {
        const fromNode = getNode(edge.from);
        const toNode = getNode(edge.to);
        if (!fromNode || !toNode) {
            continue;
        }

        const isDashed = fromNode.superseded || toNode.superseded;
        stroke(edge.isFeature ? color(UI.feature[0], UI.feature[1], UI.feature[2], edge.alpha) : color(UI.main[0], UI.main[1], UI.main[2], edge.alpha));
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
    text('Rebase Replay', 22, 20);

    const statusText = rebaseDone
        ? 'Rebase complete: feature now sits on top of latest main.'
        : activeAnimation
            ? activeAnimation.message
            : 'Preparing next replay step...';
    fill(...UI.muted);
    text(statusText, 22, 42);

    fill(...UI.main);
    circle(width - 252, 28, 10);
    fill(...UI.text);
    text('main branch', width - 238, 20);

    fill(...UI.feature);
    circle(width - 252, 52, 10);
    fill(...UI.text);
    text('feature + replayed', width - 238, 44);
}

function syncStatusPanel() {
    const statusNode = document.getElementById('status-text');
    if (!statusNode) {
        return;
    }

    statusNode.textContent = rebaseDone
        ? 'Rebase complete. feature now points to the replayed tip.'
        : activeAnimation
            ? activeAnimation.message
            : 'Preparing next replay step...';
}

function paletteForLane(lane) {
    if (lane === 'main') {
        return { fill: color(125, 189, 255), stroke: color(...UI.main) };
    }
    if (lane === 'rebased') {
        return { fill: color(255, 206, 161), stroke: color(233, 137, 61) };
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
