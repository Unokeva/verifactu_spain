frappe.ui.form.on('Purchase Invoice', {
    refresh: function(frm) {
        // Añadimos el botón en la barra superior
        frm.add_custom_button(__('Carga Inteligente (Elena AI)'), function() {
            let d = new frappe.ui.Dialog({
                title: 'Elena AI: Lectura de Factura',
                fields: [
                    {
                        fieldtype: 'Attach',
                        fieldname: 'attach_invoice',
                        label: 'Sube el PDF o Imagen de la factura',
                    }
                ],
                primary_action_label: 'Analizar con Gemini',
                primary_action(values) {
                    if (!values.attach_invoice) {
                        frappe.msgprint('Por favor, adjunta un archivo.');
                        return;
                    }
                    
                    d.set_primary_action_label('Elena está trabajando...');
                    
                    frappe.call({
                        method: "elena_spain.elena_spain.ai_logic.process_invoice_with_gemini",
                        args: {
                            file_url: values.attach_invoice
                        },
                        callback: function(r) {
                            if (r.message) {
                                d.hide();
                                show_elena_validation_dialog(frm, r.message);
                            }
                        }
                    });
                }
            });
            d.show();
        }, __("Actions"));
    }
});

function show_elena_validation_dialog(frm, data) {
    let v_dialog = new frappe.ui.Dialog({
        title: 'Validación Elena AI',
        size: 'extra-large', // Aprovechamos todo el ancho de pantalla
        fields: [
            // --- COLUMNA IZQUIERDA: EL PDF ---
            {
                fieldtype: 'HTML',
                fieldname: 'preview_html',
                options: `
                    <div style="background: #f4f5f6; padding: 10px; border-radius: 8px; border: 1px solid #d1d8dd;">
                        <iframe src="${data.file_url}" width="100%" height="700px" style="border:none; border-radius: 4px;"></iframe>
                    </div>
                `
            },
            
            // --- SALTO A COLUMNA DERECHA ---
            { fieldtype: 'Column Break' },
            
            {
                fieldtype: 'Section Break',
                label: 'Datos de Cabecera'
            },
            {
                fieldtype: 'Link',
                fieldname: 'supplier',
                label: 'Proveedor (Identificado por NIF)',
                options: 'Supplier',
                default: data.supplier,
                reqd: 1
            },
            {
                fieldtype: 'Data',
                fieldname: 'bill_no',
                label: 'Nº Factura',
                default: data.invoice_number
            },
            {
                fieldtype: 'Date',
                fieldname: 'bill_date',
                label: 'Fecha Factura',
                default: data.date
            },
            
            {
                fieldtype: 'Section Break',
                label: 'Líneas de la Factura'
            },
            {
                fieldtype: 'Table',
                fieldname: 'items_preview',
                label: 'Artículos',
                fields: [
                    { fieldtype: 'Data', fieldname: 'description', label: 'Concepto', in_list_view: 1, columns: 6 },
                    { fieldtype: 'Float', fieldname: 'qty', label: 'Cant.', in_list_view: 1, columns: 2 },
                    { fieldtype: 'Currency', fieldname: 'rate', label: 'Precio', in_list_view: 1, columns: 4 }
                ],
                data: data.items
            }
        ],
        primary_action_label: 'Confirmar y Volcar a Factura',
        primary_action(values) {
            // Pasamos los datos del diálogo al formulario real de ERPNext
            frm.set_value('supplier', values.supplier);
            frm.set_value('bill_no', values.bill_no);
            frm.set_value('bill_date', values.bill_date);
            
            // Limpiamos la tabla de items actual y cargamos la nueva
            frm.clear_table('items');
            values.items_preview.forEach(item => {
                let row = frm.add_child('items');
                row.item_name = item.description;
                row.qty = item.qty;
                row.rate = item.rate;
                // Si tienes un almacén por defecto o cuenta, podrías setearla aquí
            });
            
            frm.refresh_field('items');
            v_dialog.hide();
            frappe.show_alert({message: __('Datos importados con éxito'), indicator: 'green'});
        }
    });

    v_dialog.show();
}