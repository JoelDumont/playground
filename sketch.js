// Git Rebase Visualizer
// Animates feature commits being replayed onto the latest main commit.

const COMMIT_RADIUS = 26;
const REBASE_STEP_FRAMES = 80;
const REBASE_PAUSE_FRAMES = 30;

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
    const canvas = createCanvas(980, 640);
    canvas.parent('canvas-container');
    textFont('monospace');
    initScene();
}

function draw() {
    background(244, 247, 252);
    drawBackdrop();
    updateRebaseAnimation();
    drawEdges();
    drawCommitNodes();
    drawBranchPointers();
    drawLegendAndStatus();
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

    const mainY = 220;
    const featureY = 420;

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

    pointers.push({ label: 'main', targetId: m4.id, color: color(58, 98, 177), yOffset: -66 });
    pointers.push({ label: 'feature', targetId: f3.id, color: color(194, 78, 51), yOffset: 66 });

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
    noStroke();
    fill(223, 233, 248, 140);
    rect(70, 140, width - 140, 160, 16);

    fill(250, 230, 220, 120);
    rect(70, 340, width - 140, 180, 16);

    fill(40, 56, 76);
    textSize(14);
    textAlign(LEFT, CENTER);
    text('main branch timeline', 88, 156);
    text('feature branch before/after rebase', 88, 356);
}

function drawEdges() {
    for (const edge of edges) {
        const fromNode = getNode(edge.from);
        const toNode = getNode(edge.to);
        if (!fromNode || !toNode) {
            continue;
        }

        const isDashed = fromNode.superseded || toNode.superseded;
        if (edge.isFeature) {
            stroke(186, 88, 62, edge.alpha);
        } else {
            stroke(66, 110, 186, edge.alpha);
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
    textSize(12);

    for (const node of commitNodes) {
        const palette = paletteForLane(node.lane);
        fill(red(palette.fill), green(palette.fill), blue(palette.fill), node.alpha);
        stroke(red(palette.stroke), green(palette.stroke), blue(palette.stroke), node.alpha);
        strokeWeight(2);
        circle(node.x, node.y, COMMIT_RADIUS * 2);

        noStroke();
        fill(16, 22, 29, node.alpha);
        text(node.hash.slice(0, 6), node.x, node.y);
    }
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
        rect(target.x, pointerY, 86, 28, 8);
        fill(255);
        text(pointer.label, target.x, pointerY + 1);
        rectMode(CORNER);
    }
}

function drawLegendAndStatus() {
    noStroke();
    fill(27, 37, 49);
    textAlign(LEFT, TOP);
    textSize(14);
    text('Command: git checkout feature ; git rebase main', 22, 18);

    const statusText = rebaseDone
        ? 'Rebase complete: feature now sits on top of latest main.'
        : activeAnimation
            ? activeAnimation.message
            : 'Preparing next replay step...';
    text(statusText, 22, 42);
    text('Press R to restart', 22, 66);

    fill(58, 98, 177);
    circle(width - 270, 28, 12);
    fill(27, 37, 49);
    text('main commits', width - 255, 20);

    fill(194, 78, 51);
    circle(width - 270, 52, 12);
    fill(27, 37, 49);
    text('feature/replayed commits', width - 255, 44);
}

function paletteForLane(lane) {
    if (lane === 'main') {
        return { fill: color(148, 187, 255), stroke: color(58, 98, 177) };
    }
    if (lane === 'rebased') {
        return { fill: color(255, 216, 193), stroke: color(214, 105, 72) };
    }
    return { fill: color(255, 188, 165), stroke: color(194, 78, 51) };
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
