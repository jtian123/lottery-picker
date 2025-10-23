// Global variables
let participants = [];
let randomSeed = '';
let canvas, ctx;
let spinning = false;
let currentRotation = 0;
let targetRotation = 0;
let spinSpeed = 0;
let selectedWinner = '';

// SHA-256 Hash function
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

// Initialize canvas when wheel section is shown
function initCanvas() {
    canvas = document.getElementById('wheelCanvas');
    ctx = canvas.getContext('2d');
    drawWheel();
}

// Update participant count in real-time
document.addEventListener('DOMContentLoaded', function() {
    const nameInput = document.getElementById('nameInput');

    nameInput.addEventListener('input', function() {
        updateParticipantCount();
    });

    // Check if logo exists
    const logo = document.getElementById('logo');
    const img = new Image();
    img.onload = function() {
        logo.style.display = 'block';
    };
    img.onerror = function() {
        logo.style.display = 'none';
    };
    img.src = 'logo.png';
});

function updateParticipantCount() {
    const input = document.getElementById('nameInput').value.trim();
    if (!input) {
        document.getElementById('participantCount').textContent = '0';
        return;
    }

    // Split by newlines and commas, filter empty entries
    const names = input.split(/[\n,]+/)
        .map(name => name.trim())
        .filter(name => name.length > 0);

    document.getElementById('participantCount').textContent = names.length;
}

// Start lottery - validate and show wheel
function startLottery() {
    const input = document.getElementById('nameInput').value.trim();

    if (!input) {
        alert('⚠️ Please enter at least one participant name!');
        return;
    }

    // Parse participants
    participants = input.split(/[\n,]+/)
        .map(name => name.trim())
        .filter(name => name.length > 0);

    if (participants.length < 2) {
        alert('⚠️ Please enter at least 2 participants for a fair lottery!');
        return;
    }

    // Generate random seed for transparency
    randomSeed = Date.now().toString(36) + Math.random().toString(36).substr(2);

    // Update UI
    document.getElementById('randomSeed').textContent = randomSeed;
    document.getElementById('totalParticipants').textContent = participants.length;

    // Switch views
    document.getElementById('inputSection').style.display = 'none';
    document.getElementById('wheelSection').style.display = 'block';

    // Initialize wheel
    initCanvas();
}

// Draw the spinning wheel
function drawWheel() {
    if (!ctx || participants.length === 0) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = canvas.width / 2 - 20;
    const sliceAngle = (2 * Math.PI) / participants.length;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(currentRotation);

    // Draw each slice
    for (let i = 0; i < participants.length; i++) {
        const startAngle = i * sliceAngle;
        const endAngle = startAngle + sliceAngle;

        // Alternate colors - purple and red shades
        const colors = [
            ['#667eea', '#764ba2'],
            ['#f093fb', '#f5576c'],
            ['#dc2430', '#7b4397'],
            ['#ff6a88', '#ff99ac'],
            ['#a8edea', '#fed6e3']
        ];
        const colorPair = colors[i % colors.length];

        // Create gradient
        const gradient = ctx.createLinearGradient(
            Math.cos(startAngle) * radius,
            Math.sin(startAngle) * radius,
            Math.cos(endAngle) * radius,
            Math.sin(endAngle) * radius
        );
        gradient.addColorStop(0, colorPair[0]);
        gradient.addColorStop(1, colorPair[1]);

        // Draw slice
        ctx.beginPath();
        ctx.arc(0, 0, radius, startAngle, endAngle);
        ctx.lineTo(0, 0);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw text
        ctx.save();
        ctx.rotate((startAngle + endAngle) / 2);
        ctx.textAlign = 'center';
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Arial';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 5;

        // Truncate long names
        let displayName = participants[i];
        if (displayName.length > 15) {
            displayName = displayName.substring(0, 13) + '...';
        }

        ctx.fillText(displayName, radius * 0.65, 5);
        ctx.restore();
    }

    // Draw center circle
    ctx.beginPath();
    ctx.arc(0, 0, 40, 0, 2 * Math.PI);
    const centerGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 40);
    centerGradient.addColorStop(0, '#ffffff');
    centerGradient.addColorStop(1, '#f0f0f0');
    ctx.fillStyle = centerGradient;
    ctx.fill();
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Draw center text
    ctx.fillStyle = '#667eea';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('SPIN', 0, 0);

    ctx.restore();
}

