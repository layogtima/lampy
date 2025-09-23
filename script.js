// Lampy v3 - Live & Minimal Control Interface
// Built with precision, neopixel optimization, and pure live control
// Now with 100% less borken code!

const { createApp } = Vue;

// API Configuration
const LAMPY_API = {
    base: 'http://lampy.local/api',
    endpoints: {
        status: '/status',
        update: '/update',
        discover: '/discover',
        wifi: '/wifi',
        bluetooth: '/bluetooth'
    }
};

// WS2812B Optimized Color Palette - Actually works with neopixels!
const NEOPIXEL_COLORS = [
    { name: 'Red', value: '#ff0000' },
    { name: 'Orange', value: '#ff4500' },
    { name: 'Yellow', value: '#ffff00' },
    { name: 'Lime', value: '#00ff00' },
    { name: 'Green', value: '#008000' },
    { name: 'Cyan', value: '#00ffff' },
    { name: 'Blue', value: '#0000ff' },
    { name: 'Purple', value: '#8000ff' },
    { name: 'Magenta', value: '#ff00ff' },
    { name: 'Pink', value: '#ff69b4' },
    { name: 'White', value: '#ffffff' },
    { name: 'Warm White', value: '#ffd4a3' },
    { name: 'Cool White', value: '#d4e4ff' },
    { name: 'Gold', value: '#ffd700' },
    { name: 'Amber', value: '#ffbf00' },
    { name: 'Deep Red', value: '#8b0000' },
    { name: 'Forest', value: '#228b22' },
    { name: 'Navy', value: '#000080' },
    { name: 'Violet', value: '#8b00ff' },
    { name: 'Coral', value: '#ff7f50' }
];

// Pattern definitions with optimized neopixel colors
const PATTERN_DEFINITIONS = {
    0: { 
        name: 'Cozy Fire', 
        icon: 'fas fa-fire',
        colors: ['#ff4500', '#ff6500', '#ffbf00'],
        originalColors: ['#ff4500', '#ff6500', '#ffbf00']
    },
    1: { 
        name: 'Shooting Stars', 
        icon: 'fas fa-meteor',
        colors: ['#8000ff', '#a000ff', '#c000ff'],
        originalColors: ['#8000ff', '#a000ff', '#c000ff']
    },
    2: { 
        name: 'Rainbow Magic', 
        icon: 'fas fa-rainbow',
        colors: ['#ff0000', '#ffff00', '#0000ff', '#00ff00'],
        originalColors: ['#ff0000', '#ffff00', '#0000ff', '#00ff00']
    },
    3: { 
        name: 'Gentle Fireflies', 
        icon: 'fas fa-sparkles',
        colors: ['#ffd700', '#ffbf00', '#ff8c00'],
        originalColors: ['#ffd700', '#ffbf00', '#ff8c00']
    },
    4: { 
        name: 'Field of Asters', 
        icon: 'fas fa-seedling',
        colors: ['#8000ff', '#a000ff', '#ffd700'],
        originalColors: ['#8000ff', '#a000ff', '#ffd700']
    },
    5: { 
        name: 'Ocean Waves', 
        icon: 'fas fa-water',
        colors: ['#0000ff', '#0080ff', '#00ffff'],
        originalColors: ['#0000ff', '#0080ff', '#00ffff']
    },
    6: { 
        name: 'Radioactive Kelp', 
        icon: 'fas fa-leaf',
        colors: ['#00ff00', '#80ff00', '#40ff00'],
        originalColors: ['#00ff00', '#80ff00', '#40ff00']
    },
    7: { 
        name: 'Mandarin Grove', 
        icon: 'fas fa-tree',
        colors: ['#ff4500', '#ff6500', '#008000'],
        originalColors: ['#ff4500', '#ff6500', '#008000']
    }
};

