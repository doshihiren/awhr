// Loads face-api.js (with its TensorFlow runtime) and models from the jsDelivr CDN on first use,
// so the main app bundle stays small. Runs entirely in the browser; only the 128-number face
// descriptor and a small JPEG snapshot are sent to the server.
const VERSION = '1.7.15';
const BASE = `https://cdn.jsdelivr.net/npm/@vladmandic/face-api@${VERSION}`;

let loading = null;

export function loadFaceEngine() {
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    if (window.faceapi) return resolve(window.faceapi);
    const s = document.createElement('script');
    s.src = `${BASE}/dist/face-api.js`;
    s.async = true;
    s.onload = () => (window.faceapi ? resolve(window.faceapi) : reject(new Error('Face engine failed to start')));
    s.onerror = () => reject(new Error('Could not download the face engine. Check the internet connection.'));
    document.head.appendChild(s);
  })
    .then(async fa => {
      try { await fa.tf.setBackend('webgl'); } catch { /* falls back to CPU automatically */ }
      await fa.tf.ready();
      const uri = `${BASE}/model`;
      await Promise.all([
        fa.nets.tinyFaceDetector.loadFromUri(uri),
        fa.nets.faceLandmark68Net.loadFromUri(uri),
        fa.nets.faceRecognitionNet.loadFromUri(uri),
      ]);
      return fa;
    })
    .catch(err => { loading = null; throw err; });
  return loading;
}

export async function startCamera(video) {
  if (!navigator.mediaDevices?.getUserMedia)
    throw new Error('Camera is not available. Open this page over https:// in Chrome or Safari.');
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
    audio: false,
  });
  video.srcObject = stream;
  video.setAttribute('playsinline', '');
  video.muted = true;
  await video.play();
  return stream;
}

export function stopCamera(stream) {
  stream?.getTracks().forEach(t => t.stop());
}

// Returns { count, face } where face = { descriptor:number[128], score, widthRatio } for the largest face.
export async function detectFace(fa, video) {
  if (!video.videoWidth) return { count: 0, face: null };
  const results = await fa
    .detectAllFaces(video, new fa.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptors();
  if (!results.length) return { count: 0, face: null };
  const largest = results.reduce((a, b) => (b.detection.box.width > a.detection.box.width ? b : a));
  return {
    count: results.length,
    face: {
      descriptor: Array.from(largest.descriptor),
      score: largest.detection.score,
      widthRatio: largest.detection.box.width / video.videoWidth,
    },
  };
}

export function euclidean(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; s += d * d; }
  return Math.sqrt(s);
}

export function averageDescriptor(list) {
  const out = new Array(128).fill(0);
  list.forEach(d => d.forEach((v, i) => { out[i] += v / list.length; }));
  return out;
}

// Small mirrored-free JPEG of the current frame, for the HR photo log.
export function snapshot(video, width = 320) {
  const h = Math.round((video.videoHeight / video.videoWidth) * width) || 240;
  const c = document.createElement('canvas');
  c.width = width; c.height = h;
  c.getContext('2d').drawImage(video, 0, 0, width, h);
  return c.toDataURL('image/jpeg', 0.7);
}
