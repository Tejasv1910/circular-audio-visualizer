/***********************
 GLOBAL VARIABLES
************************/

let audioContext;
let analyser;
let microphone;
let stream;
let isMicOn = false;

let angles = [];          // Pre-calculated angles for performance
let smoothData = [];      // For smooth animation

// FPS counter (debug)
let lastTime = performance.now();
let frameCount = 0;


/***********************
 PAGE LOAD
************************/

window.onload = function () {

  // Get UI elements
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const button = document.getElementById("toggleBtn");
  const statusText = document.getElementById("status");

  // Full screen canvas
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  /***********************
   BUTTON CLICK HANDLER
  ************************/

  button.addEventListener("click", function () {

    if (!isMicOn) {
      startMicrophone();
      button.innerText = "Stop Microphone";
      statusText.innerText = "● Recording";
      statusText.style.color = "red";
      statusText.classList.add("recording");
    } else {
      stopMicrophone();
      button.innerText = "Start Microphone";
      statusText.innerText = "Mic Off";
      statusText.style.color = "gray";
      statusText.classList.remove("recording");
    }

    isMicOn = !isMicOn;
  });


  /***********************
   START MICROPHONE
  ************************/

  function startMicrophone() {

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(function (micStream) {

        stream = micStream;

        audioContext = new AudioContext();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);

        microphone.connect(analyser);

        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        // Reset smoothing on restart
        smoothData = [];

        // Pre-calculate angles (performance optimization)
        angles = [];
        for (let i = 0; i < bufferLength; i++) {
          angles.push((i / bufferLength) * Math.PI * 2);
        }

        drawBars(analyser, dataArray, bufferLength, ctx, canvas);
      })
      .catch(function () {
        alert("Microphone access denied");
      });
  }


  /***********************
   STOP MICROPHONE
  ************************/

  function stopMicrophone() {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    if (audioContext) {
      audioContext.close();
    }
  }
};


/***********************
 DRAW VISUALIZER
************************/

function drawBars(analyser, dataArray, bufferLength, ctx, canvas) {

  // Stop animation if mic is OFF
  if (!isMicOn) return;

  requestAnimationFrame(function () {
    drawBars(analyser, dataArray, bufferLength, ctx, canvas);
  });

  analyser.getByteFrequencyData(dataArray);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const baseRadius = Math.min(canvas.width, canvas.height) / 4;

  ctx.lineWidth = 2;
  ctx.shadowBlur = 8;

  let sum = 0;

  // Draw circular bars
  for (let i = 0; i < bufferLength; i++) {

    if (!smoothData[i]) smoothData[i] = 0;
    smoothData[i] += (dataArray[i] - smoothData[i]) * 0.3;

    const barHeight = Math.min(smoothData[i], baseRadius);
    const angle = angles[i];

    ctx.strokeStyle = `hsl(${(i / bufferLength) * 360}, 100%, 60%)`;
    ctx.shadowColor = ctx.strokeStyle;

    const x1 = centerX + Math.cos(angle) * baseRadius;
    const y1 = centerY + Math.sin(angle) * baseRadius;

    const x2 = centerX + Math.cos(angle) * (baseRadius + barHeight);
    const y2 = centerY + Math.sin(angle) * (baseRadius + barHeight);

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    sum += dataArray[i];
  }

  // Draw pulsing center circle
  const avg = sum / bufferLength;

  ctx.beginPath();
  ctx.arc(centerX, centerY, baseRadius / 2 + avg / 10, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
  ctx.fill();

  // FPS counter (console)
  frameCount++;
  const now = performance.now();
  if (now - lastTime >= 1000) {
    console.log("FPS:", frameCount);
    frameCount = 0;
    lastTime = now;
  }
}



