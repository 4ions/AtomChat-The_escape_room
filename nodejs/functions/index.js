const serviceAccount = require("./service_account/atom-keys.json");
const lightingObjets = require("./service_account/lightingObjets");
const sharpObjets = require("./service_account/sharpObjets.json");
const arrayJson = [lightingObjets, sharpObjets];
const dialogflow = require("@google-cloud/dialogflow");
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const dateFormat = require("dateformat");
const express = require("express");
const axios = require("axios");
const uuid = require("uuid");
const cors = require("cors");

const app = express();


admin.initializeApp(); // with adminConfig
const db = admin.firestore();
const projectIdMl = "atomescaperoom-e4a39";
const locationMl = "global";
const candado = {
  text: "CANDADO",
  url: "https://firebasestorage.googleapis.com/v0/b/atomescaperoom-e4a39.appspot.com/o/9a9b1d75-d17f-4fae-a013-6c58dca83ab6.jfif?alt=media&token=4b4da221-22e4-489f-af88-8a53097f7fe8",
};
const audio = {
  text: "AUDIO",
  url: "https://firebasestorage.googleapis.com/v0/b/atomescaperoom-e4a39.appspot.com/o/WhatsApp%20Audio%202021-06-17%20at%2010.50.19%20AM.ogg?alt=media&token=26836173-ef19-42bf-b54b-e7e162152058",
};
const mapa = {
  text: "MAPA",
  url: "https://firebasestorage.googleapis.com/v0/b/atomescaperoom-e4a39.appspot.com/o/b565d593-3ab5-4f9f-a747-75c57700225b.jfif?alt=media&token=b90e5129-09af-4317-acef-695dae96298c",
};
const afiche = {
  text: "AFICHE",
  url: "https://firebasestorage.googleapis.com/v0/b/atomescaperoom-e4a39.appspot.com/o/ec1ee1fb-ca6e-4c9a-b9c3-a6e4cc35c811.jfif?alt=media&token=3e262cde-8bd1-4153-a532-842c6003cbcb",
};
const sendImage = [candado, audio, mapa, afiche];
// let typeImage = "";
// let typeText = "";
// const adminConfig = JSON.parse(process.env.FIREBASE_CONFIG);
// adminConfig.credentials = admin.credential.cert(serviceAccount);

// permisos al service account
// verificar si el service account esta habilitado en google cloud
//

// Automatically allow cross-origin requests
app.use(cors({origin: true}));

app.get("/", (req, res) => {
  res.send("Received GET request!");
});

app.post("/", async (req, res) => {
  await uploadDataWhatsapp(req.body, req.body.conversationId);
  if (req.body.message.type !== "text") {
    await labTrans(projectIdMl, locationMl, req.body.message.mediaUrl, req.body.conversationId);
  } else {
    await talkWithDialogFlow("atom-escaperoom", req.body.message.text, req.body.conversationId);
  }
  // res.status(200).send otra forma de enviar datos
  res.send("Enviado");
});

async function uploadDataWhatsapp(jsonInfo) {
  console.log("Subire la data de whatsapp");
  const userId = jsonInfo.conversationId;
  const ref = db.collection("dataIn").doc(userId);
  const Time = dateFormat(new Date(), "yyyy-mm-dd h:MM:ss");
  const data = {
    time: Time,
    info: jsonInfo,
  };
  await ref.set(data);
}

async function uploadDataDialogFlow(jsonInfo, userId) {
  console.log("Subire la data de dialog");
  const time = dateFormat(new Date(), "yyyy-mm-dd h:MM:ss").toString();
  console.log(time);
  const ref = db.collection("UserOutput").doc(userId);
  const other = await ref.set(jsonInfo);
  console.log("Added base", other);
}

