#include <algorithm>
#include <Wire.h>
#include <Bridge.h>
#include <Process.h>
#include <DFRobot_MAX30102.h>
#include "secrets.h"


DFRobot_MAX30102 particleSensor;
int32_t spo2;
int32_t heartRate;
int8_t spo2Valid;
int8_t heartRateValid;
unsigned long uploadInterval = 20000;
unsigned long signalTimeout = 10000;
int sensorRetryDelay = 50;
const char* API_KEY = THINGSPEAK_API_KEY;

unsigned long lastUploadTime = 0;
unsigned long lastValidTime = 0;

const int maxReadings = 5;
int readingsCount = 0;
unsigned int heartRateReadings[maxReadings];

float smoothedHeartRate = -1;

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


void sendToThingSpeak(String apiKey, String field, String data) {
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


float calculateTrimmedMean(const unsigned int readings[], unsigned int length) {
    if (length < 3) {
      return -1;
    }

    unsigned int sorted[length];
    for (unsigned int i = 0; i < length; i++) {
        sorted[i] = readings[i];
    }

    std::sort(sorted, sorted + length);

    unsigned int sum = 0;

    for (unsigned int i = 1; i < length - 1; i++) {
        sum += sorted[i];
    }

    return (float)sum / (length - 2);
}


void loop() {
  particleSensor.heartrateAndOxygenSaturation(&spo2, &spo2Valid, &heartRate, &heartRateValid);

  if (millis() - lastUploadTime >= uploadInterval && millis() - lastValidTime < signalTimeout && smoothedHeartRate >= 0) {
    lastUploadTime = millis();
    sendToThingSpeak(API_KEY, "field1", String(smoothedHeartRate));
  }

  if (!heartRateValid) {
    Serial.println("Invalid input, retrying...");
    delay(sensorRetryDelay);
  }
  else {
    Serial.print("New heart rate: ");
    Serial.println(heartRate);

    for (int i = maxReadings - 1; i > 0; i--) {
      heartRateReadings[i] = heartRateReadings[i - 1];
    }

    if (readingsCount < maxReadings) {
      readingsCount++;
    }

    heartRateReadings[0] = heartRate;

    smoothedHeartRate = calculateTrimmedMean(heartRateReadings, readingsCount);

    Serial.print("Calculated (smoothed) heart rate: ");
    Serial.println(smoothedHeartRate);

    lastValidTime = millis();
  }
}