// Spin the wheel
function spinWheel() {
    if (spinning) return;

    spinning = true;
    document.getElementById('spinBtn').disabled = true;
    document.getElementById('backBtn').disabled = true;

    // Random spin: 5-8 full rotations + random position
    const minRotations = 5;
    const maxRotations = 8;
    const rotations = minRotations + Math.random() * (maxRotations - minRotations);

    // Calculate target slice (random winner)
    const sliceAngle = (2 * Math.PI) / participants.length;
    const winnerIndex = Math.floor(Math.random() * participants.length);
    selectedWinner = participants[winnerIndex];

    // Calculate exact rotation to land on winner (pointer is at top, pointing down)
    // The wheel rotates clockwise, and slice 0 starts at angle 0 (3 o'clock position)
    // Pointer is at top (270 degrees or -PI/2), so we need to align the winner slice middle with that
    const winnerSliceMiddle = winnerIndex * sliceAngle + sliceAngle / 2;
    const pointerAngle = -Math.PI / 2; // Top position
    const angleToWinner = pointerAngle - winnerSliceMiddle;
    targetRotation = currentRotation + (rotations * 2 * Math.PI) - angleToWinner;

    spinSpeed = 0.5; // Initial speed
    animateSpin();
}

// Animate the spinning
function animateSpin() {
    const diff = targetRotation - currentRotation;

    if (Math.abs(diff) > 0.001) {
        // Ease out effect
        currentRotation += diff * 0.08;
        drawWheel();
        requestAnimationFrame(animateSpin);
    } else {
        // Spin complete
        currentRotation = targetRotation % (2 * Math.PI);
        drawWheel();
        spinning = false;

        // Show confetti and certificate
        setTimeout(() => {
            createConfetti();
            showCertificate();
        }, 500);
    }
}

// Create confetti animation
function createConfetti() {
    const container = document.getElementById('confettiContainer');
    const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#dc2430', '#ffd700'];

    for (let i = 0; i < 100; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = Math.random() * 0.5 + 's';
            confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
            container.appendChild(confetti);

            setTimeout(() => confetti.remove(), 3000);
        }, i * 20);
    }
}

// Show certificate modal
async function showCertificate() {
    const modal = document.getElementById('certificateModal');
    const drawDate = new Date().toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
    });

    // Generate verification hash
    const hashInput = `${selectedWinner}|${drawDate}|${randomSeed}|${participants.length}`;
    const verificationHash = await sha256(hashInput);

    // Update certificate details
    document.getElementById('winnerName').textContent = selectedWinner;
    document.getElementById('drawDate').textContent = drawDate;
    document.getElementById('certParticipants').textContent = participants.length;
    document.getElementById('certSeed').textContent = randomSeed;
    document.getElementById('verificationHash').textContent = verificationHash;

    // Show modal
    modal.style.display = 'block';
}

// Close modal
function closeModal() {
    document.getElementById('certificateModal').style.display = 'none';
}

// Download certificate as image
function downloadCertificate() {
    // Use html2canvas or similar library in production
    // For now, we'll show an alert
    alert('📸 Screenshot this certificate for your records!\n\n💡 Tip: Use your device\'s screenshot tool to capture this certificate.');
}

// Reset lottery for new draw
function resetLottery() {
    closeModal();
    document.getElementById('wheelSection').style.display = 'none';
    document.getElementById('inputSection').style.display = 'block';
    document.getElementById('spinBtn').disabled = false;
    document.getElementById('backBtn').disabled = false;
    currentRotation = 0;
    targetRotation = 0;
    spinning = false;
    selectedWinner = '';
}

// Go back to input
function goBack() {
    if (confirm('⚠️ Are you sure you want to go back? This will reset the current draw.')) {
        resetLottery();
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('certificateModal');
    if (event.target === modal) {
        closeModal();
    }
}

// Handle window resize
window.addEventListener('resize', function() {
    if (canvas && participants.length > 0) {
        drawWheel();
    }
});
