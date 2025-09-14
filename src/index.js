import "dotenv/config";
import fetch from 'node-fetch';
import mqtt from 'mqtt';

//creating constants 
const API_KEY = process.env.GOVEE_API_KEY;

const devices = {
    Nachttisch: { id: process.env.NACHTTISCH_DEVICE_ID, sku: process.env.NACHTTISCH_SKU },
    Sofa: { id: process.env.SOFA_DEVICE_ID, sku: process.env.SOFA_SKU },
    TVLicht: { id: process.env.TVLICHT_DEVICE_ID, sku: process.env.TVLICHT_SKU }
};

const MQTT_BROKER = process.env.MQTT_BROKER; 
const MOTION_TOPIC = "zigbee2mqtt/Ikea MotionSensor Eli";

const client = mqtt.connect(MQTT_BROKER);

client.on('connect', () => {
  console.log('Connected to MQTT broker');
  client.subscribe(MOTION_TOPIC, (err) => {
    if (!err) console.log(`Subscribed to ${MOTION_TOPIC}`);
  });
});

let lastTrigger = 0;
const COOLDOWN_MS = 3000; 

client.on("message", async (msgTopic, message) => {
  if (msgTopic === MOTION_TOPIC) {
    const data = JSON.parse(message.toString());

    if (data.occupancy) {
      const now = Date.now();
      if (now - lastTrigger < COOLDOWN_MS) return; // Ignore schnelle Wiederholungen
      lastTrigger = now;

      console.log("Motion captured!");

      try {
        const sleepMode = await proofSleepMode();
        if (sleepMode) {
          await setLightPower(devices.Nachttisch.id, devices.Nachttisch.sku, "Nachttisch", true);
          await setLightPower(devices.Sofa.id, devices.Sofa.sku, "Sofa", true);
          await setLightPower(devices.TVLicht.id, devices.TVLicht.sku, "TvLicht", true);

          await setLightBrightness(devices.Nachttisch.id, devices.Nachttisch.sku, "Nachttisch", 10);
          await setLightBrightness(devices.Sofa.id, devices.Sofa.sku, "Sofa", 10);
          await setLightBrightness(devices.TVLicht.id, devices.TVLicht.sku, "TvLicht", 10);
          
          setTimeout(async () => {
            await setLightPower(devices.Nachttisch.id, devices.Nachttisch.sku, "Nachttisch", false);
            await setLightPower(devices.Sofa.id, devices.Sofa.sku, "Sofa", false);
            await setLightPower(devices.TVLicht.id, devices.TVLicht.sku, "TvLicht", false);
        }, 60000); 
    
        }

        } catch (err) {
        console.error("Not able to get status:", err);
      }
    }
  }
});


async function setLightPower(deviceId, sku, deviceName, on) {
  try {
    const response = await fetch("https://developer-api.govee.com/v1/devices/control", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Govee-API-Key": API_KEY
      },
      body: JSON.stringify({
        device: deviceId,
        model: sku, 
        cmd: {
          name: "turn",
          value: on ? "on" : "off"
        }
      })
    });

    const data = await response.json();
    console.log(`${deviceName} ${on ? "eingeschaltet" : "ausgeschaltet"}:`, data);
  } catch (err) {
    console.error(`Fehler beim Steuern von ${deviceName}:`, err);
  }
}

async function setLightBrightness(deviceId, sku, deviceName, brightness) {
  try {
    const response = await fetch("https://developer-api.govee.com/v1/devices/control", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Govee-API-Key": API_KEY
      },
      body: JSON.stringify({
        device: deviceId,
        model: sku,
        cmd: {
          name: "brightness",
          value: brightness // 0 bis 100
        }
      })
    });

    const data = await response.json();
    console.log(`${deviceName} Helligkeit auf ${brightness}% gesetzt:`, data);
  } catch (err) {
    console.error(`Fehler beim Dimmen von ${deviceName}:`, err);
  }
}



async function setLightColor(deviceId, sku, deviceName, r, g, b) {
  try {
    const response = await fetch("https://developer-api.govee.com/v1/devices/control", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Govee-API-Key": API_KEY
      },
      body: JSON.stringify({
        device: deviceId,
        model: sku,
        cmd: {
          name: "color",
          value: { r, g, b }
        }
      })
    });

    const data = await response.json();
    console.log(`${deviceName} Farbe gesetzt auf RGB(${r},${g},${b}):`, data);
  } catch (err) {
    console.error(`Fehler beim Steuern der Farbe von ${deviceName}:`, err);
  }
}


async function getLightStatus(deviceId, sku, deviceName) {
  const requestBody = {
    requestId: "1", // feste ID, reicht für Tests
    payload: {
      sku,
      device: deviceId,
    },
  };

  try {
    const response = await fetch("https://openapi.api.govee.com/router/api/v1/device/state", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Govee-API-Key": API_KEY,
      },
      body: JSON.stringify(requestBody),
    });

    const json = await response.json();

    if (!json.payload || !json.payload.capabilities) {
      console.warn(`Keine gültigen Daten für Device ${deviceId}`);
      return { power: false, brightness: 0, raw: json };
    }

    let power = false;
    let brightness = 0;

    json.payload.capabilities.forEach((cap) => {
      if (cap.type === "devices.capabilities.on_off" && cap.instance === "powerSwitch") {
        power = cap.state.value === 1 || cap.state.value === true;
      }
      if (cap.type === "devices.capabilities.range" && cap.instance === "brightness") {
        brightness = cap.state.value ?? 0;
      }
    });
    console.log(`Status ${deviceName}: Power=${power}, Brightness=${brightness}`);
    return { power, brightness, raw: json };
  } catch (err) {
    console.error(`Fehler beim Abrufen des Status von ${deviceId}:`, err);
    return { power: false, brightness: 0, raw: null };
  }
}

async function checkAllLights() {
  try {
    const status1 = await getLightStatus(devices.Nachttisch.id, devices.Nachttisch.sku, "Nachttisch");
    const nachttischStatus = status1.power;

    const status2 = await getLightStatus(devices.Sofa.id, devices.Sofa.sku, "Sofa");
    const sofaStatus = status2.power;

    const status3 = await getLightStatus(devices.TVLicht.id, devices.TVLicht.sku, "TvLicht");
    const tvLichtStatus = status3.power;

    let allLightStatus;
    if (!nachttischStatus && !sofaStatus && !tvLichtStatus) {
      console.log("All lights are off");
      return allLightStatus = false;
    } else {
      console.log("At least one light is on");
      return allLightStatus = true;
    }
  } catch (err) {
    console.error("Error, unable to get status", err);
  }
}
async function getTime() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  return { hours, minutes };
}

async function proofSleepMode() {
  try {
    const allLightsOn = await checkAllLights();
    const time = await getTime();
    if (!allLightsOn && (time.hours >= 16 || time.hours < 7)) {
      return true;
    } else {return false;}
} catch (err) {
  console.error("Error, unable to proof sleep mode", err);
}
}

