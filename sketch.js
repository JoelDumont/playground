// Bitcoin Traffic Control Center Simulation
// Transactions as particles, blocks as containers, fees determine speed

let transactions = [];
let blocks = [];
let nextBlockY = 100;

function setup() {
    let canvas = createCanvas(800, 600);
    canvas.parent('canvas-container');
    
    // Create initial blocks (containers)
    for (let i = 0; i < 5; i++) {
        blocks.push({
            x: 50 + i * 150,
            y: nextBlockY,
            width: 100,
            height: 50,
            capacity: 10,
            transactions: []
        });
    }
    
    // Spawn initial transactions
    for (let i = 0; i < 20; i++) {
        spawnTransaction();
    }
}

function draw() {
    background(220);
    
    // Draw blocks
    fill(100, 150, 255);
    stroke(0);
    strokeWeight(2);
    for (let block of blocks) {
        rect(block.x, block.y, block.width, block.height);
        fill(0);
        noStroke();
        text(`Block ${blocks.indexOf(block) + 1}`, block.x + 10, block.y + 30);
        fill(100, 150, 255);
        stroke(0);
    }
    
    // Update and draw transactions
    for (let i = transactions.length - 1; i >= 0; i--) {
        let tx = transactions[i];
        
        // Move towards next block
        let targetBlock = blocks[tx.targetBlock];
        if (targetBlock) {
            let dx = targetBlock.x + targetBlock.width / 2 - tx.x;
            let dy = targetBlock.y - tx.y;
            let distance = sqrt(dx * dx + dy * dy);
            
            if (distance > 5) {
                // Speed based on fee (higher fee = faster)
                let speed = map(tx.fee, 1, 100, 0.5, 3);
                tx.x += (dx / distance) * speed;
                tx.y += (dy / distance) * speed;
            } else {
                // Transaction reaches block
                targetBlock.transactions.push(tx);
                transactions.splice(i, 1);
                
                // Spawn new transaction
                spawnTransaction();
            }
        }
        
        // Draw transaction
        fill(255, tx.fee * 2.5, 0); // Color based on fee
        noStroke();
        ellipse(tx.x, tx.y, 10);
    }
    
    // Display info
    fill(0);
    text(`Active Transactions: ${transactions.length}`, 10, 20);
    text(`Total Blocks: ${blocks.length}`, 10, 40);
}

function spawnTransaction() {
    let fee = random(1, 100);
    let targetBlock = floor(random(blocks.length));
    transactions.push({
        x: random(width),
        y: height - 20,
        fee: fee,
        targetBlock: targetBlock
    });
}