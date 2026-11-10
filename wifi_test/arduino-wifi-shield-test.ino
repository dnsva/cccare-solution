#include <DFRobot_MAX30102.h>
#include <Wire.h>
#include <Bridge.h>
#include <Process.h>
#include "secrets.h"


DFRobot_MAX30102 particleSensor;
int32_t SPO2;
int32_t heartRate;
int8_t SPO2Valid;
int8_t heartRateValid;
int ms_delay = 20000;
const char* API_KEY = THINGSPEAK_API_KEY;

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


void loop() {
  particleSensor.heartrateAndOxygenSaturation(&SPO2,&SPO2Valid, &heartRate, &heartRateValid);

  if (heartRateValid) {
    Process p;
    p.begin("curl");
    p.addParameter("-s");

    p.addParameter(String("http://api.thingspeak.com/update?api_key=") + API_KEY + "&field1=" + String(heartRate));
    p.run();

    Serial.print("exit code: ");
    Serial.println(p.exitValue());
    Serial.print("reply: ");
    while (p.available()) Serial.print((char)p.read());
    Serial.println();
    delay(ms_delay);
  } else {
    Serial.println("Invalid input, retrying...");
  }
}