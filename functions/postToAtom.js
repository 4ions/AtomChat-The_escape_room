#!/usr/bin/node

const axios = require('axios');
const admin = require('firebase-admin');
const db = admin.firestore();
/**
 * @description Send response to user
 * @param {*} response Text to be sent to User
 * @param {*} userId User Id to the current user
 * @param {*} url Used if an image is to be sent
 * @param {*} audio Used if an audio is to be sent
 */
async function postResponse (response = null, userId, url = null, audio = null) {
  const database = db.collection('dataIn').doc(userId);
  const doc = await database.get();
  if (!doc.exists) {
    console.log('Database dont exists');
  }
  let typeMessage = 'text';
  if (audio !== null) {
    typeMessage = 'file';
  } else if (url !== null) {
    typeMessage = 'image';
  }
  const data = JSON.stringify({
    conversationId: userId,
    messages: [
      {
        type: typeMessage,
        text: response,
        mediaUrl: url,
        coordinates: {
          lat: null,
          long: null
        }
      }
    ],
    assign: null
  });

  const config = {
    method: 'post',
    url: 'https://us-central1-atom-stage.cloudfunctions.net/bridge/ReceiveMessage',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer 072353d2-c007-11eb-8529-0242ac130003'
    },
    data: data
  };

  await axios(config);
}

module.exports = { postResponse };
