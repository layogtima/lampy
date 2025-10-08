// ====================================
// LAMPY WINAMP MODE - AUDIO ENGINE
// ====================================
// The JavaScript that makes Philips Hue cry
// Built with rage, love, and FFT analysis

const { createApp } = Vue;

// ===== CURATED COLOR PALETTE =====
const CURATED_COLORS = [
  { name: "Pure Red", value: "#ff0000" },
  { name: "Crimson", value: "#dc143c" },
  { name: "Blood Orange", value: "#cc4400" },
  { name: "Lava", value: "#ff4500" },
  { name: "Tangerine", value: "#ff8800" },
  { name: "Amber", value: "#ffaa00" },
  { name: "Gold", value: "#ffd700" },
  { name: "Chartreuse", value: "#aaff00" },
  { name: "Lime", value: "#00ff00" },
  { name: "Spring Green", value: "#00ff7f" },
  { name: "Aqua", value: "#00ffff" },
  { name: "Turquoise", value: "#00cccc" },
  { name: "Ocean", value: "#0088aa" },
  { name: "Sky Blue", value: "#0080ff" },
  { name: "Royal Blue", value: "#0044ff" },
  { name: "Navy", value: "#0000aa" },
  { name: "Violet", value: "#6600ff" },
  { name: "Purple", value: "#8800ff" },
  { name: "Magenta", value: "#ff00ff" },
  { name: "Hot Pink", value: "#ff0088" },
  { name: "Deep Pink", value: "#ff1493" },
  { name: "Brown", value: "#884400" },
  { name: "Warm White", value: "#ffe4b5" },
  { name: "Cool White", value: "#e0f0ff" },
];

// ===== PATTERN DEFINITIONS =====
const PATTERN_DEFINITIONS = {
  0: {
    name: "Cozy Fire",
    icon: "fas fa-fire",
    colors: ["#cc4400", "#ff4500", "#ffaa00"],
    originalColors: ["#cc4400", "#ff4500", "#ffaa00"],
  },
  1: {
    name: "Shooting Stars",
    icon: "fas fa-meteor",
    colors: ["#8800ff"],
    originalColors: ["#8800ff"],
  },
  2: {
    name: "Rainbow Magic",
    icon: "fas fa-rainbow",
    colors: ["#ff0000", "#00ff00", "#0044ff"],
    originalColors: ["#ff0000", "#00ff00", "#0044ff"],
  },
  3: {
    name: "Gentle Fireflies",
    icon: "fas fa-sparkles",
    colors: ["#ffd700"],
    originalColors: ["#ffd700"],
  },
  4: {
    name: "Field of Asters",
    icon: "fas fa-seedling",
    colors: ["#6600ff", "#8800ff", "#ffd700"],
    originalColors: ["#6600ff", "#8800ff", "#ffd700"],
  },
  5: {
    name: "Ocean Waves",
    icon: "fas fa-water",
    colors: ["#0044ff", "#0088aa", "#00ffff"],
    originalColors: ["#0044ff", "#0088aa", "#00ffff"],
  },
  6: {
    name: "Radioactive Kelp",
    icon: "fas fa-leaf",
    colors: ["#00ff00", "#00ff7f", "#aaff00"],
    originalColors: ["#00ff00", "#00ff7f", "#aaff00"],
  },
  7: {
    name: "Mandarin Grove",
    icon: "fas fa-tree",
    colors: ["#ff4500", "#ff8800", "#00ff7f"],
    originalColors: ["#ff4500", "#ff8800", "#00ff7f"],
  },
};

// ===== MUSIC VISUALIZATION MODES =====
const MUSIC_MODES = [
  { id: 0, name: "Freq Bars", icon: "fas fa-sliders-h", description: "Classic spectrum analyzer" },
  { id: 1, name: "Bass Cannon", icon: "fas fa-bomb", description: "Explosive bass pulses" },
  { id: 2, name: "Melody Flow", icon: "fas fa-wave-square", description: "Pitch-tracking waves" },
  { id: 3, name: "Energy Storm", icon: "fas fa-bolt", description: "Raw power visualization" },
  { id: 4, name: "Strobe Party", icon: "fas fa-stroopwafel", description: "Transient chaos" },
  { id: 5, name: "Ambient Breath", icon: "fas fa-wind", description: "Chill vibes" },
];

