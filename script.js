const videoElement = document.getElementsByClassName("input_video")[0];
const canvasElement = document.getElementById("canvas");
const canvasCtx = canvasElement.getContext("2d");

const previewCanvas = document.getElementsByClassName("output_canvas")[0];
const previewCtx = previewCanvas.getContext("2d");

let particles = [];
let handStatus = "idle";
let lastStatus = "idle";
let handPos = { x: 0, y: 0 };
let handScale = 1;

let lovePoints = [];
let imagePoints = [];
let imageLoaded = false;

// Variabel untuk skala responsif (Base Scale)
let currentTextScale = 2.0;
let currentImageScale = 1.6;

// 10.000 Partikel
const PARTICLE_COUNT = 10000;

canvasElement.width = window.innerWidth;
canvasElement.height = window.innerHeight;

previewCanvas.width = 240;
previewCanvas.height = 180;

// --- FUNGSI UPDATE SKALA (RESPONSIVE) ---
function updateResponsiveScales() {
  const width = window.innerWidth;

  if (width < 600) {
    // Mode HP: Base scale lebih kecil
    currentTextScale = 1.2;
    currentImageScale = 1.0;
  } else {
    // Mode Laptop/PC: Base scale normal
    currentTextScale = 2.0;
    currentImageScale = 1.6;
  }
}
updateResponsiveScales();

// --- TULISAN I LOVE U ---
function generateLovePoints() {
  lovePoints = [];
  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");

  // Ukuran font dinamis
  const fontSize = Math.min(100, window.innerWidth * 0.15);
  const canvasWidth = fontSize * 8;

  tempCanvas.width = canvasWidth;
  tempCanvas.height = fontSize * 2.5;

  tempCtx.fillStyle = "#FFFFFF";
  tempCtx.font = `bold ${fontSize}px Arial`;
  tempCtx.textAlign = "center";
  tempCtx.textBaseline = "middle";

  tempCtx.fillText("I LOVE U", tempCanvas.width / 2, tempCanvas.height / 2);

  const imageData = tempCtx.getImageData(
    0,
    0,
    tempCanvas.width,
    tempCanvas.height
  );
  const data = imageData.data;

  const step = window.innerWidth < 600 ? 2 : 3;

  for (let y = 0; y < tempCanvas.height; y += step) {
    for (let x = 0; x < tempCanvas.width; x += step) {
      const alpha = data[(y * tempCanvas.width + x) * 4 + 3];
      if (alpha > 128) {
        lovePoints.push({
          x: x - tempCanvas.width / 2,
          y: y - tempCanvas.height / 2,
        });
      }
    }
  }
}

// --- PROSES GAMBAR PNG ---
const targetImage = new Image();
targetImage.src = "img.png";

targetImage.onload = function () {
  generateImagePoints();
  imageLoaded = true;
  console.log("Gambar HD Loaded.");
};

targetImage.onerror = function () {
  console.error("Gagal memuat img.png.");
};

function generateImagePoints() {
  if (!targetImage.src) return;
  imagePoints = [];
  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");

  const targetWidth = Math.min(300, window.innerWidth * 0.35);
  const scaleFactor = targetWidth / targetImage.width;
  const targetHeight = targetImage.height * scaleFactor;

  tempCanvas.width = targetWidth;
  tempCanvas.height = targetHeight;

  tempCtx.drawImage(targetImage, 0, 0, targetWidth, targetHeight);

  const imageData = tempCtx.getImageData(0, 0, targetWidth, targetHeight);
  const data = imageData.data;

  const step = window.innerWidth < 600 ? 2 : 3;

  for (let y = 0; y < targetHeight; y += step) {
    for (let x = 0; x < targetWidth; x += step) {
      const index = (y * targetWidth + x) * 4;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const a = data[index + 3];

      if (a > 128) {
        imagePoints.push({
          x: x - targetWidth / 2,
          y: y - targetHeight / 2,
          color: `rgba(${r},${g},${b},${a / 255})`,
        });
      }
    }
  }
}

generateLovePoints();

class Particle {
  constructor(index) {
    this.index = index;
    this.orbitAngle = Math.random() * Math.PI * 2;
    this.orbitRadius = Math.random();
    this.imageColor = "#ffffff";
    this.init();
  }

