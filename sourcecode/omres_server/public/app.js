(function() {
  'use strict';

  var globals = typeof window === 'undefined' ? global : window;
  if (typeof globals.require === 'function') return;

  var modules = {};
  var cache = {};
  var aliases = {};
  var has = ({}).hasOwnProperty;

  var expRe = /^\.\.?(\/|$)/;
  var expand = function(root, name) {
    var results = [], part;
    var parts = (expRe.test(name) ? root + '/' + name : name).split('/');
    for (var i = 0, length = parts.length; i < length; i++) {
      part = parts[i];
      if (part === '..') {
        results.pop();
      } else if (part !== '.' && part !== '') {
        results.push(part);
      }
    }
    return results.join('/');
  };

  var dirname = function(path) {
    return path.split('/').slice(0, -1).join('/');
  };

  var localRequire = function(path) {
    return function expanded(name) {
      var absolute = expand(dirname(path), name);
      return globals.require(absolute, path);
    };
  };

  var initModule = function(name, definition) {
    var hot = null;
    hot = hmr && hmr.createHot(name);
    var module = {id: name, exports: {}, hot: hot};
    cache[name] = module;
    definition(module.exports, localRequire(name), module);
    return module.exports;
  };

  var expandAlias = function(name) {
    return aliases[name] ? expandAlias(aliases[name]) : name;
  };

  var _resolve = function(name, dep) {
    return expandAlias(expand(dirname(name), dep));
  };

  var require = function(name, loaderPath) {
    if (loaderPath == null) loaderPath = '/';
    var path = expandAlias(name);

    if (has.call(cache, path)) return cache[path].exports;
    if (has.call(modules, path)) return initModule(path, modules[path]);

    throw new Error("Cannot find module '" + name + "' from '" + loaderPath + "'");
  };

  require.alias = function(from, to) {
    aliases[to] = from;
  };

  var extRe = /\.[^.\/]+$/;
  var indexRe = /\/index(\.[^\/]+)?$/;
  var addExtensions = function(bundle) {
    if (extRe.test(bundle)) {
      var alias = bundle.replace(extRe, '');
      if (!has.call(aliases, alias) || aliases[alias].replace(extRe, '') === alias + '/index') {
        aliases[alias] = bundle;
      }
    }

    if (indexRe.test(bundle)) {
      var iAlias = bundle.replace(indexRe, '');
      if (!has.call(aliases, iAlias)) {
        aliases[iAlias] = bundle;
      }
    }
  };

  require.register = require.define = function(bundle, fn) {
    if (typeof bundle === 'object') {
      for (var key in bundle) {
        if (has.call(bundle, key)) {
          require.register(key, bundle[key]);
        }
      }
    } else {
      modules[bundle] = fn;
      delete cache[bundle];
      addExtensions(bundle);
    }
  };

  require.list = function() {
    var list = [];
    for (var item in modules) {
      if (has.call(modules, item)) {
        list.push(item);
      }
    }
    return list;
  };

  var hmr = globals._hmr && new globals._hmr(_resolve, require, modules, cache);
  require._cache = cache;
  require.hmr = hmr && hmr.wrap;
  require.brunch = true;
  globals.require = require;
})();

