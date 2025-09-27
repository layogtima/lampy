# Lampy WiFi Configuration Guide

## Overview

Lampy now supports dynamic WiFi configuration using WiFiManager! No more hardcoded credentials - you can easily configure WiFi settings through a web interface.

## Installation Requirements

### 1. Install WiFiManager Library

**Option A: Arduino IDE Library Manager (Recommended)**
1. Open Arduino IDE
2. Go to `Tools` → `Manage Libraries`
3. Search for "WiFiManager"
4. Install "WiFiManager" by tzapu (make sure it's the one by tzapu)
5. Click "Install" (it may also install dependencies like ESP Async WebServer)

**Option B: Manual Installation**
1. Download from: https://github.com/tzapu/WiFiManager
2. Extract to your Arduino libraries folder
3. Restart Arduino IDE

### 2. Upload Updated Code

Upload the modified `arduino.ino` code to your ESP32-C3 board as usual.

## How WiFi Configuration Works

### First Time Setup (or when WiFi credentials are cleared)

1. **Power on Lampy** - The device will start up normally
2. **WiFi Setup Mode** - If no WiFi credentials are saved, Lampy will:
   - Create a WiFi hotspot named **"Lampy-Setup"**
   - The LED patterns will still work normally
   - Serial monitor will show: "Setting up WiFi with WiFiManager..."

3. **Connect to Setup Network**:
   - On your phone/computer, connect to the "Lampy-Setup" WiFi network
   - No password required for the setup network
   - Your device should automatically open a setup page (captive portal)
   - If not, open a browser and go to: `192.168.4.1`

4. **Configure WiFi**:
   - Click "Configure WiFi" on the setup page
   - Select your home WiFi network from the list
   - Enter your WiFi password
   - Click "Save"

5. **Automatic Connection**:
   - Lampy will attempt to connect to your WiFi network
   - If successful, the setup hotspot will disappear
   - Lampy will restart and connect to your network automatically
   - **No need to find the IP address - just go to http://lampy.local**

### Normal Operation

Once configured, Lampy will:
- Automatically connect to your saved WiFi network on startup
- Remember the credentials permanently (stored in ESP32 flash memory)
- Be accessible at **http://lampy.local** (no IP address needed!)
- All existing functionality (patterns, colors, etc.) works exactly the same

## 🌐 How to Access Lampy (Multiple Easy Ways!)

### Method 1: lampy.local (Recommended) ⭐
Simply open any web browser and go to:
```
http://lampy.local
```
**Works on**: Windows, Mac, Linux, iOS, most Android devices

### Method 2: Router Admin Panel
1. Open your router's admin panel (usually `192.168.1.1` or `192.168.0.1`)
2. Look for "Connected Devices" or "DHCP Clients"
3. Find "Lampy" in the list
4. Click on the IP address shown

### Method 3: Network Scanner Apps (Backup)
- Download a network scanner app on your phone
- Scan your local network
- Look for device named "Lampy" or "ESP32"
- Tap the IP address to open in browser

### Moving to a New Location

When you move Lampy to a new location with different WiFi:

**Option 1: Use the Reset API (Recommended)**
1. While connected to current WiFi, access Lampy's web interface
2. Make a POST request to `/api/wifi-reset` endpoint
3. Lampy will clear WiFi credentials and restart in setup mode
4. Follow the "First Time Setup" steps above

**Option 2: Manual Reset**
1. Clear WiFi credentials via serial monitor (if you have access)
2. Or use the WiFiManager reset functionality

## API Endpoints

### New WiFi Reset Endpoint

**POST** `/api/wifi-reset`

Clears saved WiFi credentials and restarts device in setup mode.

**Response:**
```json
{
  "success": true,
  "message": "WiFi credentials cleared. Device will restart and enter setup mode."
}
```

**Example Usage:**
```javascript
fetch('/api/wifi-reset', {
  method: 'POST'
})
.then(response => response.json())
.then(data => console.log(data));
```

## Troubleshooting

### Setup Portal Not Appearing
- Wait 2-3 minutes for the portal to start
- Try manually navigating to `192.168.4.1` in your browser
- Check serial monitor for status messages

### Can't Connect to Home WiFi
- Double-check WiFi password (case sensitive)
- Ensure your WiFi network is 2.4GHz (ESP32 doesn't support 5GHz)
- Check if your network has special characters in the name
- Try moving closer to your router during setup

### Device Keeps Restarting
- Check serial monitor for error messages
- Ensure WiFiManager library is properly installed
- Verify your WiFi network is stable

### Factory Reset
If you need to completely reset:
1. Connect via USB and open serial monitor
2. The device will show current status
3. Use the `/api/wifi-reset` endpoint while connected
4. Or physically reset the ESP32 and clear credentials manually

## Configuration Options

The WiFiManager setup includes these customizations:

- **Hotspot Name**: "Lampy-Setup"
- **Timeout**: 180 seconds (3 minutes) for configuration
- **IP Address**: 192.168.4.1 for setup portal
- **Hostname**: "lampy" (appears in router device lists)

## Serial Monitor Output

During WiFi setup, you'll see messages like:
```
Setting up WiFi with WiFiManager...
WiFi connected successfully!
IP address: 192.168.1.100
Connected to: YourWiFiName
```

## Benefits of This Approach

✅ **No Code Changes**: Never need to modify and re-upload code for WiFi changes
✅ **User Friendly**: Simple web interface for configuration
✅ **Portable**: Easy to move Lampy between locations
✅ **Secure**: Credentials stored securely in ESP32 flash memory
✅ **Reliable**: Automatic reconnection and error handling
✅ **Professional**: Same system used by commercial IoT devices

## Next Steps

After setting up WiFi, your Lampy is ready to use! The web interface will be available at the IP address shown in the serial monitor, and all existing features will work exactly as before.