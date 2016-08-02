import * as App from 'scripts/app';

let settings = {};
settings.device = {};
settings.account = {};
settings.channel = [];

export function setSettings(callback) {
  let socket = App.getSocket();

  socket.emit('receiveSettings');
  socket.on('receiveSettings', function(data) {
    settings = data;
    console.log(settings);
    //remove listener after one time (because every function-call would instanciate another listener)
    socket.off('receiveSettings');
    return callback();
  });
}

function storeSettings() {
  let socket = App.getSocket();

  socket.emit('storeSettings', settings);
  socket.on('storeSettings', function(res) {
    console.log(res);
    alert(res.info);
    socket.off('storeSettings');
  });
}

export function insertChannelSettings() {
  for(let i = 1; i <= App.CHANNELS; i++) {
    let channel = settings.channel[i - 1];
    let cstr = `#channelsettings-channel${i}-`;
    let qstr;

    qstr = cstr + 'active-checkbox';
    assignSwitchState(qstr, channel.active);

    qstr = cstr + 'outputlabel-value';
    $(qstr).val(channel.outputLabel);

    qstr = cstr + 'inputlabel-value';
    $(qstr).val(channel.inputLabel);

    qstr = cstr + 'unitname-value';
    $(qstr).val(channel.unitName);

    qstr = cstr + 'triggermode-value';
    $(qstr).val(channel.triggerMode);

    qstr = cstr + 'lowtrigger-value';
    $(qstr).val(channel.lowTriggerValue);

    qstr = cstr + 'hightrigger-value';
    $(qstr).val(channel.highTriggerValue);

    qstr = cstr + 'unitfactor-value';
    $(qstr).val(channel.unitFactor);

    qstr = cstr + 'unitoffset-value';
    $(qstr).val(channel.unitOffset);
  }
}

export function collectChannelSettings() {
  let channelSettings = [];
  for(let i = 1; i <= App.CHANNELS; i++) {
    let channel = {};
    let cstr = `#channelsettings-channel${i}-`;
    let qstr;

    qstr = cstr + 'active-checkbox';
    channel.active = collectSwitchState(qstr);

    qstr = cstr + 'outputlabel-value';
    channel.outputLabel = $(qstr).val();

    qstr = cstr + 'inputlabel-value';
    channel.inputLabel = $(qstr).val();

    qstr = cstr + 'unitname-value';
    channel.unitName = $(qstr).val();

    qstr = cstr + 'triggermode-value';
    channel.triggerMode = parseInt($(qstr).val(), 10);

    qstr = cstr + 'lowtrigger-value';
    channel.lowTriggerValue = parseInt($(qstr).val(), 10);

    qstr = cstr + 'hightrigger-value';
    channel.highTriggerValue = parseInt($(qstr).val(), 10);

    qstr = cstr + 'unitfactor-value';
    channel.unitFactor = parseFloat($(qstr).val());

    qstr = cstr + 'unitoffset-value';
    channel.unitOffset = parseFloat($(qstr).val());

    channelSettings.push(channel);
  }
  settings.channel = channelSettings;
  storeSettings();
}

export function insertDeviceSettings() {
  let cstr = `#devicesettings-`;
  let qstr;

  qstr = cstr + 'sendinterval-value';
  $(qstr).val(settings.device.sendInterval);

  qstr = cstr + 'errorinterval-value';
  $(qstr).val(settings.device.errorInterval);

  qstr = cstr + 'errorcount-value';
  $(qstr).val(settings.device.errorCount);

  qstr = cstr + 'notifications-checkbox';
  assignSwitchState(qstr, settings.device.notifications);
}

export function collectDeviceSettings() {
  let deviceSettings = {};
  let cstr = `#devicesettings-`;
  let qstr;

  qstr = cstr + 'sendinterval-value';
  deviceSettings.sendInterval = parseInt($(qstr).val(), 10);

  qstr = cstr + 'errorinterval-value';
  deviceSettings.errorInterval = parseInt($(qstr).val(), 10);

  qstr = cstr + 'errorcount-value';
  deviceSettings.errorCount = parseInt($(qstr).val(), 10);

  qstr = cstr + 'notifications-checkbox';
  deviceSettings.notifications = collectSwitchState(qstr);

  settings.device = deviceSettings;
  storeSettings();
}

export function insertAccountSettings() {
  let cstr = `#accountsettings-`;
  let qstr;

  qstr = cstr + 'email-value';
  $(qstr).val(settings.account.email);
}

export function collectAccountSettings() {
  let accountSettings = {};
  let cstr = `#accountsettings-`;
  let qstr;

  settings.account = accountSettings;
  storeSettings();
}

export function insertChannelData() {
  for(let i = 1; i <= App.CHANNELS; i++) {
    let channel = settings.channel[i - 1];
    let cstr = `#channel-output${i}-`;
    let qstr;

    qstr = cstr + 'row';
    assignVisibleState(qstr, channel.active);

    qstr = cstr + 'label';
    $(qstr).text(channel.outputLabel);

    cstr = `#channel-input${i}-`;

    qstr = cstr + 'row';
    assignVisibleState(qstr, channel.active);

    qstr = cstr + 'label';
    $(qstr).text(channel.inputLabel);

    qstr = cstr + 'unit';
    $(qstr).text(channel.unitName);
  }
}


/* HELPER FUNCTIONS */

function assignVisibleState(querystring, state) {
  if(state === 0) {
    $(querystring).addClass('hidden');
  }
  else {
    $(querystring).removeClass('hidden');
  }
}

function assignSwitchState(queryString, state) {
  if(state === 0) {state = false;}
  if(state === 1) {state = true;}
  $(queryString).bootstrapSwitch('state', state);
}

function collectSwitchState(queryString) {
  let state = $(queryString).is(':checked');
  //change statevalue because mysql cant handle bools
  if(state === false) {state = 0;}
  if(state === true) {state = 1;}
  return state;
}
