#include <algorithm>
#include <Wire.h>
#include <Bridge.h>
#include <Process.h>
#include <DFRobot_MAX30102.h>
#include "secrets.h"


DFRobot_MAX30102 particleSensor;
int32_t SPO2;
int32_t heartRate;
int8_t SPO2Valid;
int8_t heartRateValid;
unsigned long uploadInterval = 20000;
int sensorRetryDelay = 50;
const char* API_KEY = THINGSPEAK_API_KEY;

unsigned long previousUploadTime = 0;

const int numReadings = 5;
unsigned int heartRateReadings[numReadings];

void setup() {
  Serial.begin(115200);
  Wire.begin(); // Enable I2C (SDA: A4, SCL: A5)
  Bridge.begin();

  // If sensor fails to initialize, print an error message
  while (!particleSensor.begin()) {
    Serial.println("MAX30102 not found!");
    delay(200);
  }
  particleSensor.sensorConfiguration(60, SAMPLEAVG_8, MODE_MULTILED, SAMPLERATE_400, PULSEWIDTH_411,ADCRANGE_16384);
}


void sendData(String apiKey, String field, String data) {
    Process p;
    p.begin("curl");
    p.addParameter("-s");

    p.addParameter(String("http://api.thingspeak.com/update?api_key=") + apiKey + "&" + field + "=" + data);
    p.run();

    Serial.print("exit code: ");
    Serial.println(p.exitValue());
    Serial.print("reply: ");
    while (p.available()) Serial.print((char)p.read());
    Serial.println();
    Serial.println("value: " + data);
}


float calculateHeartRateFromData(unsigned int readings[], unsigned int length) {
    if (length < 3) {
      return 0;
    }

    std::sort(readings, readings + length);

    unsigned int sum = 0;

    for (int i = 1; i < length - 1; i++) {
        sum += readings[i];
    }

    return (float)sum / (length - 2);
}


void loop() {
  particleSensor.heartrateAndOxygenSaturation(&SPO2, &SPO2Valid, &heartRate, &heartRateValid);

  if (millis() - previousUploadTime >= uploadInterval && heartRateValid) {
    previousUploadTime = millis();
    
    sendData(API_KEY, "field1", String(heartRate));
  }

  if (!heartRateValid) {
    Serial.println("Invalid input, retrying...");
    delay(sensorRetryDelay);
  }
  else {
    for (int i = 0; i < numReadings - 1; i++) {
      heartRateReadings[i + 1] = heartRateReadings[i];
    }

    heartRateReadings[0] = heartRate;

    Serial.println(calculateHeartRateFromData(heartRateReadings, numReadings));
  }
}