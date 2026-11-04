#include <Bridge.h>
#include <Process.h>
#include "secrets.h"

const char* API_KEY = THINGSPEAK_API_KEY;

int ms_delay = 20000;

void setup() {
  Serial.begin(9600);
  delay(2000);
  Serial.println("starting");
  Bridge.begin();
  Serial.println("bridge ready");
}

void loop() {
  int value = analogRead(A0);

  Process p;
  p.begin("curl");
  p.addParameter("-s");
  p.addParameter(String("http://api.thingspeak.com/update?api_key=") + API_KEY + "&field1=" + String(value));
  p.run();

  Serial.print("exit code: ");
  Serial.println(p.exitValue());
  Serial.print("reply: ");
  while (p.available()) Serial.print((char)p.read());
  Serial.println();
  delay(ms_delay);
}