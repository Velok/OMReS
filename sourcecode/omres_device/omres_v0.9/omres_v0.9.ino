// libraries
// #include <SPI.h> //ETH
// #include <Ethernet2.h> //ETH
#include <GSM.h> //GSM
#include <AESLib.h>
#include <avr/wdt.h>
#include <EEPROM.h>

// constants and globals
#define PINNUMBER "" // replace with pincode of your SIM Card //GSM
// byte mac[] = {}; //ETH
#define GPRS_APN "gprs.swisscom.ch" // replace your GPRS APN //GSM
#define GPRS_LOGIN "gprs" // replace with your GPRS login //GSM
#define GPRS_PASSWORD "gprs" // replace with your GPRS password //GSM
#define ID "" // replace with your account id
const byte CIPHER_KEY[16] = {};


const char SERVER_HOST[] = "gneak.gotdns.ch"; // replace with IP or hostname of your Server
const byte PAYLOAD_MAX = 48;

// // the digital output pins
const byte OUTPUT_PIN1 = 5;
const byte OUTPUT_PIN2 = 6;
const byte OUTPUT_PIN3 = 8;
const byte OUTPUT_PIN4 = 9;
const byte OUTPUT_PIN5 = 0;
const byte OUTPUT_PIN6 = 1;

// the analog input pins
const byte INPUT_PIN1 = 0;
const byte INPUT_PIN2 = 1;
const byte INPUT_PIN3 = 2;
const byte INPUT_PIN4 = 3;
const byte INPUT_PIN5 = 3;
const byte INPUT_PIN6 = 3;

// the status outputs
const byte STATUS_PIN1 = 18;
const byte STATUS_PIN2 = 19;

byte responsePosition = 0; // the position in the payloadBuffer array
byte noResponseCount = 0; //when are no response is received count up
bool hasResponse = false; // is set to true when the chars of the payload are read
bool blank = true; // test if the line reading is blank
bool sendLock = false; //message sending is locked until the end of the response
unsigned long previousMillis = 0; // help value for time measuring

byte payloadBuffer[PAYLOAD_MAX];
byte inputValueBuffer[18];
byte initialVector[16];
unsigned int sendCounter = 1; //debug

struct channel {
  int lowTriggerValue; // when the output is set off
  int highTriggerValue; // when the output is set on
  byte triggerMode; // behaviour of the trigger
  byte outputMode; // 0 = auto, 1 = set off, 2 = set on
  byte outputModePos; // the position in the payloadBuffer Array
  byte outputStatusPos; // the position in the inputValueBuffer Array
} channel1, channel2, channel3, channel4, channel5, channel6;

unsigned long sendInterval;
unsigned long errorInterval;
byte maxErrorCount;

// initialize the library instances
// EthernetClient client; //ETH
GSMClient client; //GSM
GPRS gprs; //GSM
GSM gsmAccess; //GSM

