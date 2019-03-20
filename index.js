// This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
// Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
// session persistence, api calls, and more.

const Alexa = require('ask-sdk-core');
const request = require('request');
const TV={
    ip:"",   // public ip of tv
    port:,                    // public port of tv
    psk:"",               // pre-shared key from wifi (config in TV setting)
};


const BraviaRemoteControl = require('sony-bravia-tv-remote');
const remote = new BraviaRemoteControl(TV.ip, TV.port, TV.psk);

const tvApi={
    PowerOn:{
        service:'system',
        method:'setPowerStatus',
        params:{status: true}
    },
    PowerOff:{
        service:'system',
        method:'setPowerStatus',
        params:{status: false}
    },
    Mute:{
        service:'audio',
        method:'setAudioMute',
        params:{status: true}
    },
    Unmute:{
        service:'audio',
        method:'setAudioMute',
        params:{status: false}
    },
    Volume:{
        service:'audio',
        method:'setAudioVolume',
        params: {target:'speaker', volume: '5'}
    },
    FPTPlay:{
        service:'appControl', 
        method:'setActiveApp',
        params:{uri: 'com.sony.dtv.net.fptplay.ottbox.net.fptplay.ottbox.ui.activity.WelcomeActivity', data:''}
    },
    Youtube:{
        service:'appControl', 
        method:'setActiveApp',
        params:{uri: 'com.sony.dtv.com.google.android.youtube.tv.com.google.android.apps.youtube.tv.activity.ShellActivity', data:''}
    },
    Spotify:{
        service:'appControl', 
        method:'setActiveApp',
        params:{uri: 'com.sony.dtv.com.spotify.tv.android.com.spotify.tv.android.SpotifyTVActivity', data:''}
    },
    Netflix:{
        service:'appControl', 
        method:'setActiveApp',
        params:{uri: 'com.sony.dtv.com.netflix.ninja.com.netflix.ninja.MainActivity', data:''}
    },
    YoutubeKids:{
        service:'appControl', 
        method:'setActiveApp',
        params:{uri: 'com.sony.dtv.com.google.android.youtube.tvkids.com.google.android.apps.youtube.tvkids.activity.MainActivity', data:''}
    }
}
// Call API from https://pro-bravia.sony.net/develop/integrate/rest-api/spec/
// action(service, method, params)
function callAPI(action) {
  var ip = TV.ip;
  var psk = TV.psk;
  var headers = {
    'X-Auth-PSK': psk
  };
  var options = {
    url:  'http://' + ip + '/sony/' + action.service,
    method: 'POST',
    headers: headers,
    body: JSON.stringify({
        method: action.method,
        version: '1.0',
        id: 1,
        params: action.params ? [action.params] : [],
      })
  };
  function callback(error, response, body) {
      if (!error && response.statusCode === 200) {
          console.log(body);
      }
  }
  request(options, callback);
}


const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speechText = 'Now controlling your TV...';
        callAPI(tvApi['PowerOn']);
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};
const ActionIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'ActionIntent'
            && handlerInput.requestEnvelope.request.intent.slots.action
            && handlerInput.requestEnvelope.request.intent.slots.action.resolutions
            && handlerInput.requestEnvelope.request.intent.slots.action.resolutions.resolutionsPerAuthority[0];
    },
    handle(handlerInput) {
        let speechText= "";
        let currentSlot  = handlerInput.requestEnvelope.request.intent.slots;
        let currentValue = currentSlot.action.resolutions.resolutionsPerAuthority[0].values[0].value;
        let code = currentValue.id;
        // Nếu không có trong các API cung cấp sẵn thì dùng lib của 'sony-bravia-tv-remote'
        if (tvApi[code] === undefined)
            remote.sendAction(code);
        else{
            callAPI(tvApi[code]);
            
        }
        if (code==='PowerOff'){
            speechText = "Bye bye!";
            return handlerInput.responseBuilder
            .speak(speechText)
            .getResponse();
        }
        else{
            speechText = currentValue.name;
            return handlerInput.responseBuilder
                .speak(speechText)
                .reprompt('Are you still there?')
                .getResponse();
        }
    }
};

