import * as SettingHandling from 'scripts/settinghandling';
import * as AccountHandling from 'scripts/accounthandling';

$('#start-nav-login-button').on('click', function() {
  $('#start-pane').toggleClass('hidden');
  $('#login-pane').toggleClass('hidden');
});

$('#login-nav-cancel-button').on('click', function() {
  $('#login-pane').toggleClass('hidden');
  $('#start-pane').toggleClass('hidden');
});

$('#channel-nav-logout-button').on('click', function() {
  // reloads the page
  location.reload();
});

$('#channel-nav-settings-button').on('click', function() {
  $('#channel-pane').toggleClass('hidden');
  $('#settings-pane').toggleClass('hidden');
});

$('#settings-nav-cancel-button').on('click', function() {
  SettingHandling.insertChannelData();
  $('#settings-pane').toggleClass('hidden');
  $('#channel-pane').toggleClass('hidden');
});

$('#settings-nav-ok-button').on('click', function() {
  SettingHandling.insertChannelData();
  $('#settings-pane').toggleClass('hidden');
  $('#channel-pane').toggleClass('hidden');
});

$('#settings-channel-button').on('click', function() {
  SettingHandling.insertChannelSettings();
  $('#settings-pane').toggleClass('hidden');
  $('#channelsettings-pane').toggleClass('hidden');
});

$('#settings-device-button').on('click', function() {
  SettingHandling.insertDeviceSettings();
  $('#settings-pane').toggleClass('hidden');
  $('#devicesettings-pane').toggleClass('hidden');
});

$('#settings-account-button').on('click', function() {
  SettingHandling.insertAccountSettings();
  $('#settings-pane').toggleClass('hidden');
  $('#accountsettings-pane').toggleClass('hidden');
});

$('#channelsettings-nav-ok-button').on('click', function() {
  $('#channelsettings-pane').toggleClass('hidden');
  $('#settings-pane').toggleClass('hidden');
  SettingHandling.collectChannelSettings();
});

$('#channelsettings-nav-cancel-button').on('click', function() {
  $('#channelsettings-pane').toggleClass('hidden');
  $('#settings-pane').toggleClass('hidden');
});

$('#devicesettings-nav-ok-button').on('click', function() {
  $('#devicesettings-pane').toggleClass('hidden');
  $('#settings-pane').toggleClass('hidden');
  SettingHandling.collectDeviceSettings();
});

$('#devicesettings-nav-cancel-button').on('click', function() {
  $('#devicesettings-pane').toggleClass('hidden');
  $('#settings-pane').toggleClass('hidden');
});

$('#accountsettings-nav-ok-button').on('click', function() {
  $('#accountsettings-pane').toggleClass('hidden');
  $('#settings-pane').toggleClass('hidden');
  SettingHandling.collectAccountSettings();
});

$('#accountsettings-nav-cancel-button').on('click', function() {
  $('#accountsettings-pane').toggleClass('hidden');
  $('#settings-pane').toggleClass('hidden');
});

$('#devicesettings-changekey-button').on('click', function() {
  AccountHandling.showCipherKey();
});
