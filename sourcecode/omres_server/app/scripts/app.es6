import * as ButtonHandling from 'scripts/buttonhandling';
import * as AccountHandling from 'scripts/accounthandling';
import * as DataHandling from 'scripts/datahandling';
let socket = io();

export function getSocket() {
  return socket;
}
export let CHANNELS = 6;

//initialisation
$('.bs-switch').bootstrapSwitch();
$('#start-pane').toggleClass('hidden');
// $('#channel-pane').toggleClass('hidden');
$(window).trigger('App:loaded');
