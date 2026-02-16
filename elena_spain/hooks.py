app_name = "elena_spain"
app_title = "Elena Localización España"
app_publisher = "Unokeva"
app_description = "Modulo Verifactu"
app_email = "javier.bogarra@gmail.com"
app_license = "gpl-3.0"

doc_events = {
    "Sales Invoice": {
        "on_submit": "elena_spain.verifactu.logic.calculate_hash"
    }
}