  init() {
    this.x = Math.random() * canvasElement.width;
    this.y = Math.random() * canvasElement.height;
    this.size = Math.random() * 2 + 0.5;
    this.vx = (Math.random() - 0.5) * 10;
    this.vy = (Math.random() - 0.5) * 10;

    this.isRing = this.index % 10 < 6;

    if (this.isRing) {
      this.color = `hsl(${30 + Math.random() * 20}, 50%, ${
        50 + Math.random() * 30
      }%)`;
    } else {
      this.color = `hsl(40, 30%, ${70 + Math.random() * 20}%)`;
    }
  }

  explode() {
    const force = 40;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * force + 10;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  update() {
    let targetX, targetY;

    const yOffset = window.innerWidth < 600 ? 100 : 150;

    // [BARU] Hitung Zoom Factor dari handScale (untuk semua mode)
    // Batasi zoom minimal 0.5x dan maksimal 3.0x agar tidak hilang/pecah
    const zoomFactor = Math.max(0.5, Math.min(handScale, 3.0));

    if (handStatus === "pointing" && imageLoaded && imagePoints.length > 0) {
      // --- MODE GAMBAR ---
      const point = imagePoints[this.index % imagePoints.length];
      this.imageColor = point.color;

      // [BARU] Kalikan Base Scale dengan Zoom Factor
      const finalScale = currentImageScale * zoomFactor;

      targetX = handPos.x + point.x * finalScale;
      targetY = handPos.y + point.y * finalScale + yOffset;

      this.x += (targetX - this.x) * 0.35;
      this.y += (targetY - this.y) * 0.35;
    } else if (handStatus === "peace") {
      // --- MODE I LOVE U ---
      if (lovePoints.length > 0) {
        const point = lovePoints[this.index % lovePoints.length];

        // [BARU] Kalikan Base Scale dengan Zoom Factor
        const finalScale = currentTextScale * zoomFactor;

        targetX = handPos.x + point.x * finalScale;
        targetY = handPos.y + point.y * finalScale + yOffset;

        this.x += (targetX - this.x) * 0.3;
        this.y += (targetY - this.y) * 0.3;
      }
    } else if (handStatus === "fist") {
      // --- MODE PLANET ---
      // (Planet sudah pakai zoomFactor sendiri di logika sebelumnya)
      let scale = Math.max(0.6, Math.min(handScale, 2.5));
      if (window.innerWidth < 600) scale *= 0.6;

      if (this.isRing) {
        let timeAngle = Date.now() * 0.001;
        let currentAngle = this.orbitAngle + timeAngle;
        let ringWidth = (300 + this.orbitRadius * 250) * scale;
        let radiusX = ringWidth;
        let radiusY = ringWidth * 0.3;
        let tiltAngle = 0.5;
        let rawX = Math.cos(currentAngle) * radiusX;
        let rawY = Math.sin(currentAngle) * radiusY;
        targetX =
          handPos.x + (rawX * Math.cos(tiltAngle) - rawY * Math.sin(tiltAngle));
        targetY =
          handPos.y + (rawX * Math.sin(tiltAngle) + rawY * Math.cos(tiltAngle));
      } else {
        let phi = this.orbitAngle;
        let theta = this.orbitRadius * Math.PI;
        let r = 200 * scale;
        targetX = handPos.x + r * Math.sin(theta) * Math.cos(phi);
        targetY = handPos.y + r * Math.cos(theta);
      }
      this.x += (targetX - this.x) * 0.3;
      this.y += (targetY - this.y) * 0.3;
    } else {
      // --- IDLE ---
      this.x += this.vx;
      this.y += this.vy;
      this.vx *= 0.96;
      this.vy *= 0.96;
      if (this.x < 0 || this.x > canvasElement.width) this.vx *= -1;
      if (this.y < 0 || this.y > canvasElement.height) this.vy *= -1;
    }
  }

  draw() {
    let finalColor;
    let finalSize = this.size;

    if (handStatus === "pointing") {
      finalColor = this.imageColor;
      finalSize = 1.5;
    } else if (handStatus === "peace") {
      finalColor = "#FFFFFF";
      finalSize = 1.5;
    } else {
      finalColor = this.color;
    }

    const shadowOffset = window.innerWidth < 600 ? 3 : 5;

    if (handStatus === "peace") {
      canvasCtx.fillStyle = "rgba(180, 0, 50, 0.8)";
      canvasCtx.beginPath();
      canvasCtx.arc(
        this.x + shadowOffset,
        this.y + shadowOffset,
        finalSize,
        0,
        Math.PI * 2
      );
      canvasCtx.fill();
    } else if (handStatus === "pointing") {
      canvasCtx.fillStyle = "rgba(50, 50, 50, 0.8)";
      canvasCtx.beginPath();
      canvasCtx.arc(
        this.x + shadowOffset,
        this.y + shadowOffset,
        finalSize,
        0,
        Math.PI * 2
      );
      canvasCtx.fill();
    }

    canvasCtx.fillStyle = finalColor;
    canvasCtx.beginPath();
    canvasCtx.arc(this.x, this.y, finalSize, 0, Math.PI * 2);
    canvasCtx.fill();
  }
}

for (let i = 0; i < PARTICLE_COUNT; i++) {
  particles.push(new Particle(i));
}

function onResults(results) {
  canvasCtx.fillStyle = "rgba(0, 0, 0, 0.5)";
  canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);
  previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const landmarks = results.multiHandLandmarks[0];

