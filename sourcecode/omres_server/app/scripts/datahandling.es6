import * as App from 'scripts/app';
$(window).on('App:loaded', function() {
  let socket = App.getSocket();
  socket.on('updateOutputMode', function(data) {
    console.log(data);
    updateOutputMode(data.channel, data.mode);
  });

  $('.channel-output-btn').on('click', function() {
    let query = $(this);
    let mode = query.data('mode');
    let channel = query.data('channel-id');
    console.log(mode);

    switch(mode) {
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
    socket.emit('storeOutputMode', {channel, mode});
  });

  socket.on('storeOutputMode', function(res) {
    console.log(res);
  });

  socket.on('updateAnalogValues', function(data) {
    //insertAnalogValues
    for(let i = 1; i <= data.length; i++) {
      let qstr = `#channel-input${i}-value`;
      $(qstr).text(data[i - 1]);
    }
  });
});

function updateOutputMode(channel, mode) {
  let query = $(`#channel-output${channel}-button`);
  query.removeClass('btn-default btn-primary btn-success btn-warning');
  switch(mode) {
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