// ===== VUE APP =====
createApp({
  data() {
    return {
      // Theme
      isDark:
        localStorage.theme === "dark" ||
        (!("theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches),

      // UI State
      showSettings: false,
      showWifiCredentials: false,
      showPassword: false,
      drawerCollapsed: true,
      connectionStatus: "connecting",
      colorPickerOpen: false,
      colorPickerPosition: {},
      selectedColorSlot: 0,

      // Patterns
      patterns: [],
      currentPattern: null,
      brightness: 75,
      speed: 5,
      time: 0,
      curatedColors: CURATED_COLORS,

      // WiFi
      wifiStatus: { ssid: "Loading...", password: "" },
      deviceInfo: { hardware: "ESP32-C3", ledCount: "72" },

      // MUSIC MODE 🎵
      musicMode: false,
      musicModes: MUSIC_MODES,
      currentMusicMode: null,
      musicSensitivity: 5,
      spectrumBars: Array(8).fill(0),

      // Audio Engine
      audioContext: null,
      analyser: null,
      microphone: null,
      dataArray: null,
      bufferLength: 0,
      frequencyData: new Uint8Array(2048),
      
      // Music Visualization State
      musicLEDColors: Array(72).fill({ color: "#000000", intensity: 0 }),
      bassHistory: [],
      lastBassHit: 0,
      hueRotation: 0,
      energySmoothed: 0,
      transientThreshold: 0,
      ambientBreathPhase: 0,

      // Timers
      liveUpdateTimeout: null,
      animationId: null,
      connectionInterval: null,
      audioUpdateInterval: null,
      cachedLEDPositions: [],
      cachedLEDPositionsMobile: [],
    };
  },

  mounted() {
    this.patterns = Object.entries(PATTERN_DEFINITIONS).map(([id, pattern]) => ({
      id: parseInt(id),
      ...pattern,
    }));
    this.applyTheme();
    this.initializeLampy();
    this.precalculateLEDPositions();
    this.startAnimationLoop();
    this.checkConnection();
    this.currentPattern = this.patterns[0];
    this.currentMusicMode = this.musicModes[0]; // Default to Frequency Bars
    window.addEventListener("beforeunload", () => this.beforeUnmount());
  },

  methods: {
    // ===== THEME =====
    applyTheme() {
      document.documentElement.classList.toggle("dark", this.isDark);
      localStorage.theme = this.isDark ? "dark" : "light";
    },

    toggleTheme() {
      this.isDark = !this.isDark;
      this.applyTheme();
    },

    // ===== MUSIC MODE TOGGLE =====
    async toggleMusicMode() {
      if (!this.musicMode) {
        // ACTIVATE MUSIC MODE
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          this.setupAudioContext(stream);
          this.musicMode = true;
          console.log("🎵 MUSIC MODE ACTIVATED - Let's fucking GO!");
        } catch (error) {
          console.error("Microphone access denied:", error);
          alert(
            "🎤 Lampy needs microphone access to become a music visualizer!\n\nPlease allow mic permissions and try again."
          );
        }
      } else {
        // DEACTIVATE MUSIC MODE
        this.stopAudioContext();
        this.musicMode = false;
        console.log("🔇 Music mode deactivated. Back to chill vibes.");
      }
    },

    // ===== AUDIO CONTEXT SETUP =====
    setupAudioContext(stream) {
      // Create audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();

      // FFT configuration
      this.analyser.fftSize = 2048; // 2048 bins for high resolution
      this.analyser.smoothingTimeConstant = 0.8; // Smooth transitions
      this.bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(this.bufferLength);

      // Connect microphone
      this.microphone = this.audioContext.createMediaStreamSource(stream);
      this.microphone.connect(this.analyser);

      console.log("🎤 Audio context initialized. FFT size:", this.analyser.fftSize);

      // Start audio analysis loop
      this.startAudioAnalysis();
    },

    // ===== STOP AUDIO CONTEXT =====
    stopAudioContext() {
      if (this.audioUpdateInterval) {
        clearInterval(this.audioUpdateInterval);
        this.audioUpdateInterval = null;
      }

      if (this.microphone) {
        this.microphone.disconnect();
        this.microphone = null;
      }

      if (this.audioContext) {
        this.audioContext.close();
        this.audioContext = null;
      }

      // Reset LED colors to black
      this.musicLEDColors = Array(72).fill({ color: "#000000", intensity: 0 });
      this.spectrumBars = Array(8).fill(0);
    },

    // ===== AUDIO ANALYSIS LOOP =====
    startAudioAnalysis() {
      // Run at ~60fps for smooth visualization
      this.audioUpdateInterval = setInterval(() => {
        if (!this.analyser) return;

        // Get frequency data
        this.analyser.getByteFrequencyData(this.dataArray);

        // Update spectrum bars for UI
        this.updateSpectrumBars();

        // Update LED colors based on current music mode
        this.updateMusicVisualization();

        // Send to ESP32 (throttled)
        this.sendMusicColorsToLampy();
      }, 16); // ~60fps
    },

    // ===== UPDATE SPECTRUM BARS (UI) =====
    updateSpectrumBars() {
      const bands = this.getFrequencyBands();
      this.spectrumBars = bands.map((value) => Math.min(100, value * 1.2));
    },

    // ===== GET FREQUENCY BANDS =====
    getFrequencyBands() {
      // Split spectrum into 8 bands (similar to classic equalizer)
      const sampleRate = this.audioContext.sampleRate;
      const nyquist = sampleRate / 2;
      const binWidth = nyquist / this.bufferLength;

      const bands = [
        { min: 20, max: 60 }, // Sub Bass
        { min: 60, max: 250 }, // Bass
        { min: 250, max: 500 }, // Low Mids
        { min: 500, max: 2000 }, // Mids
        { min: 2000, max: 4000 }, // High Mids
        { min: 4000, max: 6000 }, // Highs
        { min: 6000, max: 8000 }, // Super Highs
        { min: 8000, max: 16000 }, // Ultra Highs
      ];

      return bands.map((band) => {
        const startBin = Math.floor(band.min / binWidth);
        const endBin = Math.floor(band.max / binWidth);
        let sum = 0;
        let count = 0;

        for (let i = startBin; i < endBin && i < this.bufferLength; i++) {
          sum += this.dataArray[i];
          count++;
        }

        return count > 0 ? (sum / count / 255) * 100 : 0;
      });
    },

    // ===== UPDATE MUSIC VISUALIZATION =====
    updateMusicVisualization() {
      const mode = this.currentMusicMode;
      if (!mode) return;

      const sensitivity = this.musicSensitivity / 5; // Normalize 1-10 to 0.2-2.0

      switch (mode.id) {
        case 0:
          this.visualizeFrequencyBars(sensitivity);
          break;
        case 1:
          this.visualizeBassCannon(sensitivity);
          break;
        case 2:
          this.visualizeMelodyFlow(sensitivity);
          break;
        case 3:
          this.visualizeEnergyStorm(sensitivity);
          break;
        case 4:
          this.visualizeStrobeParty(sensitivity);
          break;
        case 5:
          this.visualizeAmbientBreath(sensitivity);
          break;
      }
    },

    // ===== MODE 0: FREQUENCY BARS =====
    visualizeFrequencyBars(sensitivity) {
      const bands = this.getFrequencyBands();
      const ledsPerBand = Math.floor(72 / 8);

      const colorPalette = [
        "#ff0000", // Red (Sub Bass)
        "#ff4500", // Orange-Red (Bass)
        "#ff8800", // Orange (Low Mids)
        "#ffd700", // Yellow (Mids)
        "#00ff00", // Green (High Mids)
        "#00ffff", // Cyan (Highs)
        "#0080ff", // Blue (Super Highs)
        "#8800ff", // Purple (Ultra Highs)
      ];

      for (let i = 0; i < 72; i++) {
        const bandIndex = Math.floor(i / ledsPerBand);
        const bandValue = (bands[bandIndex] / 100) * sensitivity;
        const positionInBand = i % ledsPerBand;
        const threshold = positionInBand / ledsPerBand;

        this.musicLEDColors[i] = {
          color: colorPalette[bandIndex] || "#ffffff",
          intensity: bandValue > threshold ? bandValue : 0,
        };
      }
    },

    // ===== MODE 1: BASS CANNON =====
    visualizeBassCannon(sensitivity) {
      const bands = this.getFrequencyBands();
      const bass = (bands[0] + bands[1]) / 2; // Average of sub bass + bass
      const bassNormalized = (bass / 100) * sensitivity;

      // Detect bass hits
      const now = Date.now();
      this.bassHistory.push(bassNormalized);
      if (this.bassHistory.length > 10) this.bassHistory.shift();
      const avgBass = this.bassHistory.reduce((a, b) => a + b, 0) / this.bassHistory.length;

      const isBassHit = bassNormalized > avgBass * 1.5 && now - this.lastBassHit > 200;

      if (isBassHit) {
        this.lastBassHit = now;
        // Create explosive pulse from bottom
        for (let i = 0; i < 72; i++) {
          const delay = i * 20; // Stagger the pulse upward
          setTimeout(() => {
            this.musicLEDColors[i] = {
              color: this.getRandomColorFromPalette(),
              intensity: 1.0,
            };
          }, delay);

          // Fade out
          setTimeout(() => {
            this.musicLEDColors[i] = {
              color: this.musicLEDColors[i].color,
              intensity: Math.max(0, this.musicLEDColors[i].intensity - 0.1),
            };
          }, delay + 500);
        }
      } else {
        // Gentle fade when no bass
        for (let i = 0; i < 72; i++) {
          this.musicLEDColors[i].intensity = Math.max(0, this.musicLEDColors[i].intensity * 0.95);
        }
      }
    },

    // ===== MODE 2: MELODY FLOW =====
    visualizeMelodyFlow(sensitivity) {
      const bands = this.getFrequencyBands();
      const midBands = bands.slice(3, 6); // Focus on melody range (500Hz - 6kHz)
      const avgMids = midBands.reduce((a, b) => a + b, 0) / midBands.length;

      // Rotate hue based on frequency content
      this.hueRotation += (avgMids / 100) * sensitivity * 0.5;
      this.hueRotation = this.hueRotation % 360;

      for (let i = 0; i < 72; i++) {
        const hue = (this.hueRotation + i * 5) % 360;
        const intensity = (avgMids / 100) * sensitivity;

        this.musicLEDColors[i] = {
          color: this.hslToHex(hue, 100, 50),
          intensity: Math.max(0.2, intensity),
        };
      }
    },

    // ===== MODE 3: ENERGY STORM =====
    visualizeEnergyStorm(sensitivity) {
      const bands = this.getFrequencyBands();
      const totalEnergy = bands.reduce((a, b) => a + b, 0) / bands.length;

      // Smooth energy changes
      this.energySmoothed = this.energySmoothed * 0.8 + (totalEnergy / 100) * sensitivity * 0.2;

      // Create traveling wave based on energy
      const waveSpeed = this.energySmoothed * 10;

      for (let i = 0; i < 72; i++) {
        const wave = Math.sin((i * 0.1 + Date.now() * 0.001 * waveSpeed) * Math.PI * 2) * 0.5 + 0.5;
        const hue = (Date.now() * 0.1 + i * 5) % 360;

        this.musicLEDColors[i] = {
          color: this.hslToHex(hue, 100, 50),
          intensity: wave * this.energySmoothed,
        };
      }
    },

    // ===== MODE 4: STROBE PARTY =====
    visualizeStrobeParty(sensitivity) {
      const bands = this.getFrequencyBands();

      // Detect transients (sudden increases in amplitude)
      const totalEnergy = bands.reduce((a, b) => a + b, 0) / bands.length;
      const energyNormalized = (totalEnergy / 100) * sensitivity;

      const isTransient = energyNormalized > this.transientThreshold * 1.5;
      this.transientThreshold = this.transientThreshold * 0.95 + energyNormalized * 0.05;

      if (isTransient) {
        // Flash entire strip with random color
        const flashColor = this.getRandomColorFromPalette();
        for (let i = 0; i < 72; i++) {
          this.musicLEDColors[i] = {
            color: flashColor,
            intensity: 1.0,
          };
        }
      } else {
        // Rapid fade
        for (let i = 0; i < 72; i++) {
          this.musicLEDColors[i].intensity = Math.max(0, this.musicLEDColors[i].intensity * 0.8);
        }
      }
    },

    // ===== MODE 5: AMBIENT BREATH =====
    visualizeAmbientBreath(sensitivity) {
      const bands = this.getFrequencyBands();
      const avgVolume = bands.reduce((a, b) => a + b, 0) / bands.length;

      // Slow breathing effect
      this.ambientBreathPhase += (avgVolume / 100) * sensitivity * 0.01;
      const breathIntensity = Math.sin(this.ambientBreathPhase) * 0.5 + 0.5;

      for (let i = 0; i < 72; i++) {
        const gradient = i / 72;
        const hue = (gradient * 120 + Date.now() * 0.01) % 360; // Slow hue rotation

        this.musicLEDColors[i] = {
          color: this.hslToHex(hue, 70, 50),
          intensity: breathIntensity * 0.8,
        };
      }
    },

    // ===== SEND MUSIC COLORS TO ESP32 =====
    sendMusicColorsToLampy() {
      if (this.connectionStatus !== "connected") return;

      // Throttle updates to ESP32 (max 30fps to avoid overwhelming it)
      if (this.lastMusicUpdate && Date.now() - this.lastMusicUpdate < 33) return;
      this.lastMusicUpdate = Date.now();

      // Convert LED colors to hex array
      const colorArray = this.musicLEDColors.map((led) => {
        const intensity = Math.max(0, Math.min(1, led.intensity));
        return this.adjustColorBrightness(led.color, intensity);
      });

      // Send to ESP32
      fetch("/api/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pattern: 8, // Reserved pattern ID for music mode
          brightness: 255,
          colors: colorArray.slice(0, 72), // Send all 72 LED colors
          timestamp: Date.now(),
        }),
      }).catch((error) => console.error("Music update error:", error));
    },

    // ===== HELPER: HSL TO HEX =====
    hslToHex(h, s, l) {
      s /= 100;
      l /= 100;
      const k = (n) => (n + h / 30) % 12;
      const a = s * Math.min(l, 1 - l);
      const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
      const rgb = [255 * f(0), 255 * f(8), 255 * f(4)].map((x) => Math.round(x));
      return `#${rgb.map((x) => x.toString(16).padStart(2, "0")).join("")}`;
    },

    // ===== HELPER: ADJUST COLOR BRIGHTNESS =====
    adjustColorBrightness(hexColor, intensity) {
      const r = parseInt(hexColor.slice(1, 3), 16);
      const g = parseInt(hexColor.slice(3, 5), 16);
      const b = parseInt(hexColor.slice(5, 7), 16);

      const newR = Math.floor(r * intensity);
      const newG = Math.floor(g * intensity);
      const newB = Math.floor(b * intensity);

      return `#${newR.toString(16).padStart(2, "0")}${newG.toString(16).padStart(2, "0")}${newB
        .toString(16)
        .padStart(2, "0")}`;
    },

    // ===== HELPER: GET RANDOM COLOR FROM PALETTE =====
    getRandomColorFromPalette() {
      const palette = [
        "#ff0000",
        "#ff4500",
        "#ff8800",
        "#ffd700",
        "#00ff00",
        "#00ffff",
        "#0080ff",
        "#8800ff",
        "#ff00ff",
      ];
      return palette[Math.floor(Math.random() * palette.length)];
    },

    // ===== SELECT MUSIC MODE =====
    selectMusicMode(mode) {
      this.currentMusicMode = mode;
      console.log("🎨 Music mode changed to:", mode.name);
    },

    // ===== GET MUSIC LED COLOR (FOR RENDERING) =====
    getMusicLEDColor(ledIndex) {
      const led = this.musicLEDColors[ledIndex - 1] || { color: "#000000", intensity: 0 };
      return {
        backgroundColor: led.color,
        opacity: Math.max(0.1, Math.min(1, led.intensity)),
        boxShadow: led.intensity > 0.6 ? `0 0 8px ${led.color}66` : "none",
      };
    },

    // ===== STANDARD LAMPY METHODS =====
    async initializeLampy() {
      try {
        const response = await fetch("/api/status");
        if (response.ok) {
          const status = await response.json();
          const foundPattern = this.patterns.find((p) => p.id === status.current_mode);
          if (foundPattern) {
            this.currentPattern = foundPattern;
            if (status.current_colors && status.current_colors.length > 0) {
              this.currentPattern.colors = [...status.current_colors];
            }
          }
          this.brightness = Math.round((status.brightness / 255) * 100);
          this.speed = status.speed || 5;

          if (status.wifi_ssid) {
            this.wifiStatus.ssid = status.wifi_ssid;
          }

          this.connectionStatus = "connected";
        } else {
          this.connectionStatus = "offline";
        }
      } catch (error) {
        this.connectionStatus = "offline";
        this.currentPattern = this.patterns[0];
      }
    },

    checkConnection() {
      this.connectionInterval = setInterval(async () => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          const response = await fetch("/api/status", { signal: controller.signal });
          clearTimeout(timeoutId);
          this.connectionStatus = response.ok ? "connected" : "offline";
        } catch (error) {
          this.connectionStatus = "offline";
        }
      }, 10000);
    },

    async selectPattern(pattern) {
      try {
        const response = await fetch("/api/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pattern: pattern.id,
            brightness: Math.floor(this.brightness * 2.55),
            params: { cycleSpeed: this.speed },
          }),
        });

        if (response.ok) {
          const statusResponse = await fetch("/api/status");
          if (statusResponse.ok) {
            const status = await statusResponse.json();
            if (status.current_colors) {
              pattern.colors = [...status.current_colors];
            }
          }
        }
      } catch (error) {
        console.error("Error switching pattern:", error);
      }

      this.currentPattern = pattern;
    },

    getSpeedLabel(speed) {
      if (speed <= 3) return "Slow";
      if (speed <= 6) return "Medium";
      return "Fast";
    },

    openColorPicker(slotIndex, event) {
      this.selectedColorSlot = slotIndex;
      this.colorPickerOpen = true;

      const button = event.target.closest("button");
      const chosenColorsContainer = button.closest(".chosen-colors");
      const containerElement = chosenColorsContainer || button.parentElement;
      const rect = containerElement.getBoundingClientRect();
      const popoverWidth = 320;
      const popoverHeight = 200;

      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;

      let top;
      if (spaceBelow >= popoverHeight + 10 || spaceBelow > spaceAbove) {
        top = rect.bottom + 10;
      } else {
        top = rect.top - popoverHeight - 10;
      }

      let left = rect.left + rect.width / 2 - popoverWidth / 2;

      if (left < 10) {
        left = 10;
      } else if (left + popoverWidth > window.innerWidth - 10) {
        left = window.innerWidth - popoverWidth - 10;
      }

      this.colorPickerPosition = {
        top: `${top}px`,
        left: `${left}px`,
      };
    },

    closeColorPicker() {
      this.colorPickerOpen = false;
    },

    applyColorToSlot(colorValue) {
      if (!this.currentPattern) return;
      this.currentPattern.colors[this.selectedColorSlot] = colorValue;
      this.applySettingsLive();
      this.closeColorPicker();
    },

    resetColors() {
      if (this.currentPattern?.originalColors) {
        this.currentPattern.colors = [...this.currentPattern.originalColors];
        this.selectedColorSlot = 0;
        this.applySettingsLive();
      }
    },

    randomizeColors() {
      if (!this.currentPattern) return;

      const availableColors = [...this.curatedColors];
      const numColors = this.currentPattern.colors.length;
      const newColors = [];

      for (let i = 0; i < numColors; i++) {
        const randomIndex = Math.floor(Math.random() * availableColors.length);
        newColors.push(availableColors[randomIndex].value);
      }

      this.currentPattern.colors = newColors;
      this.applySettingsLive();
    },

    async updateWifiSettings() {
      if (!this.wifiStatus.password || this.wifiStatus.password.trim() === "") {
        alert("Please enter a valid password");
        return;
      }

      if (
        !confirm(
          `Update WiFi password for "${this.wifiStatus.ssid}"?\n\nLampy will restart and reconnect to the network.`
        )
      ) {
        return;
      }

      try {
        const response = await fetch("/api/wifi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ssid: this.wifiStatus.ssid, password: this.wifiStatus.password }),
        });
        if (response.ok) {
          alert("WiFi password updated! Lampy is restarting...\n\nPlease wait a moment for Lampy to reconnect.");
          this.connectionStatus = "offline";
          this.showWifiCredentials = false;
          this.showSettings = false;
          this.wifiStatus.password = "";
        } else {
          alert("Failed to update WiFi settings. Please try again.");
        }
      } catch (error) {
        alert("Failed to update WiFi settings. Please check your connection.");
      }
    },

    async forgetWifi() {
      if (
        !confirm(
          'Are you sure you want to forget the WiFi network?\n\nLampy will restart and you\'ll need to reconnect to "Hello, I am Lampy!" to set up WiFi again.'
        )
      ) {
        return;
      }
      try {
        const response = await fetch("/api/wifi-reset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (response.ok) {
          alert(
            'WiFi credentials cleared! Lampy is restarting...\n\nConnect to "Hello, I am Lampy!" WiFi network to set up a new connection.'
          );
          this.connectionStatus = "offline";
        }
      } catch (error) {
        alert("WiFi reset initiated. Lampy is restarting...");
      }
    },

    precalculateLEDPositions() {
      const totalLEDs = 72;
      const tubeHeight = 500,
        tubeRadius = 60;
      const tubeHeightMobile = 340,
        tubeRadiusMobile = 40;

      this.cachedLEDPositions = [];
      for (let i = 1; i <= totalLEDs; i++) {
        const progress = (i - 1) / (totalLEDs - 1);
        const angle = progress * Math.PI * 17;
        const height = progress * tubeHeight;
        const x = Math.cos(angle) * tubeRadius;
        const z = Math.sin(angle) * tubeRadius;
        this.cachedLEDPositions.push({
          position: "absolute",
          left: "50%",
          top: "8%",
          transform: `translate3d(${x}px, ${height}px, ${z}px) translate(-50%, -50%)`,
        });
      }

      this.cachedLEDPositionsMobile = [];
      for (let i = 1; i <= totalLEDs; i++) {
        const progress = (i - 1) / (totalLEDs - 1);
        const angle = progress * Math.PI * 12;
        const height = progress * tubeHeightMobile;
        const x = Math.cos(angle) * tubeRadiusMobile;
        const z = Math.sin(angle) * tubeRadiusMobile;
        this.cachedLEDPositionsMobile.push({
          position: "absolute",
          left: "50%",
          top: "8%",
          transform: `translate3d(${x}px, ${height}px, ${z}px) translate(-50%, -50%)`,
        });
      }
    },

    getLEDPosition(ledIndex) {
      return this.cachedLEDPositions[ledIndex - 1] || {};
    },

    getLEDPositionMobile(ledIndex) {
      return this.cachedLEDPositionsMobile[ledIndex - 1] || {};
    },

    getLEDColor(ledIndex) {
      if (!this.currentPattern) return { backgroundColor: "#333333", opacity: 0.3 };

      const pattern = this.currentPattern;
      const colors = pattern.colors || [];
      const time = this.time * 0.001;
      const speed = this.speed / 10;
      const brightness = this.brightness / 100;

      let color, intensity;

      switch (pattern.id) {
        case 0: // Fire
          const fireBase =
            Math.sin(time * speed * 3 + ledIndex * 0.2) * Math.cos(time * speed * 2 + ledIndex * 0.15);
          const fireFlicker = Math.random() * 0.3;
          const fireIntensity = Math.max(0, (fireBase + fireFlicker) * 0.5 + 0.4);
          const fireColorIndex = Math.min(Math.floor(fireIntensity * colors.length), colors.length - 1);
          color = colors[fireColorIndex] || "#ff4500";
          intensity = brightness * (0.3 + fireIntensity * 0.7);
          break;

        case 1: // Shooting Stars
          const meteorLength = 15;
          const meteorSpeed = speed * 4;
          const meteorPos = ((time * meteorSpeed) % (72 + meteorLength * 2)) - meteorLength;
          const distanceFromMeteor = Math.abs(ledIndex - meteorPos);
          intensity =
            distanceFromMeteor < meteorLength ? brightness * Math.max(0, 1 - distanceFromMeteor / meteorLength) : 0;
          color = colors[0] || "#8000ff";
          break;

        case 2: // Rainbow
          const rainbowPos = (time * speed + ledIndex * 0.08) % 1;
          const rainbowColorIndex = Math.floor(rainbowPos * colors.length);
          color = colors[rainbowColorIndex] || "#ff0000";
          intensity = brightness * (0.8 + Math.sin(time * speed * 2 + ledIndex * 0.1) * 0.2);
          break;

        case 3: // Fireflies
          const sparkChance = 0.01;
          const isNewSpark = Math.random() < sparkChance;
          const pulseBase = Math.sin(time * speed + ledIndex * 0.3) * 0.5 + 0.5;
          const sparkleMultiplier = isNewSpark ? 2 : 1;
          intensity = brightness * pulseBase * sparkleMultiplier * 0.6;
          color = colors[Math.floor(Math.random() * colors.length)] || "#ffd700";
          break;

        default: // Waves
          const wavePhase = time * speed + ledIndex * 0.1;
          const wave1 = Math.sin(wavePhase) * 0.5 + 0.5;
          const wave2 = Math.sin(wavePhase * 0.7 + Math.PI / 3) * 0.3 + 0.5;
          const combinedWave = (wave1 + wave2) / 2;
          const waveColorIndex = Math.floor(combinedWave * colors.length);
          color = colors[Math.min(waveColorIndex, colors.length - 1)] || "#00ff00";
          intensity = brightness * (0.4 + combinedWave * 0.6);
          break;
      }

      return {
        backgroundColor: color,
        opacity: Math.max(0.2, Math.min(1, intensity)),
        boxShadow: intensity > 0.6 ? `0 0 8px ${color}66` : "none",
      };
    },

    getLEDIntensity(ledIndex) {
      return parseFloat(this.getLEDColor(ledIndex).opacity) || 0;
    },

    applySettingsLive() {
      clearTimeout(this.liveUpdateTimeout);
      this.liveUpdateTimeout = setTimeout(() => this.sendToLampy(), 100);
    },

    async sendToLampy() {
      if (!this.currentPattern) return;
      const settings = {
        pattern: this.currentPattern.id,
        brightness: Math.floor(this.brightness * 2.55),
        speed: this.speed,
        colors: this.currentPattern.colors || [],
        timestamp: Date.now(),
      };

      if (this.connectionStatus === "connected") {
        try {
          await fetch("/api/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(settings),
          });
        } catch (error) {
          console.error("Connection error:", error);
        }
      }
    },

    startAnimationLoop() {
      let lastFrameTime = 0;
      const frameInterval = 1000 / 60;
      const animate = (currentTime) => {
        if (currentTime - lastFrameTime >= frameInterval) {
          this.time = currentTime;
          lastFrameTime = currentTime;
        }
        this.animationId = requestAnimationFrame(animate);
      };
      this.animationId = requestAnimationFrame(animate);
    },
  },

  watch: {
    brightness() {
      if (!this.musicMode) this.applySettingsLive();
    },
    speed() {
      if (!this.musicMode) this.applySettingsLive();
    },
  },

  beforeUnmount() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this.connectionInterval) clearInterval(this.connectionInterval);
    if (this.liveUpdateTimeout) clearTimeout(this.liveUpdateTimeout);
    if (this.musicMode) this.stopAudioContext();
    this.cachedLEDPositions = [];
    this.cachedLEDPositionsMobile = [];
  },
}).mount("#app");