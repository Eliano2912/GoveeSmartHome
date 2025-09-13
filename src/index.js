import "dotenv/config";
import fetch from 'node-fetch'; 

const API_KEY = process.env.GOVEE_API_KEY;
const DEVICE_ID = process.env.NACHTTISCH_DEVICE_ID;

async function setLightPower(on) {
  try {
    const response = await fetch("https://developer-api.govee.com/v1/devices/control", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Govee-API-Key": API_KEY
      },
      body: JSON.stringify({
        device: DEVICE_ID,
        model: "H6008", 
        cmd: {
          name: "turn",
          value: on ? "on" : "off"
        }
      })
    });

    const data = await response.json();
    console.log(`Licht ${on ? "eingeschaltet" : "ausgeschaltet"}:`, data);
  } catch (err) {
    console.error("Fehler beim Steuern des Lichts:", err);
  }
}

async function setLightColor(r, g, b) {
  try {
    const response = await fetch("https://developer-api.govee.com/v1/devices/control", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Govee-API-Key": API_KEY
      },
      body: JSON.stringify({
        device: DEVICE_ID,
        model: "H6008", 
        cmd: {
          name: "color",
          value:  {r, g, b}
        }
      })
    });

    const data = await response.json();
    console.log(`Licht ${on ? "eingeschaltet" : "ausgeschaltet"}:`, data);
  } catch (err) {
    console.error("Fehler beim Steuern des Lichts:", err);
  }
}

setTimeout(() => setLightPower(true), 3000);
setTimeout(() => setLightColor(255, 0, 0), 6000); // Rot nach 6 Sekunden
setTimeout(() => setLightColor(255, 255, 255), 9000);
setTimeout(() => setLightPower(false), 12000);
