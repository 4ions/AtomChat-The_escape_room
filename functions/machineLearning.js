#!/usr/bin/node

const dialogFlow = require('./sendToDialogFlow');
const sharpObjets = require('./service_account/sharpObjets.json');
const lightingObjets = require('./service_account/lightingObjets');
const arrayJson = [lightingObjets, sharpObjets];
const vision = require('@google-cloud/vision');
const { TranslationServiceClient } = require('@google-cloud/translate');
const projectIdMl = 'atomescaperoom-e4a39';
const locationMl = 'global';
/**
 * @description Detects that it is the image sent
 * @param {*} imageUri Imagen sent
 * @param {*} userId user Id
 */
async function detectLabels (imageUri, userId) {
  try {
    // [START vision_label_detection]
    // Imports the Google Cloud client library
    // Creates a client
    const client = new vision.ImageAnnotatorClient();
    const [result] = await client.objectLocalization(imageUri);
    const objects = result.localizedObjectAnnotations;
    const objectsArray = objects.map((object) => object.name);
    const [response] = await client.labelDetection(imageUri);
    const labels = response.labelAnnotations;
    const labelsArray = labels.map((label) => label.description);
    let objectsLabelsArray = [];
    if ((objectsArray !== []) && (labelsArray !== [])) {
      objectsLabelsArray = objectsArray.concat(labelsArray);
    } else if ((objectsArray !== []) && (labelsArray === [])) {
      objectsLabelsArray = objectsArray;
    } else if ((objectsArray === []) && (labelsArray !== [])) {
      objectsLabelsArray = labelsArray;
    }
    let objectsLabelsJoined = '';
    if (objectsLabelsArray !== []) {
      objectsLabelsJoined = labelsArray.join(',');
    }
    console.log('Objects and Labels:', objectsLabelsJoined);
    await translateText(projectIdMl, locationMl, objectsLabelsJoined, userId);
  } catch (error) {
    console.log(error);
  }
}

/**
 * @description Receives the text array of the detected image and translates it.
 * @param {*} projectId Id of the project
 * @param {*} location Location of the project
 * @param {*} textToTranslate Text find in image and translated
 * @param {*} userId Id of the user
 */
async function translateText (projectId, location, textToTranslate, userId) {
  try {
    // Imports the Google Cloud Translation library
    // Instantiates a client
    const translationClient = new TranslationServiceClient();
    // Construct request
    const request = {
      parent: `projects/${projectId}/locations/${location}`,
      contents: [textToTranslate],
      mimeType: 'text/plain', // mime types: text/plain, text/html
      sourceLanguageCode: 'en-US',
      targetLanguageCode: 'es'
    };
    // Run request
    const [response] = await translationClient.translateText(request);
    const translates = response.translations;
    let Phrases = translates[0].translatedText;
    Phrases = Phrases.toLowerCase();
    const arreglo = Phrases.split(', ');
    let FindData = null;
    let i = 0;
    while (FindData === null && i < arrayJson.length) {
      for (let j = 0; j < arrayJson[i].entries.length; j++) {
        for (let k = 0; k < arreglo.length; k++) {
          if (arrayJson[i].entries[j].value === arreglo[k]) {
            FindData = arrayJson[i].entries[j].value;
            break;
          }
        }
        if (FindData !== null) {
          break;
        }
      }
      i = i + 1;
    }
    if (FindData !== null) {
      await dialogFlow.talkWithDialogFlow('atom-escaperoom', FindData, userId);
    } else {
      await dialogFlow.talkWithDialogFlow('atom-escaperoom', arreglo[0], userId);
    }
  } catch (error) {
    console.log(error);
  }
}

/**
 * @description Start functions of ML
 * @param {*} projectId Id of the project
 * @param {*} location Location of the project
 * @param {*} textToTranslate Text find in image and translated
 * @param {*} userId Id of the user
 */
async function labTrans (projectId, location, image, userId) {
  await detectLabels(image, userId);
}

module.exports(labTrans);
