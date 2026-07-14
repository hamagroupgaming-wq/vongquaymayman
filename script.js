const GOOGLE_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbwXJuqd0Tc1s1crK549UvQDwjC6X0ZNzHoy78AU_oOmp_uUEk068c0gcgC3uUvFaKoO/exec";

const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");

const spinButton = document.getElementById("spinButton");
const message = document.getElementById("message");

const fullNameInput = document.getElementById("fullName");
const phoneInput = document.getElementById("phone");
const emailInput = document.getElementById("email");

// Tổng tỷ lệ nên bằng 100.
const prizes = [
    {
        name: "5 điểm",
        rate: 12,
        color: "#FF6B6B"
    },
    {
        name: "8 điểm",
        rate: 10,
        color: "#4ECDC4"
    },
    {
        name: "1 ngày",
        rate: 5,
        color: "#45B7D1"
    },
    {
        name: "1 điểm",
        rate: 30,
        color: "#96CEB4"
    },
    {
        name: "15 điểm",
        rate: 3,
        color: "#9B5DE5"
    },
    {
        name: "Giảm 5%",
        rate: 10,
        color: "#F9C74F"
    },
    {
        name: "Chúc may mắn lần sau",
        rate: 10,
        color: "#F3722C"
    },
    {
        name: "3 điểm",
        rate: 20,
        color: "#577590"
    }
];

const centerX = canvas.width / 2;
const centerY = canvas.height / 2;
const radius = 240;

const totalPrizes = prizes.length;
const fullCircle = Math.PI * 2;
const arc = fullCircle / totalPrizes;

let rotation = 0;
let isSpinning = false;

function drawWheel() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    prizes.forEach((prize, index) => {
        const startAngle = index * arc + rotation;
        const endAngle = startAngle + arc;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(
            centerX,
            centerY,
            radius,
            startAngle,
            endAngle
        );
        ctx.closePath();

        ctx.fillStyle = prize.color;
        ctx.fill();

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.save();

        ctx.translate(centerX, centerY);
        ctx.rotate(startAngle + arc / 2);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 20px Arial";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";

        ctx.fillText(
            prize.name,
            radius - 30,
            0
        );

        ctx.restore();
    });
}

function validateForm() {
    const fullName = fullNameInput.value.trim();
    const phone = phoneInput.value
        .trim()
        .replace(/\s/g, "");

    const email = emailInput.value.trim();

    if (!fullName || !phone || !email) {
        message.textContent =
            "Vui lòng nhập đầy đủ thông tin.";
        return false;
    }

    const phoneRegex = /^(0\d{9}|\+84\d{9})$/;

    if (!phoneRegex.test(phone)) {
        message.textContent =
            "Số điện thoại không hợp lệ.";
        return false;
    }

    const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
        message.textContent =
            "Gmail không hợp lệ.";
        return false;
    }

    return true;
}

function selectPrizeByRate() {
    const totalRate = prizes.reduce(
        (sum, prize) => sum + prize.rate,
        0
    );

    let randomValue = Math.random() * totalRate;

    for (let index = 0; index < prizes.length; index++) {
        randomValue -= prizes[index].rate;

        if (randomValue < 0) {
            return index;
        }
    }

    return prizes.length - 1;
}

function calculateTargetRotation(prizeIndex) {
    // Kim chỉ ở phía trên vòng quay.
    const pointerAngle = -Math.PI / 2;

    const prizeCenter =
        prizeIndex * arc + arc / 2;

    const normalizedRotation =
        ((rotation % fullCircle) + fullCircle) %
        fullCircle;

    let desiredRotation =
        pointerAngle - prizeCenter;

    desiredRotation =
        ((desiredRotation % fullCircle) + fullCircle) %
        fullCircle;

    let difference =
        desiredRotation - normalizedRotation;

    if (difference < 0) {
        difference += fullCircle;
    }

    const extraRounds =
        6 + Math.floor(Math.random() * 3);

    return (
        rotation +
        extraRounds * fullCircle +
        difference
    );
}

function easeOutCubic(progress) {
    return 1 - Math.pow(1 - progress, 3);
}

async function sendResultToGoogleSheet(data) {
    const formData = new URLSearchParams();

    formData.append("fullName", data.fullName);
    formData.append("phone", data.phone);
    formData.append("email", data.email);
    formData.append("result", data.result);

    await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: {
            "Content-Type":
                "application/x-www-form-urlencoded;charset=UTF-8"
        },
        body: formData.toString()
    });
}

spinButton.addEventListener("click", () => {
    if (isSpinning) {
        return;
    }

    if (!validateForm()) {
        return;
    }

    const fullName = fullNameInput.value.trim();
    const phone = phoneInput.value
        .trim()
        .replace(/\s/g, "");

    const email = emailInput.value.trim();

    const selectedPrizeIndex = selectPrizeByRate();
    const selectedPrize =
        prizes[selectedPrizeIndex];

    const startRotation = rotation;
    const targetRotation =
        calculateTargetRotation(selectedPrizeIndex);

    const duration = 5000;
    const startTime = performance.now();

    isSpinning = true;
    spinButton.disabled = true;
    message.textContent = "Đang quay...";

    function animate(currentTime) {
        const elapsed = currentTime - startTime;

        const progress = Math.min(
            elapsed / duration,
            1
        );

        const easedProgress =
            easeOutCubic(progress);

        rotation =
            startRotation +
            (targetRotation - startRotation) *
                easedProgress;

        drawWheel();

        if (progress < 1) {
            requestAnimationFrame(animate);
            return;
        }

        rotation =
            ((targetRotation % fullCircle) +
                fullCircle) %
            fullCircle;

        drawWheel();

        message.textContent =
            "Đang gửi kết quả...";

        const resultData = {
            fullName: fullName,
            phone: phone,
            email: email,
            result: selectedPrize.name
        };

        sendResultToGoogleSheet(resultData)
            .then(() => {
                message.textContent =
                    "Kết quả: " +
                    selectedPrize.name;

                fullNameInput.disabled = true;
                phoneInput.disabled = true;
                emailInput.disabled = true;

                spinButton.disabled = true;
                spinButton.textContent = "ĐÃ QUAY";
            })
            .catch((error) => {
                console.error(
                    "Lỗi gửi Google Sheets:",
                    error
                );

                message.textContent =
                    "Không gửi được dữ liệu. Hãy thử lại.";

                spinButton.disabled = false;
            })
            .finally(() => {
                isSpinning = false;
            });
    }

    requestAnimationFrame(animate);
});

drawWheel();