async function talkWithDialogFlow(projectId = "your-project-id", textIn, userId) {
  console.log("Enviare a dialog");
  let contextData = null;
  try {
    const database = db.collection("UserOutput").doc(userId);
    const doc = await database.get();
    if (!doc.exists) {
      console.log("Database dont exists");
    } else {
      contextData = doc.data().data;
    }
  } catch (err) {
    console.log(err);
  }


  // A unique identifier for the given session
  const sessionId = uuid.v4();

  // Create a new session
  const sessionClient = new dialogflow.SessionsClient({credentials: serviceAccount});
  const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);
  // The text query request.
  const request = {
    session: sessionPath,
    queryParams: {
      contexts: contextData, // contextJson, aqui se pega lo extraido
    },
    queryInput: {
      text: {
        // The query to send to the dialogflow agent
        text: textIn,
        // The language used by the client (en-US)
        languageCode: "es",
      },
    },

  };

  let splitString = [];

  const responses = await sessionClient.detectIntent(request);
  let info = null;
  let enviado = 0;
  console.log("Empezare a dividir");
  const result = responses[0].queryResult;
  const textDataIn = result.fulfillmentText;
  const findDelimiter = textDataIn.search("%");
  if (findDelimiter !== -1) {
    splitString = (result.fulfillmentText).split("%");
    for (let i = 0; i <= splitString.length; i++) {
      for (let j = 0; j <sendImage.length; j++) {
        info = checkDataIn(sendImage[j].text, splitString[i]);
        console.log(sendImage[j].text + " Y el otro es " + splitString[i]);
        if (info === true) {
          console.log("split "+ splitString[i] + " send " + sendImage[j].text);
          if (splitString[i].search(sendImage[j].text) !== -1) {
            if (splitString[i].search("AUDIO")) {
              console.log("Enviando audio");
              await sleep(1000);
              await postResponse(null, userId, sendImage[j].url, sendImage[j].text);
              enviado = enviado + 1;
              break;
            } else {
              console.log("Duermiendo");
              await sleep(1000);
              await postResponse(null, userId, sendImage[j].url);
              enviado = enviado + 1;
              break;
            }
          }
        }
      }
      console.log("el numero de enviados es: "+ enviado);
      if (enviado === 0) {
        console.log("Duermiendo");
        await sleep(1000);
        await uploadDataDialogFlow({data: result.outputContexts}, userId);
        await postResponse(splitString[i], userId);
      }
    }
  } else {
    console.log("No tiene divisor");
    await uploadDataDialogFlow({data: result.outputContexts}, userId);
    await postResponse(result.fulfillmentText, userId);
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function postResponse(response=null, userId, url=null, audio=null) {
  console.log("respondiendo al whatsapp");
  const database = db.collection("dataIn").doc(userId);
  const doc = await database.get();
  if (!doc.exists) {
    console.log("Database dont exists");
  }
  let typeMessage = "text";
  if (audio !== null) {
    typeMessage = "file";
  } else if (url !== null) {
    typeMessage = "image";
  }
  console.log("El tipo del mensaje es" + typeMessage);
  const data = JSON.stringify({
    "conversationId": userId,
    "messages": [
      {
        "type": typeMessage,
        "text": response,
        "mediaUrl": url,
        "coordinates": {
          "lat": null,
          "long": null,
        },
      },
    ],
    "assign": null,
  });

  const config = {
    method: "post",
    url: "https://us-central1-atom-stage.cloudfunctions.net/bridge/ReceiveMessage",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer 072353d2-c007-11eb-8529-0242ac130003",
    },
    data: data,
  };

  await axios(config);
}

function checkDataIn(string, stringToCheck) {
  const data = stringToCheck.search(string);
  if (data !== -1) {
    return true;
  } else {
    return false;
  }
}