void setup() {
  bool notConnected = true; //GSM

  pinMode(OUTPUT_PIN1, OUTPUT);
  pinMode(OUTPUT_PIN2, OUTPUT);
  pinMode(OUTPUT_PIN3, OUTPUT);
  pinMode(OUTPUT_PIN4, OUTPUT);
  pinMode(OUTPUT_PIN5, OUTPUT);
  pinMode(OUTPUT_PIN6, OUTPUT);

  pinMode(STATUS_PIN1, OUTPUT);
  pinMode(STATUS_PIN2, OUTPUT);

  digitalWrite(OUTPUT_PIN1, LOW);
  digitalWrite(OUTPUT_PIN2, LOW);
  digitalWrite(OUTPUT_PIN3, LOW);
  digitalWrite(OUTPUT_PIN4, LOW);
  digitalWrite(OUTPUT_PIN5, LOW);
  digitalWrite(OUTPUT_PIN6, LOW);

  digitalWrite(STATUS_PIN1, LOW);
  digitalWrite(STATUS_PIN2, LOW);

  channel1.outputStatusPos = 2;
  channel2.outputStatusPos = 5;
  channel3.outputStatusPos = 8;
  channel4.outputStatusPos = 11;
  channel5.outputStatusPos = 14;
  channel6.outputStatusPos = 17;

  channel1.outputModePos = 33;
  channel2.outputModePos = 34;
  channel3.outputModePos = 35;
  channel4.outputModePos = 36;
  channel5.outputModePos = 37;
  channel6.outputModePos = 38;

  Serial.begin(9600);
  Serial.print(F("\n.."));

  // handleAnalogValues(); //ETH
  // if (Ethernet.begin(mac) == 0) { //ETH
    // Serial.println(F("dhcp f")); //ETH
    // blinkLED(STATUS_PIN1, 4, 150, false); //ETH
    // Ethernet.begin(mac, 80); //ETH
  // } //ETH
  // delay(1000); //ETH
  // Serial.println(F("eth s")); //ETH
  // blinkLED(STATUS_PIN1, 1, 250, true); //ETH

  while(notConnected) { //GSM
    handleAnalogValues();
    if ((gsmAccess.begin(PINNUMBER) == GSM_READY) & //GSM
        (gprs.attachGPRS(GPRS_APN, GPRS_LOGIN, GPRS_PASSWORD) == GPRS_READY)) { //GSM
      notConnected = false; //GSM
    } //GSM
    else { //GSM
      Serial.print(F("\ngsm f")); //GSM
      blinkLED(STATUS_PIN1, 4, 150, false); //GSM
      delay(1000); //GSM
    } //GSM
  } //GSM
  Serial.print(F("\ngsm s")); //GSM
  blinkLED(STATUS_PIN1, 1, 250, true); //GSM

  // repair values in EEPROM if something wrong was saved in it
  repairEEPROM();
  // load stored values from EEPROM to the payloadBuffer and load the config from it
  for(int i = 0; i < PAYLOAD_MAX; i++) {
    payloadBuffer[i] = EEPROM.read(i);
  }
  handleConfigData();

  // set outputStatus
  inputValueBuffer[2] = payloadBuffer[33];
  inputValueBuffer[5] = payloadBuffer[34];
  inputValueBuffer[8] = payloadBuffer[35];
  inputValueBuffer[11] = payloadBuffer[36];
  inputValueBuffer[14] = payloadBuffer[37];
  inputValueBuffer[17] = payloadBuffer[38];

  sendMessage();
  sendLock = true;
}

void loop() {
  // only send messages when the response has correctly arrived
  if(millis() - previousMillis >= sendInterval && !sendLock) {
    sendMessage();
  }

  if(noResponseCount == maxErrorCount) {
    softwareReset(WDTO_60MS);
  }

  // if after # seconds no response arrived
  if(millis() - previousMillis >= errorInterval && sendLock) {
    noResponseCount++;
    Serial.print(F("\nRETRY! ")); //debug
    Serial.print(noResponseCount);
    blinkLED(STATUS_PIN2, 2, 250, false);
    sendMessage();
  }


  if (client.available()) {
    unsigned int data;
    // store the responding bytes to iV & payloadBuffer (see documentation for data structure)
    if(hasResponse) {
      data = client.read();
      if(responsePosition < 16) {
        initialVector[responsePosition] = data;
      }
      else {
        payloadBuffer[responsePosition - 16] = data;
      }
      responsePosition++;
    }

    if(!hasResponse) {
      data = client.read();

      // payload begins after a blank line
      if (data == 0x0A && blank) {
        hasResponse = true;
        responsePosition = 0;
        return;
      }
      else {blank = false;}

      if(data == 0x0A) {
        data = client.read();
        if(data == 0x0D) {blank = true;}
      }
    }
  }

  // after the complete response is buffered
  if(!client.available() && !client.connected() && hasResponse) {
    hasResponse = false;
    responsePosition = 0;
    sendCounter++;
    readResponse();
  }
  handleAnalogValues();
}

