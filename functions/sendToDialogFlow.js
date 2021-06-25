#!/usr/bin/node

const dialogflow = require('@google-cloud/dialogflow');
const firestoreData = require('./uploadToFirebase');
const serviceAccount = require('./service_account/atom-keys.json');
const postAtom = require('./postToAtom');
const admin = require('firebase-admin');
const db = admin.firestore();
const uuid = require('uuid');

const candado = {
  text: 'CANDADO',
  url: 'https://firebasestorage.googleapis.com/v0/b/atomescaperoom-e4a39.appspot.com/o/9a9b1d75-d17f-4fae-a013-6c58dca83ab6.jfif?alt=media&token=4b4da221-22e4-489f-af88-8a53097f7fe8'
};
const audio = {
  text: 'AUDIO',
  url: 'https://firebasestorage.googleapis.com/v0/b/atomescaperoom-e4a39.appspot.com/o/WhatsApp%20Audio%202021-06-17%20at%2010.50.19%20AM.ogg?alt=media&token=26836173-ef19-42bf-b54b-e7e162152058'
};
const mapa = {
  text: 'MAPA',
  url: 'https://firebasestorage.googleapis.com/v0/b/atomescaperoom-e4a39.appspot.com/o/b565d593-3ab5-4f9f-a747-75c57700225b.jfif?alt=media&token=b90e5129-09af-4317-acef-695dae96298c'
};
const afiche = {
  text: 'AFICHE',
  url: 'https://firebasestorage.googleapis.com/v0/b/atomescaperoom-e4a39.appspot.com/o/ec1ee1fb-ca6e-4c9a-b9c3-a6e4cc35c811.jfif?alt=media&token=3e262cde-8bd1-4153-a532-842c6003cbcb'
};

const sendImage = [candado, audio, mapa, afiche];

/**
 *
 * @param {*} projectId DialogFlow project id
 * @param {*} textIn Text to be sent to DialogFlow
 * @param {*} userId UserId to the user
 * @todo Get the response text from DialogFlow
 * @throws {Datbase} Database dont exists
 */

async function talkWithDialogFlow (projectId = 'your-project-id', textIn, userId) {
  let contextData = null;
  try {
    const database = db.collection('UserOutput').doc(userId);
    const doc = await database.get();
    if (!doc.exists) {
      console.log('Database dont exists');
    } else {
      contextData = doc.data().data;
    }
  } catch (err) {
    console.log(err);
  }

  // A unique identifier for the given session
  const sessionId = uuid.v4();

  // Create a new session
  const sessionClient = new dialogflow.SessionsClient({ credentials: serviceAccount });
  const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);
  // The text query request.
  const request = {
    session: sessionPath,
    queryParams: {
      contexts: contextData // contextJson, aqui se pega lo extraido
    },
    queryInput: {
      text: {
        // The query to send to the dialogflow agent
        text: textIn,
        // The language used by the client (es)
        languageCode: 'es'
      }
    }

  };

  let splitString = [];

  const responses = await sessionClient.detectIntent(request);
  let info = null;
  let Send = 0;
  const result = responses[0].queryResult;
  const textDataIn = result.fulfillmentText;
  const findDelimiter = textDataIn.search('%');
  // Separate the text if it has a delimiter and check if any
  // of those texts have special characters to send images or audio.
  if (findDelimiter !== -1) {
    splitString = (result.fulfillmentText).split('%');
    for (let i = 0; i <= splitString.length; i++) {
      for (let j = 0; j < sendImage.length; j++) {
        info = checkDataIn(sendImage[j].text, splitString[i]);
        if (info === true) {
          if (splitString[i].search(sendImage[j].text) !== -1) {
            if (splitString[i].search('AUDIO')) {
              await sleep(1000);
              await postAtom.postResponse(null, userId, sendImage[j].url, sendImage[j].text);
              Send = Send + 1;
              break;
            } else {
              await sleep(1000);
              await postAtom.postResponse(null, userId, sendImage[j].url);
              Send = Send + 1;
              break;
            }
          }
        }
      }
      if (Send === 0) {
        await sleep(1000);
        await firestoreData.uploadDataDialogFlow({ data: result.outputContexts }, userId);
        await postAtom.postResponse(splitString[i], userId);
      }
    }
  } else {
    await firestoreData.uploadDataDialogFlow({ data: result.outputContexts }, userId);
    await postAtom.postResponse(result.fulfillmentText, userId);
  }
}

function sleep (ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function checkDataIn (string, stringToCheck) {
  const data = stringToCheck.search(string);
  if (data !== -1) {
    return true;
  } else {
    return false;
  }
}

module.exports = { talkWithDialogFlow };