(function() {
var global = window;
var __makeRelativeRequire = function(require, mappings, pref) {
  var none = {};
  var tryReq = function(name, pref) {
    var val;
    try {
      val = require(pref + '/node_modules/' + name);
      return val;
    } catch (e) {
      if (e.toString().indexOf('Cannot find module') === -1) {
        throw e;
      }

      if (pref.indexOf('node_modules') !== -1) {
        var s = pref.split('/');
        var i = s.lastIndexOf('node_modules');
        var newPref = s.slice(0, i).join('/');
        return tryReq(name, newPref);
      }
    }
    return none;
  };
  return function(name) {
    if (name in mappings) name = mappings[name];
    if (!name) return;
    if (name[0] !== '.' && pref) {
      var val = tryReq(name, pref);
      if (val !== none) return val;
    }
    return require(name);
  }
};
require.register("scripts/accounthandling.es6", function(exports, require, module) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.showCipherKey = showCipherKey;

var _app = require('scripts/app');

var App = _interopRequireWildcard(_app);

var _settinghandling = require('scripts/settinghandling');

var SettingHandling = _interopRequireWildcard(_settinghandling);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

$(window).on('App:loaded', function () {
  var socket = App.getSocket();
  var authenticated = false;

  $('#login-form').on('submit', function (ev) {
    ev.preventDefault();
    var email = $('#login-email-field').val();
    var password = $('#login-password-field').val();
    socket.emit('authentication', { email: email, password: password });
  });

  $('#register-form').on('submit', function (ev) {
    ev.preventDefault();
    var email = $('#start-register-email-field').val();
    var password = $('#start-register-password-field').val();
    socket.emit('register', { email: email, password: password });
  });

  socket.on('register', function (data) {
    console.log(data);
    alert(data.info);
  });

  socket.on('unauthorized', function (err) {
    console.log(err);
    alert(err.message);
  });

  socket.on('authenticated', function () {
    console.log('successful login');
    SettingHandling.setSettings(function () {
      SettingHandling.insertChannelData();

      if (!authenticated) {
        $('#login-pane').toggleClass('hidden');
        $('#channel-pane').toggleClass('hidden');
      }
      authenticated = true;
    });
  });
});

//helperfunction getting cipherkey in console
function showCipherKey() {
  var socket = App.getSocket();
  socket.emit('receiveCipherKey');
  socket.on('receiveCipherKey', function (data) {
    //logCipherKey
    var pre = '0x';
    var newString = '{';
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = new Uint8Array(data)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var byte = _step.value;

        var value = byte.toString(16);
        newString = newString + pre + value + ',';
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator.return) {
          _iterator.return();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }

    newString = newString.slice(0, -1);
    newString += '}';
    console.log(newString);
    socket.off('receiveCipherKey');
  });
}
});

;require.register("scripts/app.es6", function(exports, require, module) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CHANNELS = undefined;
exports.getSocket = getSocket;

var _buttonhandling = require('scripts/buttonhandling');

var ButtonHandling = _interopRequireWildcard(_buttonhandling);

var _accounthandling = require('scripts/accounthandling');

var AccountHandling = _interopRequireWildcard(_accounthandling);

var _datahandling = require('scripts/datahandling');

var DataHandling = _interopRequireWildcard(_datahandling);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

var socket = io();

function getSocket() {
  return socket;
}
var CHANNELS = exports.CHANNELS = 6;

//initialisation
$('.bs-switch').bootstrapSwitch();
$('#start-pane').toggleClass('hidden');
// $('#channel-pane').toggleClass('hidden');
$(window).trigger('App:loaded');
});