//function declarations
void sendMessage() {
  digitalWrite(STATUS_PIN1, HIGH);
  digitalWrite(STATUS_PIN2, HIGH);
  client.flush();
  client.stop();
  handleAnalogValues();

  // fill buffer with array position values
  for(int i = 0; i < PAYLOAD_MAX; i++) {
    payloadBuffer[i] = i + 16;
  }

  // copy inputValues to payloadBuffer (see documentation for data structure)
  for(int i = 1; i <= sizeof(inputValueBuffer); i++) {
    if(i < 16) {
      payloadBuffer[i] = inputValueBuffer[i - 1];
    }
    else {
      payloadBuffer[i + 1] = inputValueBuffer[i - 1];
    }
  }

  printCounter();
  printHex(payloadBuffer, PAYLOAD_MAX);

  if(client.connect(SERVER_HOST, 80)) {
    Serial.print(F("\nconn s"));
    client.print(F("POST /remote/"));
    client.print(F(ID));
    client.println(F(" HTTP/1.1"));
    client.print(F("Host: "));
    client.println(SERVER_HOST);
    client.println(F("Content-Type: application/octet-stream"));
    client.print(F("Content-Length: "));
    client.println(PAYLOAD_MAX + 16); // the payload + the initialVector
    client.println();
    // generate and send initialVector
    generateInitialVector();
    for(int i = 0; i < 16; i++) {
      client.write(initialVector[i]);
    }
    // send encrypted payload
    encrypt();
    for(int i = 0; i < PAYLOAD_MAX; i++) {
      client.write(payloadBuffer[i]);
    }
  }
  else {
    Serial.print(F("\nconn f")); //debug
  }
  digitalWrite(STATUS_PIN1, LOW);
  previousMillis = millis();
  sendLock = true;
  resetOutputStatus();
}

void readResponse() {
  digitalWrite(STATUS_PIN1, HIGH);
  Serial.print(F("\nENC:")); //debug
  printHex(payloadBuffer, PAYLOAD_MAX);
  decrypt();
  // validation of response data
  if(validateResponse() == -1) {
    Serial.print(F("\nERROR!!:")); //debug
  }
  else {
    noResponseCount = 0;
    // update EEPROM
    int written = updateEEPROM();
    Serial.print(F("\nWRITTEN:"));
    Serial.print(written);
    handleConfigData();
    Serial.print(F("\nRES:")); //debug
    sendLock = false;
  }
  printHex(payloadBuffer, PAYLOAD_MAX); //debug
  digitalWrite(STATUS_PIN1, LOW);
  digitalWrite(STATUS_PIN2, LOW);
  previousMillis = millis();
}

int updateEEPROM() {
  int written = 0;
  byte value = 0;

  for(int i = 0; i < PAYLOAD_MAX; i++) {
    value = EEPROM.read(i);
    if(payloadBuffer[i] != value) {
      if(i >= 33 && i <= 38 && payloadBuffer[i] == 0) {
        continue;
      }
      written++;
      EEPROM.write(i, payloadBuffer[i]);
    }
  }
  return written;
}

void repairEEPROM() {
  if(EEPROM.read(0) != 16) {EEPROM.write(0, 16);}
  if(EEPROM.read(16) != 32) {EEPROM.write(16, 32);}
  if(EEPROM.read(32) != 48) {EEPROM.write(32, 48);}

  for(int i = 33; i <= 38; i++) {
    if(EEPROM.read(i) > 2) {EEPROM.write(i, 2);}
  }
}

void updateEEPROMOutputStatus(byte state, channel channel) {
  byte modePos = channel.outputModePos;
  byte value = EEPROM.read(modePos);
  if(value != state) {
    Serial.println(F("\n updated OutputStatus"));
    EEPROM.write(modePos, state);
  }
}

