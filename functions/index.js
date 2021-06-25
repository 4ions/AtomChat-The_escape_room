#!/usr/bin/node
const cors = require('cors');
const dialogFlow = require('./sendToDialogFlow');
const express = require('express');
const app = express();
const firestoreData = require('./uploadToFirebase');
const functions = require('firebase-functions');
const imageIdentifiquer = require('./machineLearning');

const projectIdMl = 'atomescaperoom-e4a39';
const locationMl = 'global';

app.use(cors({ origin: true }));

app.get('/', (req, res) => {
  res.send('Received GET request!');
});

app.post('/', async (req, res) => {
  await firestoreData.uploadDataWhatsapp(req.body, req.body.conversationId);
  if (req.body.message.type !== 'text') {
    await imageIdentifiquer.labTrans(projectIdMl, locationMl, req.body.message.mediaUrl, req.body.conversationId);
  } else {
    await dialogFlow.talkWithDialogFlow('atom-escaperoom', req.body.message.text, req.body.conversationId);
  }
  // res.status(200).send other form that sent data
  res.send('Sent');
});

// Expose Express API as a single Cloud Function:
exports.widgets = functions.https.onRequest(app);
