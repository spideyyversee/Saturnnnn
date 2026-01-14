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

// Variabel untuk skala responsif
let currentTextScale = 2.0;
let currentImageScale = 1.6;

// 10.000 Partikel
const PARTICLE_COUNT = 10000;

canvasElement.width = window.innerWidth;
canvasElement.height = window.innerHeight;

previewCanvas.width = 240;
previewCanvas.height = 180;

function updateResponsiveScales() {
  const width = window.innerWidth;
  if (width < 600) {
    currentTextScale = 1.2;
    currentImageScale = 1.0;
  } else {
    currentTextScale = 2.0;
    currentImageScale = 1.6;
  }
}
updateResponsiveScales();

function generateLovePoints() {
  lovePoints = [];
  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");

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

// --- PROSES GAMBAR (DIPERBAIKI) ---
const targetImage = new Image();
// [PENTING] Tambahkan ini agar tidak diblokir browser HP
targetImage.crossOrigin = "Anonymous";
targetImage.src = "img.png";

targetImage.onload = function () {
  // Tunggu sebentar untuk memastikan memori siap
  setTimeout(() => {
    generateImagePoints();
  }, 100);
};

targetImage.onerror = function () {
  console.error("Gagal memuat img.png. Pastikan nama file benar.");
  alert("Gagal memuat gambar img.png");
};

function generateImagePoints() {
  try {
    if (!targetImage.src) return;
    imagePoints = [];
    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");

    // Batasi ukuran canvas sementara agar ringan di HP
    const maxProcessWidth = window.innerWidth < 600 ? 150 : 300;

    const scaleFactor = maxProcessWidth / targetImage.width;
    const targetHeight = targetImage.height * scaleFactor;

    tempCanvas.width = maxProcessWidth;
    tempCanvas.height = targetHeight;

    tempCtx.drawImage(targetImage, 0, 0, maxProcessWidth, targetHeight);

    const imageData = tempCtx.getImageData(0, 0, maxProcessWidth, targetHeight);
    const data = imageData.data;

    // Di HP gunakan step lebih besar (3) agar titik tidak terlalu padat/berat
    const step = window.innerWidth < 600 ? 3 : 3;

    for (let y = 0; y < targetHeight; y += step) {
      for (let x = 0; x < maxProcessWidth; x += step) {
        const index = (y * maxProcessWidth + x) * 4;
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        const a = data[index + 3];

        if (a > 128) {
          imagePoints.push({
            x: x - maxProcessWidth / 2,
            y: y - targetHeight / 2,
            color: `rgba(${r},${g},${b},${a / 255})`,
          });
        }
      }
    }
    imageLoaded = true;
    console.log("Gambar berhasil diproses. Total titik:", imagePoints.length);
  } catch (e) {
    console.error("Error memproses gambar:", e);
    // Jika error (biasanya SecurityError), alert user
    // alert("Gagal memproses pixel gambar. Coba gunakan Local Server.");
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
    const zoomFactor = Math.max(0.5, Math.min(handScale, 3.0));

    // [FIX] Cek imageLoaded DAN imagePoints.length
    if (handStatus === "pointing" && imageLoaded && imagePoints.length > 0) {
      const point = imagePoints[this.index % imagePoints.length];
      this.imageColor = point.color;
      const finalScale = currentImageScale * zoomFactor;
      targetX = handPos.x + point.x * finalScale;
      targetY = handPos.y + point.y * finalScale + yOffset;
      this.x += (targetX - this.x) * 0.35;
      this.y += (targetY - this.y) * 0.35;
    } else if (handStatus === "peace") {
      if (lovePoints.length > 0) {
        const point = lovePoints[this.index % lovePoints.length];
        const finalScale = currentTextScale * zoomFactor;
        targetX = handPos.x + point.x * finalScale;
        targetY = handPos.y + point.y * finalScale + yOffset;
        this.x += (targetX - this.x) * 0.3;
        this.y += (targetY - this.y) * 0.3;
      }
    } else if (handStatus === "fist") {
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

    // [FIX] Jika Pointing TAPI gambar belum load/gagal, jangan pakai warna putih (imageColor default)
    // Pakai warna planet saja supaya tidak terlihat glitch putih
    if (handStatus === "pointing" && imageLoaded && imagePoints.length > 0) {
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
    } else if (
      handStatus === "pointing" &&
      imageLoaded &&
      imagePoints.length > 0
    ) {
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

    // Hanya matikan lighter jika gambar BENAR-BENAR ada
    if (
      (currentStatus === "pointing" && imageLoaded && imagePoints.length > 0) ||
      currentStatus === "peace"
    ) {
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

    let dx = landmarks[0].x - landmarks[9].x;
    let dy = landmarks[0].y - landmarks[9].y;
    let dist = Math.sqrt(dx * dx + dy * dy);
    let targetScale = dist * 4;
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