require.register("scripts/buttonhandling.es6", function(exports, require, module) {
'use strict';

var _settinghandling = require('scripts/settinghandling');

var SettingHandling = _interopRequireWildcard(_settinghandling);

var _accounthandling = require('scripts/accounthandling');

var AccountHandling = _interopRequireWildcard(_accounthandling);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

$('#start-nav-login-button').on('click', function () {
  $('#start-pane').toggleClass('hidden');
  $('#login-pane').toggleClass('hidden');
});

$('#login-nav-cancel-button').on('click', function () {
  $('#login-pane').toggleClass('hidden');
  $('#start-pane').toggleClass('hidden');
});

$('#channel-nav-logout-button').on('click', function () {
  // reloads the page
  location.reload();
});

$('#channel-nav-settings-button').on('click', function () {
  $('#channel-pane').toggleClass('hidden');
  $('#settings-pane').toggleClass('hidden');
});

$('#settings-nav-cancel-button').on('click', function () {
  SettingHandling.insertChannelData();
  $('#settings-pane').toggleClass('hidden');
  $('#channel-pane').toggleClass('hidden');
});

$('#settings-nav-ok-button').on('click', function () {
  SettingHandling.insertChannelData();
  $('#settings-pane').toggleClass('hidden');
  $('#channel-pane').toggleClass('hidden');
});

$('#settings-channel-button').on('click', function () {
  SettingHandling.insertChannelSettings();
  $('#settings-pane').toggleClass('hidden');
  $('#channelsettings-pane').toggleClass('hidden');
});

$('#settings-device-button').on('click', function () {
  SettingHandling.insertDeviceSettings();
  $('#settings-pane').toggleClass('hidden');
  $('#devicesettings-pane').toggleClass('hidden');
});

$('#settings-account-button').on('click', function () {
  SettingHandling.insertAccountSettings();
  $('#settings-pane').toggleClass('hidden');
  $('#accountsettings-pane').toggleClass('hidden');
});

$('#channelsettings-nav-ok-button').on('click', function () {
  $('#channelsettings-pane').toggleClass('hidden');
  $('#settings-pane').toggleClass('hidden');
  SettingHandling.collectChannelSettings();
});

$('#channelsettings-nav-cancel-button').on('click', function () {
  $('#channelsettings-pane').toggleClass('hidden');
  $('#settings-pane').toggleClass('hidden');
});

$('#devicesettings-nav-ok-button').on('click', function () {
  $('#devicesettings-pane').toggleClass('hidden');
  $('#settings-pane').toggleClass('hidden');
  SettingHandling.collectDeviceSettings();
});

$('#devicesettings-nav-cancel-button').on('click', function () {
  $('#devicesettings-pane').toggleClass('hidden');
  $('#settings-pane').toggleClass('hidden');
});

$('#accountsettings-nav-ok-button').on('click', function () {
  $('#accountsettings-pane').toggleClass('hidden');
  $('#settings-pane').toggleClass('hidden');
  SettingHandling.collectAccountSettings();
});

$('#accountsettings-nav-cancel-button').on('click', function () {
  $('#accountsettings-pane').toggleClass('hidden');
  $('#settings-pane').toggleClass('hidden');
});

$('#devicesettings-changekey-button').on('click', function () {
  AccountHandling.showCipherKey();
});
});

require.register("scripts/datahandling.es6", function(exports, require, module) {
'use strict';

var _app = require('scripts/app');

var App = _interopRequireWildcard(_app);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

$(window).on('App:loaded', function () {
  var socket = App.getSocket();
  socket.on('updateOutputMode', function (data) {
    console.log(data);
    updateOutputMode(data.channel, data.mode);
  });

  $('.channel-output-btn').on('click', function () {
    var query = $(this);
    var mode = query.data('mode');
    var channel = query.data('channel-id');
    console.log(mode);

    switch (mode) {
      case 1:
        mode = 4;
        break;
      case 2:
        mode = 3;
        break;
      case 3:
        mode = 2;
        break;
      case 4:
        mode = 1;
        break;
      case 5:
        mode = 4;
        break;
      case 6:
        mode = 3;
        break;
    }

    updateOutputMode(channel, mode);
    socket.emit('storeOutputMode', { channel: channel, mode: mode });
  });

  socket.on('storeOutputMode', function (res) {
    console.log(res);
  });

  socket.on('updateAnalogValues', function (data) {
    //insertAnalogValues
    for (var i = 1; i <= data.length; i++) {
      var qstr = '#channel-input' + i + '-value';
      $(qstr).text(data[i - 1]);
    }
  });
});

function updateOutputMode(channel, mode) {
  var query = $('#channel-output' + channel + '-button');
  query.removeClass('btn-default btn-primary btn-success btn-warning');
  switch (mode) {
    case 1:
      query.text('AUS');
      query.addClass('btn-default');
      query.data('mode', 1);
      break;
    case 2:
      query.text('EIN');
      query.addClass('btn-success');
      query.data('mode', 2);
      break;
    case 3:
      query.text('AUS');
      query.addClass('btn-primary');
      query.data('mode', 3);
      break;
    case 4:
      query.text('EIN');
      query.addClass('btn-primary');
      query.data('mode', 4);
      break;
    case 5:
      query.text('AUS!');
      query.addClass('btn-warning');
      query.data('mode', 5);
      break;
    case 6:
      query.text('EIN!');
      query.addClass('btn-warning');
      query.data('mode', 6);
      break;
  }
}
});