// save values from payloadBuffer and set outputs
void handleConfigData() {
  channel1.lowTriggerValue = (int)payloadBuffer[1] << 8;
  channel1.lowTriggerValue |= (int)payloadBuffer[2];
  channel1.highTriggerValue = (int)payloadBuffer[3] << 8;
  channel1.highTriggerValue |= (int)payloadBuffer[4];
  channel1.triggerMode = payloadBuffer[5];

  channel2.lowTriggerValue = (int)payloadBuffer[6] << 8;
  channel2.lowTriggerValue |= (int)payloadBuffer[7];
  channel2.highTriggerValue = (int)payloadBuffer[8] << 8;
  channel2.highTriggerValue |= (int)payloadBuffer[9];
  channel2.triggerMode = payloadBuffer[10];

  channel3.lowTriggerValue = (int)payloadBuffer[11] << 8;
  channel3.lowTriggerValue |= (int)payloadBuffer[12];
  channel3.highTriggerValue = (int)payloadBuffer[13] << 8;
  channel3.highTriggerValue |= (int)payloadBuffer[14];
  channel3.triggerMode = payloadBuffer[15];

  channel4.lowTriggerValue = (int)payloadBuffer[17] << 8;
  channel4.lowTriggerValue |= (int)payloadBuffer[18];
  channel4.highTriggerValue = (int)payloadBuffer[19] << 8;
  channel4.highTriggerValue |= (int)payloadBuffer[20];
  channel4.triggerMode = payloadBuffer[21];

  channel5.lowTriggerValue = (int)payloadBuffer[22] << 8;
  channel5.lowTriggerValue |= (int)payloadBuffer[23];
  channel5.highTriggerValue = (int)payloadBuffer[24] << 8;
  channel5.highTriggerValue |= (int)payloadBuffer[26];
  channel5.triggerMode = payloadBuffer[26];

  channel6.lowTriggerValue = (int)payloadBuffer[27] << 8;
  channel6.lowTriggerValue |= (int)payloadBuffer[28];
  channel6.highTriggerValue = (int)payloadBuffer[29] << 8;
  channel6.highTriggerValue |= (int)payloadBuffer[30];
  channel6.triggerMode = payloadBuffer[31];

  channel1.outputMode = payloadBuffer[33];
  channel2.outputMode = payloadBuffer[34];
  channel3.outputMode = payloadBuffer[35];
  channel4.outputMode = payloadBuffer[36];
  channel5.outputMode = payloadBuffer[37];
  channel6.outputMode = payloadBuffer[38];

  sendInterval = (unsigned long)payloadBuffer[39] << 24;
  sendInterval |= (unsigned long)payloadBuffer[40] << 16;
  sendInterval |= (unsigned long)payloadBuffer[41] << 8;
  sendInterval |= (unsigned long)payloadBuffer[42];
  errorInterval = (unsigned long)payloadBuffer[43] << 24;
  errorInterval |= (unsigned long)payloadBuffer[44] << 16;
  errorInterval |= (unsigned long)payloadBuffer[45] << 8;
  errorInterval |= (unsigned long)payloadBuffer[46];
  maxErrorCount = payloadBuffer[47];

  // minimum value for errorInterval
  if(errorInterval <= 4000) {errorInterval = 4000;}

  // minimum value for maxErrorCount
  if(maxErrorCount <= 4) {maxErrorCount = 4;}

  setOutput(channel1, OUTPUT_PIN1);
  setOutput(channel2, OUTPUT_PIN2);
  setOutput(channel3, OUTPUT_PIN3);
  setOutput(channel4, OUTPUT_PIN4);
  setOutput(channel5, OUTPUT_PIN5);
  setOutput(channel6, OUTPUT_PIN6);
}

void encrypt() {
  aes128_cbc_enc(CIPHER_KEY, initialVector, (void *)payloadBuffer, PAYLOAD_MAX);
}

void decrypt() {
  aes128_cbc_dec(CIPHER_KEY, initialVector, (void *)payloadBuffer, PAYLOAD_MAX);
}

// validation of the data from the response (see documenation for data structure)
int validateResponse() {
  if (
    payloadBuffer[0] != 16 ||
    payloadBuffer[16] != 32 ||
    payloadBuffer[32] != 48 ||
    payloadBuffer[5] > 7 ||
    payloadBuffer[10] > 7 ||
    payloadBuffer[15] > 7 ||
    payloadBuffer[21] > 7 ||
    payloadBuffer[26] > 7 ||
    payloadBuffer[31] > 7
  ) {
    return -1;
  }

  for(int i = 33; i <= 38; i++) {
    if(payloadBuffer[i] > 2) {
      return -1;
    }
  }
  return 0;
}

void handleAnalogValues() {
  int value = 0;
  value = analogRead(INPUT_PIN1);
  inputValueBuffer[0] = highByte(value);
  inputValueBuffer[1] = lowByte(value);
  inputValueBuffer[2] = checkTrigger(value, channel1, OUTPUT_PIN1, inputValueBuffer[2]);

  value = analogRead(INPUT_PIN2);
  inputValueBuffer[3] = highByte(value);
  inputValueBuffer[4] = lowByte(value);
  inputValueBuffer[5] = checkTrigger(value, channel2, OUTPUT_PIN2, inputValueBuffer[5]);

  value = analogRead(INPUT_PIN3);
  inputValueBuffer[6] = highByte(value);
  inputValueBuffer[7] = lowByte(value);
  inputValueBuffer[8] = checkTrigger(value, channel3, OUTPUT_PIN3, inputValueBuffer[8]);

  value = analogRead(INPUT_PIN4);
  inputValueBuffer[9] = highByte(value);
  inputValueBuffer[10] = lowByte(value);
  inputValueBuffer[11] = checkTrigger(value, channel4, OUTPUT_PIN4, inputValueBuffer[11]);

  value = analogRead(INPUT_PIN5);
  inputValueBuffer[12] = highByte(value);
  inputValueBuffer[13] = lowByte(value);
  inputValueBuffer[14] = checkTrigger(value, channel5, OUTPUT_PIN5, inputValueBuffer[14]);

  value = analogRead(INPUT_PIN6);
  inputValueBuffer[15] = highByte(value);
  inputValueBuffer[16] = lowByte(value);
  inputValueBuffer[17] = checkTrigger(value, channel6, OUTPUT_PIN6, inputValueBuffer[17]);
}