// Create the Vue app
createApp({
    data() {
        return {
            // Theme
            isDark: localStorage.theme === 'dark' || 
                   (!('theme' in localStorage) && 
                    window.matchMedia('(prefers-color-scheme: dark)').matches),
            
            // UI State
            showSettings: false,
            
            // Connection
            connectionStatus: 'connecting',
            
            // Pattern Control (Always Live Mode)
            currentPattern: null,
            brightness: 75,
            speed: 5,
            
            // Animation
            time: 0,
            
            // Data
            patterns: [],
            
            // Neopixel color palette
            neopixelColors: NEOPIXEL_COLORS,
            
            // Multi-device support
            discoveredDevices: [
                { id: 'lampy-001', name: 'Lampy Living Room', type: 'WiFi', ip: '192.168.1.100' },
                { id: 'lampy-002', name: 'Lampy Bedroom', type: 'BLE', rssi: -45 },
                { id: 'lampy-003', name: 'Lampy Kitchen', type: 'WiFi', ip: '192.168.1.102' }
            ],
            selectedDevice: null,
            
            // Connection status
            wifiStatus: 'Connected to HomeNetwork',
            bluetoothStatus: 'Scanning...',
            
            // Device info
            deviceInfo: {
                firmware: 'v3.0.0',
                hardware: 'ESP32-C3 + WS2812B',
                ledCount: '72 LEDs',
                uptime: '2d 14h 32m'
            },
            
            // Live update timer
            liveUpdateTimeout: null
        };
    },

    computed: {
        connectionDot() {
            switch (this.connectionStatus) {
                case 'connected': 
                    return 'bg-green-500';
                case 'connecting': 
                    return 'bg-yellow-500 animate-pulse';
                case 'disconnected': 
                    return 'bg-red-500';
                default: 
                    return 'bg-gray-500';
            }
        },
        
        connectionStatusText() {
            switch (this.connectionStatus) {
                case 'connected': 
                    return this.selectedDevice ? `Connected to ${this.selectedDevice.name}` : 'Connected';
                case 'connecting': 
                    return 'Connecting...';
                case 'disconnected': 
                    return 'Offline';
                default: 
                    return 'Unknown';
            }
        }
    },

    mounted() {
        // Initialize patterns from definitions
        this.patterns = Object.entries(PATTERN_DEFINITIONS).map(([id, pattern]) => ({
            id: parseInt(id),
            ...pattern
        }));
        
        // Initialize everything else
        this.applyTheme();
        this.initializeLampy();
        this.startAnimationLoop();
        this.checkConnection();
        
        // Set default pattern and device
        this.currentPattern = this.patterns[0];
        this.selectedDevice = this.discoveredDevices[0];
    },

    methods: {
        // Theme Management
        applyTheme() {
            if (this.isDark) {
                document.documentElement.classList.add('dark');
                localStorage.theme = 'dark';
            } else {
                document.documentElement.classList.remove('dark');
                localStorage.theme = 'light';
            }
        },

        toggleTheme() {
            this.isDark = !this.isDark;
            this.applyTheme();
        },

        // Connection Management
        async initializeLampy() {
            try {
                const response = await fetch(`${LAMPY_API.base}${LAMPY_API.endpoints.status}`);
                if (response.ok) {
                    const status = await response.json();
                    const foundPattern = this.patterns.find(p => p.id === status.currentPattern);
                    if (foundPattern) {
                        this.currentPattern = foundPattern;
                    } else {
                        this.currentPattern = this.patterns[0];
                    }
                    this.brightness = Math.round((status.brightness / 255) * 100);
                    this.speed = status.speed || 5;
                    this.connectionStatus = 'connected';
                } else {
                    this.connectionStatus = 'offline';
                }
            } catch (error) {
                console.log('Lampy not found, running in offline mode');
                this.connectionStatus = 'offline';
                this.currentPattern = this.patterns[0];
            }
        },

        checkConnection() {
            setInterval(async () => {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 3000);
                    
                    const response = await fetch(`${LAMPY_API.base}${LAMPY_API.endpoints.status}`, {
                        signal: controller.signal
                    });
                    
                    clearTimeout(timeoutId);
                    this.connectionStatus = response.ok ? 'connected' : 'offline';
                } catch (error) {
                    this.connectionStatus = 'offline';
                }
            }, 10000);
        },

        // Device Discovery
        async scanForDevices() {
            this.bluetoothStatus = 'Scanning...';
            
            try {
                const response = await fetch(`${LAMPY_API.base}${LAMPY_API.endpoints.discover}`, {
                    method: 'POST'
                });
                
                if (response.ok) {
                    const devices = await response.json();
                    this.discoveredDevices = [...this.discoveredDevices, ...devices];
                    this.bluetoothStatus = `Found ${devices.length} devices`;
                } else {
                    this.bluetoothStatus = 'Scan failed';
                }
            } catch (error) {
                this.bluetoothStatus = 'Scan error';
            }
        },

        // Configuration Methods
        async configureWifi() {
            this.showNotification('WiFi configuration would open here');
        },

        async configureBluetooth() {
            this.showNotification('Bluetooth configuration would open here');
        },

        // Pattern Control (Live Only)
        selectPattern(pattern) {
            this.currentPattern = pattern;
            this.applySettingsLive();
        },

        getSpeedLabel(speed) {
            if (speed <= 3) return 'Slow';
            if (speed <= 6) return 'Medium';
            return 'Fast';
        },

        // Color Management
        onColorChange() {
            this.applySettingsLive();
        },

        resetColors() {
            if (this.currentPattern && this.currentPattern.originalColors) {
                this.currentPattern.colors = [...this.currentPattern.originalColors];
                this.applySettingsLive();
            }
        },

        // LED Positioning - Fixed to prevent spinning
        getLEDPosition(ledIndex) {
            const totalLEDs = 72;
            const tubeHeight = 500;
            const tubeRadius = 60;
            
            const progress = (ledIndex - 1) / (totalLEDs - 1);
            const angle = progress * Math.PI * 17; // 6 full rotations
            const height = progress * tubeHeight;
            
            const x = Math.cos(angle) * tubeRadius;
            const z = Math.sin(angle) * tubeRadius;
            const y = height;
            
            return {
                position: 'absolute',
                left: '50%',
                top: '8%',
                transform: `translate3d(${x}px, ${y}px, ${z}px) translate(-50%, -50%)`
            };
        },

        getLEDPositionMobile(ledIndex) {
            const totalLEDs = 72;
            const tubeHeight = 340;
            const tubeRadius = 40;
            
            const progress = (ledIndex - 1) / (totalLEDs - 1);
            const angle = progress * Math.PI * 12; // 6 full rotations
            const height = progress * tubeHeight;
            
            const x = Math.cos(angle) * tubeRadius;
            const z = Math.sin(angle) * tubeRadius;
            const y = height;
            
            return {
                position: 'absolute',
                left: '50%',
                top: '8%',
                transform: `translate3d(${x}px, ${y}px, ${z}px) translate(-50%, -50%)`
            };
        },

        getLEDColor(ledIndex) {
            if (!this.currentPattern) {
                return {
                    backgroundColor: '#333333',
                    opacity: 0.3
                };
            }

            const pattern = this.currentPattern;
            const colors = pattern.colors || [];
            const time = this.time * 0.001;
            const speed = this.speed / 10;
            const brightness = this.brightness / 100;
            
            let color, intensity;
            
            // Pattern-specific calculations
            switch (pattern.id) {
                case 0: // Fire
                    const fireBase = Math.sin(time * speed * 3 + ledIndex * 0.2) * 
                                    Math.cos(time * speed * 2 + ledIndex * 0.15);
                    const fireFlicker = Math.random() * 0.3;
                    const fireIntensity = Math.max(0, (fireBase + fireFlicker) * 0.5 + 0.4);
                    const fireColorIndex = Math.min(Math.floor(fireIntensity * colors.length), colors.length - 1);
                    color = colors[fireColorIndex] || '#ff4500';
                    intensity = brightness * (0.3 + fireIntensity * 0.7);
                    break;
                    
                case 1: // Shooting Stars
                    const meteorLength = 15;
                    const meteorSpeed = speed * 4;
                    const meteorPos = ((time * meteorSpeed) % (72 + meteorLength * 2)) - meteorLength;
                    const distanceFromMeteor = Math.abs(ledIndex - meteorPos);
                    intensity = distanceFromMeteor < meteorLength ? 
                               brightness * Math.max(0, 1 - (distanceFromMeteor / meteorLength)) : 0;
                    color = colors[0] || '#8000ff';
                    break;
                    
                case 2: // Rainbow
                    const rainbowPos = (time * speed + ledIndex * 0.08) % 1;
                    const rainbowColorIndex = Math.floor(rainbowPos * colors.length);
                    color = colors[rainbowColorIndex] || '#ff0000';
                    intensity = brightness * (0.8 + Math.sin(time * speed * 2 + ledIndex * 0.1) * 0.2);
                    break;
                    
                case 3: // Fireflies
                    const sparkChance = 0.01;
                    const isNewSpark = Math.random() < sparkChance;
                    const pulseBase = Math.sin(time * speed + ledIndex * 0.3) * 0.5 + 0.5;
                    const sparkleMultiplier = isNewSpark ? 2 : 1;
                    intensity = brightness * pulseBase * sparkleMultiplier * 0.6;
                    color = colors[Math.floor(Math.random() * colors.length)] || '#ffd700';
                    break;
                    
                default: // Waves (Asters, Ocean, Kelp, Mandarin)
                    const wavePhase = time * speed + ledIndex * 0.1;
                    const wave1 = Math.sin(wavePhase) * 0.5 + 0.5;
                    const wave2 = Math.sin(wavePhase * 0.7 + Math.PI/3) * 0.3 + 0.5;
                    const combinedWave = (wave1 + wave2) / 2;
                    const waveColorIndex = Math.floor(combinedWave * colors.length);
                    color = colors[Math.min(waveColorIndex, colors.length - 1)] || '#00ff00';
                    intensity = brightness * (0.4 + combinedWave * 0.6);
                    break;
            }
            
            return {
                backgroundColor: color,
                opacity: Math.max(0.2, Math.min(1, intensity)),
                boxShadow: intensity > 0.6 ? `0 0 8px ${color}66` : 'none'
            };
        },

        getLEDIntensity(ledIndex) {
            const colorData = this.getLEDColor(ledIndex);
            return parseFloat(colorData.opacity) || 0;
        },

        // Live Settings Management
        applySettingsLive() {
            // Debounce rapid changes
            clearTimeout(this.liveUpdateTimeout);
            this.liveUpdateTimeout = setTimeout(() => {
                this.sendToLampy();
            }, 100); // Very short delay for live feel
        },

        async sendToLampy() {
            if (!this.currentPattern) return;
            
            const settings = {
                pattern: this.currentPattern.id,
                brightness: Math.floor(this.brightness * 2.55),
                speed: this.speed,
                colors: this.currentPattern.colors || [],
                deviceId: this.selectedDevice?.id,
                timestamp: Date.now()
            };

            if (this.connectionStatus === 'connected') {
                try {
                    const response = await fetch(`${LAMPY_API.base}${LAMPY_API.endpoints.update}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(settings)
                    });
                    
                    if (!response.ok) {
                        console.error('Failed to update Lampy');
                    }
                } catch (error) {
                    console.error('Connection error:', error);
                }
            }
        },

        // Animation Loop
        startAnimationLoop() {
            const animate = () => {
                this.time = Date.now();
                requestAnimationFrame(animate);
            };
            animate();
        },

        // Notifications
        showNotification(message, type = 'success') {
            const existing = document.querySelector('.notification');
            if (existing) {
                existing.remove();
            }

            const notification = document.createElement('div');
            notification.className = `notification fixed top-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-xl shadow-lg z-50 transition-all duration-300 ${
                type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
            }`;
            
            notification.textContent = message;
            notification.style.transform = 'translate(-50%, -100px)';
            notification.style.opacity = '0';
            
            document.body.appendChild(notification);

            setTimeout(() => {
                notification.style.transform = 'translate(-50%, 0)';
                notification.style.opacity = '1';
            }, 100);

            setTimeout(() => {
                notification.style.transform = 'translate(-50%, -100px)';
                notification.style.opacity = '0';
                setTimeout(() => {
                    if (document.body.contains(notification)) {
                        document.body.removeChild(notification);
                    }
                }, 300);
            }, 3000);
        }
    },

    // Watchers for live mode (always active)
    watch: {
        brightness() {
            this.applySettingsLive();
        },
        
        speed() {
            this.applySettingsLive();
        }
    },

    // Cleanup
    beforeUnmount() {
        if (this.liveUpdateTimeout) {
            clearTimeout(this.liveUpdateTimeout);
        }
    }
}).mount('#app');