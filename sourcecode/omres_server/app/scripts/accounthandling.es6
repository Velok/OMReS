import * as App from 'scripts/app';
import * as SettingHandling from 'scripts/settinghandling';
$(window).on('App:loaded', function() {
  let socket = App.getSocket();
  let authenticated = false;

  $('#login-form').on('submit', function(ev) {
    ev.preventDefault();
    let email = $('#login-email-field').val();
    let password = $('#login-password-field').val();
    socket.emit('authentication', {email: email, password: password});
  });

  $('#register-form').on('submit', function(ev) {
    ev.preventDefault();
    let email = $('#start-register-email-field').val();
    let password = $('#start-register-password-field').val();
    socket.emit('register', {email: email, password: password});
  });

  socket.on('register', function(data) {
    console.log(data);
    alert(data.info);
  });

  socket.on('unauthorized', function(err){
    console.log(err);
    alert(err.message);
  });

  socket.on('authenticated', function() {
    console.log('successful login');
    SettingHandling.setSettings(function() {
      SettingHandling.insertChannelData();

      if(!authenticated) {
        $('#login-pane').toggleClass('hidden');
        $('#channel-pane').toggleClass('hidden');
      }
      authenticated = true;
    });
  });

});

//helperfunction getting cipherkey in console
export function showCipherKey() {
  let socket = App.getSocket();
  socket.emit('receiveCipherKey');
  socket.on('receiveCipherKey', function(data) {
    //logCipherKey
    let pre = '0x';
    let newString = '{';
    for(let byte of new Uint8Array(data)) {
      let value = byte.toString(16);
      newString = newString + pre + value + ',';
    }
    newString = newString.slice(0, -1);
    newString += '}';
    console.log(newString);
    socket.off('receiveCipherKey');
  });
}
