#!/usr/bin/env python

# Copyright 2020 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
"""
DialogFlow API Detect Intent Python sample with text inputs.
"""
import os
import argparse
import uuid
import json
# import googletrans
# from googletrans import Translator
from google.cloud.dialogflowcx_v3beta1.services.agents import AgentsClient
from google.cloud.dialogflowcx_v3beta1.services.sessions import SessionsClient
from google.cloud.dialogflowcx_v3beta1.types import session

import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore

from datetime import datetime

from fire_atom import set_data

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "credentials/democx-303803-5afc6220427f.json"


class DialogFlowAgent():

    def __init__(self):
        # f"projects/{self.project_id}/locations/{self.location_id}/agents/{self.agent_id}"
        google_cloud_agent_path = "projects/democx-303803/locations/us-central1/agents/b792bf8b-1153-47e2-8772-2f0a2930cecb"
        # For more information on sessions see https://cloud.google.com/dialogflow/cx/docs/concept/session
        self.create_session(google_cloud_agent_path)

    def create_session(self, agent):
        """Returns the result of detect intent with texts as inputs.
        Using the same `session_id` between requests allows continuation
        of the conversation."""
        session_id = uuid.uuid4()
        self.session_path = f"{agent}/sessions/{session_id}"
        print(f"Session path: {self.session_path}\n")
        client_options = None
        agent_components = AgentsClient.parse_agent_path(agent)
        location_id = agent_components["location"]
        if location_id != "global":
            api_endpoint = f"{location_id}-dialogflow.googleapis.com:443"
            print(f"API Endpoint: {api_endpoint}\n")
            client_options = {"api_endpoint": api_endpoint}
        self.session_client = SessionsClient(client_options=client_options)

    def send_utterance(self, text, language_code="es"):
        """
        """
        text_input = session.TextInput(text=text)
        query_input = session.QueryInput(
            text=text_input, language_code=language_code)
        request = session.DetectIntentRequest(
            session=self.session_path, query_input=query_input)
        response = self.session_client.detect_intent(request=request)
        data = [
            txt for msg in response.query_result.response_messages for txt in msg.text.text]
        print('‣+57301788266: ', data[0])
        # print(response.query_result)
        return response.query_result

    def nested_dict(self, info):
        data_inside = {}
        user_id = "3017878266"
        now = datetime.now()
        current_time = now.strftime('%Y-%m-%d-%H:%M:%S')
        data_inside[current_time] = {'input_user': info.text,
                                     'current_page': info.current_page.display_name,
                                     'intent': info.intent.display_name,
                                     'response_df': [
                                         txt for msg in info.response_messages for txt in msg.text.text][0]}
        return data_inside

    def post_info_fire(self, database):

        # Use the application default credentials
        cred = credentials.ApplicationDefault()
        firebase_admin.initialize_app(cred, {
        'projectId': "atomescaperoom",
        })

        db = firestore.client()
        doc_ref = db.collection(u'users').document(u'alovelace')
        doc_ref.set({
            u'first': u'Ada',
            u'last': u'Lovelace',
            u'born': 1815
        })

if __name__ == "__main__":
    ag = DialogFlowAgent()
    text = "estas ahi?"
    start = ag.send_utterance(text)
    while text != "chao":
        text = input()
        full_response = ag.send_utterance(text)
        information = ag.nested_dict(full_response)
        # ag.post_info_fire(information)
        algo = set_data(information)
        # now = datetime.now()
    # translator = Translator()
    # ans = transla  # !/usr/bin/env python