async function detectLabels(imageUri, userId) {
  try {
  // [START vision_label_detection]
  // Imports the Google Cloud client library
    const vision = require("@google-cloud/vision");
    // Creates a client
    const client = new vision.ImageAnnotatorClient();
    /**
   * TODO(developer): Uncomment the following line before running the sample.
   *
  /*
  const request = {
      image: {
        // source: {imageUri: 'gs://path/to/image.jpg'}
        // source: {filename: '/home/rq/Documents/wrqm/t_e_s_t_python/atom_chat/resources/image25.jpg'}
        source: {imageUri: imageUri}
      }
    };
    */
    // Performs label detection on the local file
    const [result] = await client.objectLocalization(imageUri);
    // console.log([result]);
    const objects = result.localizedObjectAnnotations;
    // console.log(objects);
    const objectsArray = objects.map((object) => object.name);
    // const objectsJoined = objectsArray.join(', ');
    // console.log('Objects:', objectsArray);
    /*
  const labels = result.labelAnnotations;
  console.log('Labels:');
  labels.forEach(label => console.log(label.description));
  */
    // [END vision_label_detection]
    // Performs label detection on the local file
    const [response] = await client.labelDetection(imageUri);
    // console.log([response]);
    const labels = response.labelAnnotations;
    // console.log(labels);
    const labelsArray = labels.map((label) => label.description);
    // const labelsJoined = labelsArray.join(', ');
    // console.log('Labels:', labelsArray);
    let objectsLabelsArray = [];
    if ((objectsArray != []) && (labelsArray != [])) {
      objectsLabelsArray = objectsArray.concat(labelsArray);
    } else if ((objectsArray != []) && (labelsArray == [])) {
      objectsLabelsArray = objectsArray;
    } else if ((objectsArray == []) && (labelsArray != [])) {
      objectsLabelsArray = labelsArray;
    }
    let objectsLabelsJoined = "";
    if (objectsLabelsArray != []) {
      objectsLabelsJoined = labelsArray.join(",");
    }
    console.log("Objects and Labels:", objectsLabelsJoined);
    await translateText(projectIdMl, locationMl, objectsLabelsJoined, userId);
  // return labelsJoined;
  /* */
  // return [response];
  // [END vision_label_detection]
  } catch (error) {
    console.log(error);
  }
}


async function translateText(projectId, location, textToTranslate, userId) {
  try {
  // Imports the Google Cloud Translation library
    const {TranslationServiceClient} = require("@google-cloud/translate");
    // Instantiates a client
    const translationClient = new TranslationServiceClient();
    // Construct request
    const request = {
      parent: `projects/${projectId}/locations/${location}`,
      contents: [textToTranslate],
      mimeType: "text/plain", // mime types: text/plain, text/html
      sourceLanguageCode: "en-US",
      targetLanguageCode: "es",
    };
    // Run request
    const [response] = await translationClient.translateText(request);
    const traducciones = response.translations;
    traducciones;
    let frase = traducciones[0].translatedText;
    frase = frase.toLowerCase();
    const arreglo = frase.split(", ");
    console.log(frase);
    let encontro = null;
    console.log("Verificare que la imagen exista");
    let i = 0;
    while (encontro === null && i < arrayJson.length) {
      for (let j = 0; j < arrayJson[i].entries.length; j++) {
        for (let k = 0; k < arreglo.length; k++) {
          if (arrayJson[i].entries[j].value === arreglo[k]) {
            encontro = arrayJson[i].entries[j].value;
            console.log("La data de array es: " + arrayJson[i].entries[j].value + ", Y el valor en info es :" + arreglo[k]);
            break;
          }
        }
        if (encontro !== null) {
          break;
        }
      }
      i = i + 1;
    }
    console.log("Se encontro " + encontro);
    if (encontro !== null) {
      await talkWithDialogFlow("atom-escaperoom", encontro, userId);
    } else {
      await talkWithDialogFlow("atom-escaperoom", arreglo[0], userId);
    }
  } catch (error) {
    console.log(error);
  }
}


async function labTrans(projectId, location, image, userId) {
  await detectLabels(image, userId);
}
// Expose Express API as a single Cloud Function:
exports.widgets = functions.https.onRequest(app);// request =  data
// exports.data = functions.firestore.document("data/test").onWrite(app); // se activa cuando hay un cambio en firestore!!!
