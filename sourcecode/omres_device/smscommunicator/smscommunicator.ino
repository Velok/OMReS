#include <GSM.h>

#define PINNUMBER ""

// initialize the library instances
GSM gsmAccess;
GSM_SMS sms;

// Array to hold the number a SMS is retreived from
char senderNumber[20];
const byte INPUT_PIN = 3;

void setup()
{
  // initialize serial communications and wait for port to open:
  Serial.begin(9600);

  Serial.println(F("SMS Messages Communicator"));

  // connection state
  boolean notConnected = true;

  // Start GSM connection
  while (notConnected)
  {
    if (gsmAccess.begin(PINNUMBER) == GSM_READY)
    notConnected = false;
    else
    {
      Serial.println(F("Not connected"));
      delay(1000);
    }
  }

  Serial.println(F("GSM initialized"));
}

void loop()
{
  bool sendFlag = false;
  char c;
  int value = analogRead(INPUT_PIN);
  if(value != 1023) {sendFlag = true;}


  if(!sendFlag) {
    // If there are any SMSs available()
    if (sms.available())
    {
      Serial.println("Message received from:");

      // Get remote number
      sms.remoteNumber(senderNumber, 20);
      Serial.println(senderNumber);

      // // An example of message disposal
      // // Any messages starting with # should be discarded
      // if (sms.peek() == '#')
      // {
      //   Serial.println("Discarded SMS");
      //   sms.flush();
      // }

      // Read message bytes and print them
      while (c = sms.read())
      Serial.print(c);

      Serial.println("\nEND OF MESSAGE");

      // Delete message from modem memory
      sms.flush();
      Serial.println("MESSAGE DELETED");
    }
    delay(1000);
  }
  else {
    Serial.print("Enter a mobile number: ");
    char remoteNum[20];  // telephone number to send sms
    readSerial(remoteNum);
    Serial.println(remoteNum);

    // sms text
    Serial.print("Now, enter SMS content: ");
    char txtMsg[200];
    readSerial(txtMsg);
    Serial.println("SENDING");
    Serial.println();
    Serial.println("Message:");
    Serial.println(txtMsg);

    // send the message
    sms.beginSMS(remoteNum);
    sms.print(txtMsg);
    sms.endSMS();
    Serial.println("\nCOMPLETE!\n");
    sendFlag = false;
  }
}

// Read input serial
int readSerial(char result[]) {
  int i = 0;
  while (1) {
    while (Serial.available() > 0) {
      char inChar = Serial.read();
      if (inChar == '\n') {
        result[i] = '\0';
        Serial.flush();
        return 0;
      }
      if (inChar != '\r') {
        result[i] = inChar;
        i++;
      }
    }
  }
}
