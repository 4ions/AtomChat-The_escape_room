import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore



def set_data(database):
    # Use the application default credentials
    cred = credentials.ApplicationDefault()
    firebase_admin.initialize_app(cred, {
    'projectId': "atomescaperoom",
    })
    user_id = "3017878266"
    db = firestore.client()
    doc_ref = db.collection(u'users').document(user_id)
    doc_ref.set({'2021-06-03-13:56:34': {'input_user': 'atrapado?', 'current_page': 'context', 'intent': 'why_or_how', 'response_df': 'No lo sé! No se donde estoy, desperté aquí. Esta muy oscuro y no puedo ver nada..'}})