;require.register("scripts/settinghandling.es6", function(exports, require, module) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.setSettings = setSettings;
exports.insertChannelSettings = insertChannelSettings;
exports.collectChannelSettings = collectChannelSettings;
exports.insertDeviceSettings = insertDeviceSettings;
exports.collectDeviceSettings = collectDeviceSettings;
exports.insertAccountSettings = insertAccountSettings;
exports.collectAccountSettings = collectAccountSettings;
exports.insertChannelData = insertChannelData;

var _app = require('scripts/app');

var App = _interopRequireWildcard(_app);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

var settings = {};
settings.device = {};
settings.account = {};
settings.channel = [];

function setSettings(callback) {
  var socket = App.getSocket();

  socket.emit('receiveSettings');
  socket.on('receiveSettings', function (data) {
    settings = data;
    console.log(settings);
    //remove listener after one time (because every function-call would instanciate another listener)
    socket.off('receiveSettings');
    return callback();
  });
}

function storeSettings() {
  var socket = App.getSocket();

  socket.emit('storeSettings', settings);
  socket.on('storeSettings', function (res) {
    console.log(res);
    alert(res.info);
    socket.off('storeSettings');
  });
}

function insertChannelSettings() {
  for (var i = 1; i <= App.CHANNELS; i++) {
    var channel = settings.channel[i - 1];
    var cstr = '#channelsettings-channel' + i + '-';
    var qstr = void 0;

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

function collectChannelSettings() {
  var channelSettings = [];
  for (var i = 1; i <= App.CHANNELS; i++) {
    var channel = {};
    var cstr = '#channelsettings-channel' + i + '-';
    var qstr = void 0;

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

function insertDeviceSettings() {
  var cstr = '#devicesettings-';
  var qstr = void 0;

  qstr = cstr + 'sendinterval-value';
  $(qstr).val(settings.device.sendInterval);

  qstr = cstr + 'errorinterval-value';
  $(qstr).val(settings.device.errorInterval);

  qstr = cstr + 'errorcount-value';
  $(qstr).val(settings.device.errorCount);

  qstr = cstr + 'notifications-checkbox';
  assignSwitchState(qstr, settings.device.notifications);
}

function collectDeviceSettings() {
  var deviceSettings = {};
  var cstr = '#devicesettings-';
  var qstr = void 0;

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

function insertAccountSettings() {
  var cstr = '#accountsettings-';
  var qstr = void 0;

  qstr = cstr + 'email-value';
  $(qstr).val(settings.account.email);
}

function collectAccountSettings() {
  var accountSettings = {};
  var cstr = '#accountsettings-';
  var qstr = void 0;

  settings.account = accountSettings;
  storeSettings();
}

function insertChannelData() {
  for (var i = 1; i <= App.CHANNELS; i++) {
    var channel = settings.channel[i - 1];
    var cstr = '#channel-output' + i + '-';
    var qstr = void 0;

    qstr = cstr + 'row';
    assignVisibleState(qstr, channel.active);

    qstr = cstr + 'label';
    $(qstr).text(channel.outputLabel);

    cstr = '#channel-input' + i + '-';

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
  if (state === 0) {
    $(querystring).addClass('hidden');
  } else {
    $(querystring).removeClass('hidden');
  }
}

function assignSwitchState(queryString, state) {
  if (state === 0) {
    state = false;
  }
  if (state === 1) {
    state = true;
  }
  $(queryString).bootstrapSwitch('state', state);
}

function collectSwitchState(queryString) {
  var state = $(queryString).is(':checked');
  //change statevalue because mysql cant handle bools
  if (state === false) {
    state = 0;
  }
  if (state === true) {
    state = 1;
  }
  return state;
}
});

;require.register("___globals___", function(exports, require, module) {
  
});})();require('___globals___');


//# sourceMappingURL=app.js.map