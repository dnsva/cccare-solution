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
// All times in ms
unsigned long uploadInterval = 20000;
unsigned long signalTimeout = 10000;
int sensorRetryDelay = 50;
const char* API_KEY = THINGSPEAK_API_KEY;

unsigned long lastUploadTime = 0;
unsigned long lastValidTime = 0;

const int maxReadings = 5;
int readingsCount = 0;
unsigned int heartRateReadings[maxReadings];

float smoothedHeartRate = -1; // Variable to store trimmed mean of past 5 heart rate readings
bool skipNextReading = false;

void setup() {
  Serial.begin(115200);
  Wire.begin(); // Enable I2C (SDA: A4, SCL: A5)
  Serial.println("Connecting to WiFi shield...");
  Bridge.begin();
  Serial.println("Shield ready");

  // If sensor fails to initialize, print an error message
  while (!particleSensor.begin()) {
    Serial.println("MAX30102 not found!");
    delay(200);
  }

  Serial.println("MAX30102 ready");

  // MAX30102 settings, selected by testing (see README).
  // Effective output rate = sample rate / averaging, and must stay 25 Hz:
  // the library's heart-rate calculation requires it. Change both together.
  const uint8_t LED_BRIGHTNESS = 20;

  particleSensor.sensorConfiguration(LED_BRIGHTNESS, SAMPLEAVG_16, MODE_MULTILED,
                                    SAMPLERATE_400, PULSEWIDTH_215, ADCRANGE_2048);

  Serial.println("Starting loop");
}

// Creates a function to programatically send data to the ThingSpeak service to be accessed by the website
void sendToThingSpeak(String apiKey, String field, String data) {
    Process p;
    p.begin("curl");
    p.addParameter("-s");

    // Defines the specific channel (destination) to send data to using the API key, the field to send to, and the data itself
    p.addParameter(String("http://api.thingspeak.com/update?api_key=") + apiKey + "&" + field + "=" + data);
    p.run();

    // Prints the exit code and reply to determine if data was sent properly (no reply value = likely invalid)
    Serial.print("exit code: ");
    Serial.println(p.exitValue());
    Serial.print("reply: ");
    while (p.available()) Serial.print((char)p.read());
    Serial.println();
    Serial.println("value: " + data);
}

// Calculates the mean of all values besides the highest and lowest in an array
float calculateTrimmedMean(const unsigned int readings[], unsigned int length) {
    if (length < 3) {
      return -1;
    }

    // Sorts the array to easily find max and min value
    unsigned int sorted[length];
    for (unsigned int i = 0; i < length; i++) {
        sorted[i] = readings[i];
    }

    std::sort(sorted, sorted + length);

    unsigned int sum = 0;

    // Loops through every value in the array except the first and last to find trimmed sum
    for (unsigned int i = 1; i < length - 1; i++) {
        sum += sorted[i];
    }

    // Returns trimmed mean
    return (float)sum / (length - 2);
}


void loop() {
  // Reads the heart rate with the MAX30102
  particleSensor.heartrateAndOxygenSaturation(&spo2, &spo2Valid, &heartRate, &heartRateValid);

  // If a reading has recently been sent, the new reading may be innacurate due to timing issues, so it is discarded
  if (skipNextReading) {
    skipNextReading = false;
    return;
  }

  if (!heartRateValid) {
    Serial.println("Invalid input, retrying...");
    delay(sensorRetryDelay);
  }
  else {
    Serial.print("New heart rate: ");
    Serial.println(heartRate);

    // Shift entries in array of last 5 readings down to make room for new reading
    for (int i = maxReadings - 1; i > 0; i--) {
      heartRateReadings[i] = heartRateReadings[i - 1];
    }

    if (readingsCount < maxReadings) {
      readingsCount++;
    }

    // Add new reading to freed up slot in heartRateReadings array
    heartRateReadings[0] = heartRate;

    smoothedHeartRate = calculateTrimmedMean(heartRateReadings, readingsCount);

    Serial.print("Calculated (smoothed) heart rate: ");
    Serial.println(smoothedHeartRate);

    lastValidTime = millis();
  }

  // If it has been long enough since the last upload and the data is valid, send new heart rate data to ThingSpeak
  if (millis() - lastUploadTime >= uploadInterval && millis() - lastValidTime < signalTimeout && smoothedHeartRate >= 0) {
    lastUploadTime = millis();
    sendToThingSpeak(API_KEY, "field1", String(smoothedHeartRate));
    skipNextReading = true;
  }
}