    const isFist =
      landmarks[8].y > landmarks[5].y &&
      landmarks[12].y > landmarks[9].y &&
      landmarks[16].y > landmarks[13].y &&
      landmarks[20].y > landmarks[17].y;

    const isPeace =
      landmarks[8].y < landmarks[6].y &&
      landmarks[12].y < landmarks[10].y &&
      landmarks[16].y > landmarks[14].y &&
      landmarks[20].y > landmarks[18].y;

    const isPointing =
      landmarks[8].y < landmarks[6].y &&
      landmarks[12].y > landmarks[10].y &&
      landmarks[16].y > landmarks[14].y &&
      landmarks[20].y > landmarks[18].y;

    let currentStatus = isPointing
      ? "pointing"
      : isPeace
      ? "peace"
      : isFist
      ? "fist"
      : "idle";

    if (currentStatus === "pointing" || currentStatus === "peace") {
      canvasCtx.globalCompositeOperation = "source-over";
    } else {
      canvasCtx.globalCompositeOperation = "lighter";
    }

    drawConnectors(previewCtx, landmarks, HAND_CONNECTIONS, {
      color: "#00ffcc",
      lineWidth: 2,
    });
    drawLandmarks(previewCtx, landmarks, {
      color: "#ffffff",
      fillColor: "#00ffcc",
      radius: 2,
    });

    if (currentStatus === "pointing") {
      handPos.x = (1 - landmarks[8].x) * canvasElement.width;
      handPos.y = landmarks[8].y * canvasElement.height;
    } else {
      handPos.x = (1 - landmarks[9].x) * canvasElement.width;
      handPos.y = landmarks[9].y * canvasElement.height;
    }

    // --- LOGIKA ZOOM ---
    let dx = landmarks[0].x - landmarks[9].x;
    let dy = landmarks[0].y - landmarks[9].y;
    let dist = Math.sqrt(dx * dx + dy * dy);
    let targetScale = dist * 4;
    // Nilai handScale ini sekarang dipakai untuk SEMUA mode (Planet, Gambar, Teks)
    handScale += (targetScale - handScale) * 0.1;

    if (lastStatus !== currentStatus && currentStatus !== "idle") {
      particles.forEach((p) => p.explode());
    }

    handStatus = currentStatus;
    lastStatus = currentStatus;
  } else {
    if (lastStatus !== "idle") particles.forEach((p) => p.explode());
    handStatus = "idle";
    lastStatus = "idle";
    handScale += (1 - handScale) * 0.05;
    canvasCtx.globalCompositeOperation = "lighter";
  }

  for (let i = 0; i < particles.length; i++) {
    particles[i].update();
    particles[i].draw();
  }
  canvasCtx.globalCompositeOperation = "source-over";
}

const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
});
hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.8,
  minTrackingConfidence: 0.8,
});
hands.onResults(onResults);

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await hands.send({ image: videoElement });
  },
  width: 1280,
  height: 720,
});
camera.start();

window.addEventListener("resize", () => {
  canvasElement.width = window.innerWidth;
  canvasElement.height = window.innerHeight;
  updateResponsiveScales();
  generateLovePoints();
  if (imageLoaded) generateImagePoints();
});