byte checkTrigger(int value, channel channel, byte outputPin, byte lastStatus) {
  /* triggerModes:
  0 low not high not
  1 low off high on
  2 low not high on
  3 low off high not
  4 low on  high off
  5 low on  high not
  6 low not high off
  7 low on  high on

  returns:
  lastStatus if nothing triggered
  1 if output set off
  2 if output set on
  */

  bool lower = false;
  bool higher = false;
  byte outputStatus = lastStatus;

  if(value <= channel.lowTriggerValue) {lower = true;}
  if(value >= channel.highTriggerValue) {higher = true;}

  switch (channel.triggerMode) {
    case 0:
      break;
    case 1:
      if(lower) {outputStatus = 1;}
      else if(higher) {outputStatus = 2;}
      break;
    case 2:
      if(higher) {outputStatus = 2;}
      break;
    case 3:
      if(lower) {outputStatus = 1;}
      break;
    case 4:
      if(lower) {outputStatus = 2;}
      else if(higher) {outputStatus = 1;}
      break;
    case 5:
      if(lower) {outputStatus = 2;}
      break;
    case 6:
      if(higher) {outputStatus = 1;}
      break;
    case 7:
      if(lower) {outputStatus = 2;}
      else if(higher) {outputStatus = 2;}
      break;
  }

  if(outputStatus != lastStatus) {
    if(outputStatus == 1) {
      digitalWrite(outputPin, LOW);
      updateEEPROMOutputStatus(outputStatus, channel);
    }

    if(outputStatus == 2) {
      digitalWrite(outputPin, HIGH);
      updateEEPROMOutputStatus(outputStatus, channel);
    }
  }

  return outputStatus;
}

void setOutput(channel channel, byte outputPin) {
  /* outputModes:
  0 do not set
  1 set off
  2 set on
  */

  if(channel.outputMode == 1) {
    digitalWrite(outputPin, LOW);
    channel.outputMode = 0; // reset after once set off
  }
  else if(channel.outputMode == 2) {
    digitalWrite(outputPin, HIGH);
    channel.outputMode = 0; // reset after once set on
  }
}

void resetOutputStatus() {
  inputValueBuffer[2] = 0;
  inputValueBuffer[5] = 0;
  inputValueBuffer[8] = 0;
  inputValueBuffer[11] = 0;
  inputValueBuffer[14] = 0;
  inputValueBuffer[17] = 0;
}

void generateInitialVector() {
  for(int i = 0; i < 16; i++) {
    initialVector[i] = (byte)random(255);
  }
}

void blinkLED(byte outputPin, byte times, int frequency, bool endStatus) {
  digitalWrite(outputPin, LOW);
  for(int i = 0; i < 2 * times; i++) {
    digitalWrite(outputPin, !digitalRead(outputPin));
    delay(frequency);
  }
  if(endStatus) {digitalWrite(outputPin, HIGH);}
}

void softwareReset( uint8_t prescaller) {
  // start watchdog with the provided prescaller
  wdt_enable(prescaller);
  // wait for the prescaller time to expire
  // without sending the reset signal by using
  // the wdt_reset() method
  while(1) {}
}

void printHex(byte *data, byte length) {
  for (int i=0; i<length; i++) {
    if (data[i] < 0x10) {Serial.print("0");}
    Serial.print(data[i],HEX);
    Serial.print(" ");
  }
}

void printCounter() {
  Serial.println();
  if(sendCounter < 10) {Serial.print("00");}
  else if(sendCounter < 100) {Serial.print("0");}
  Serial.print(sendCounter);
  Serial.print(F(":"));
}
