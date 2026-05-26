# nisaraistudio
https://docs.cloud.google.com/resource-manager/docs/creating-managing-projects
translations {
‎  translated_text: "La vie est courte."
‎  model: "projects/261347268520/locations/us-central1/models/general/translation-llm"
‎}
‎translations {
‎  translated_text: "L&#39;art est long."
‎  model: "projects/261347268520/locations/us-central1/models/general/translation-llm"
‎}
‎
‎translations {
‎  translated_text: "La vie est courte."
‎  model: "projects/261347268520/locations/us-central1/models/general/translation-llm"
‎}
‎translations {
‎  translated_text: "L&#39;art est long."
‎  model: "projects/261347268520/locations/us-central1/models/general/translation-llm"from google.cloud import translate_v3
‎
‎def translate():
‎
‎  response = translate_v3.TranslationServiceClient().translate_text(
‎      contents=["Life is short.",
‎                  "Art is long."],
‎      target_language_code='fr',
‎      source_language_code='en',
‎      parent=f"projects/PROJECT_ID/locations/REGION_NAME",
‎      model=f"projects/PROJECT_ID/locations/REGION_NAME/models/general/translation-llm"
‎  )
‎
‎  print(response)
‎
‎  return response
‎
‎translate(from google.cloud import translate_v3
‎
‎def translate():
‎
‎  response = translate_v3.TranslationServiceClient().translate_text(
‎      contents=["Life is short.",
‎                  "Art is long."],
‎      target_language_code='fr',
‎      source_language_code='en',
‎      parent=f"projects/PROJECT_ID/locations/REGION_NAME",
‎      model=f"projects/PROJECT_ID/locations/REGION_NAME/models/general/translation-llm"
‎  )
‎
‎  print(response)
‎
‎  return response
‎
‎translate({
‎  "translations": [
‎    {
‎      "translatedText": "Este es el texto que me gustaría traducir.",
‎      "model": "projects/PROJECT_ID/locations/REGION_NAME/models/general/translation-llm"
‎    },
‎    {
‎      "translatedText": "Puede incluir hasta 1024 cadenas.",
‎      "model": "projects/PROJECT_ID/locations/REGION_NAME/models/general/translation-llm"
‎    }
‎  ]
‎}))curl -X POST \
‎     -H "Authorization: Bearer $(gcloud auth print-access-token)" \
‎     -H "x-goog-user-project: PROJECT_ID" \
‎     -H "Content-Type: application/json; charset=utf-8" \
‎     -d @request.json \
‎     "https://translation.googleapis.com/v3/projects/PROJECT_ID:translateText"{
‎  "contents": ["This is text that I would like to have translated.",
‎               "It can include up to 1024 strings."],
‎  "mimeType": "text/plain",
‎  "sourceLanguageCode": "en"
‎  "targetLanguageCode": "it",
‎  "model": "projects/PROJECT_ID/locations/REGION_NAME/models/general/translation-llm"
‎}https://docs.cloud.google.com/resource-manager/docs/creating-managing-projectshttps://github.com/rananisarsb51214-web