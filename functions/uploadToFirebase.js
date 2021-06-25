#!/usr/bin/node
const admin = require('firebase-admin');
const dateFormat = require('dateformat');
admin.initializeApp(); // with adminConfig
const db = admin.firestore();
/**
 *
 * @param {*} jsonInfo Information to upload to Firebase
 */
async function uploadDataWhatsapp (jsonInfo) {
  console.log('Subire la data de whatsapp');
  const userId = jsonInfo.conversationId;
  const ref = db.collection('dataIn').doc(userId);
  const Time = dateFormat(new Date(), 'yyyy-mm-dd h:MM:ss');
  const data = {
    time: Time,
    info: jsonInfo
  };
  await ref.set(data);
}
/**
 *
 * @param {*} jsonInfo Information to upload to Firebase
 * @param {*} userId Id of the user sending the request
 */
async function uploadDataDialogFlow (jsonInfo, userId) {
  console.log('Subire la data de dialog');
  const time = dateFormat(new Date(), 'yyyy-mm-dd h:MM:ss').toString();
  console.log(time);
  const ref = db.collection('UserOutput').doc(userId);
  const other = await ref.set(jsonInfo);
  console.log('Added base', other);
}

module.exports = { uploadDataDialogFlow, uploadDataWhatsapp };