// Xử lý riêng phần Volume to & volume by
const VolumeIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'VolumeIntent';
    },
    handle(handlerInput) {
        let currentSlot  = handlerInput.requestEnvelope.request.intent.slots;
        
        let speechText= "Volume";
        let volOption=tvApi['Volume'];
        
        let volValue ='5'; // default là '5'
        let volDirection=''; // default là target vol;
        
        
        // Nếu không phải 'to' & có up/down là tăng giảm
        if (currentSlot.adv.value!=='to' && currentSlot.direction.value){
            volDirection = currentSlot.direction.resolutions.resolutionsPerAuthority[0].values[0].value.id;
            speechText += ' ' + currentSlot.direction.resolutions.resolutionsPerAuthority[0].values[0].value.name + ' by ';
        }
        else{
            speechText += ' to ';
        }
        
        // Nếu có đọc <number> thì set number
        if (currentSlot.number.value){
            volValue =currentSlot.number.value;
        }
        speechText += volValue;
        volOption.params.volume=volDirection+volValue;
        
        callAPI(volOption);
        
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt('Are you still there?')
            .getResponse();
    }
};
const NavigatorIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'NavigatorIntent'
            && handlerInput.requestEnvelope.request.intent.slots.directionA
            && handlerInput.requestEnvelope.request.intent.slots.directionA.resolutions
            && handlerInput.requestEnvelope.request.intent.slots.directionA.resolutions.resolutionsPerAuthority[0];
    },
    handle(handlerInput) {
        let currentSlot = handlerInput.requestEnvelope.request.intent.slots;
        let code        =   currentSlot.directionA.resolutions.resolutionsPerAuthority[0].values[0].value.id;
        let speechText  =   currentSlot.directionA.resolutions.resolutionsPerAuthority[0].values[0].value.name;
        if (currentSlot.times.value){
            let times = 1;
            try {
                times = parseInt(currentSlot.times.value);
                if (times>10) times=10;
            }
            catch(e){
                times = 1;
            }
            for (let i=1;i<times;i++){
                code        += " "  + currentSlot.directionA.resolutions.resolutionsPerAuthority[0].values[0].value.id;
            }
            speechText  += " " + times + " times";
        }
        else{
            const slots = ["directionB","directionC","directionD","directionE"];
            for (let i=0;i<slots.length;i++){
                if (currentSlot[slots[i]].value){
                    code        += " "  + currentSlot[slots[i]].resolutions.resolutionsPerAuthority[0].values[0].value.id;
                    speechText  += " "  + currentSlot[slots[i]].resolutions.resolutionsPerAuthority[0].values[0].value.name;
                }
                else{
                    break;
                } 
            }
        }
        remote.sendActionSequence(code);
        
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt('Are you still there?')
            .getResponse();
    }
};
const HelpIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speechText = 'You can say: Power on, off, Volume on, off, Enter, Return, Home, Youtube';

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};
const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
                || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speechText = 'Bye bye!';
        return handlerInput.responseBuilder
            .speak(speechText)
            .getResponse();
    }
};
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse();
    }
};

// The intent reflector is used for interaction model testing and debugging.
// It will simply repeat the intent the user said. You can create custom handlers
// for your intents by defining them above, then also adding them to the request
// handler chain below.
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = handlerInput.requestEnvelope.request.intent.name;
        const speechText = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speechText)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};

// Generic error handling to capture any syntax or routing errors. If you receive an error
// stating the request handler chain is not found, you have not implemented a handler for
// the intent being invoked or included it in the skill builder below.
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`~~~~ Error handled: ${error.message}`);
        const speechText = `Sorry, please repeat`;

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};

// This handler acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        VolumeIntentHandler,
        NavigatorIntentHandler,
        ActionIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler) // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
    .addErrorHandlers(
        ErrorHandler)
    .lambda();
